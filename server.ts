import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { AgentId, AgentStatus, ActivityLog, TokenMetrics, ServerToClientMessage } from './src/types.js';

// Setup environment and Express
const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini Client
let aiClient: any = null;
function getGeminiClient(): any {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== 'MY_GEMINI_API_KEY' && key.trim() !== '') {
      try {
        aiClient = new GoogleGenAI({
          apiKey: key,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });
        console.log('Gemini API Client initialized successfully.');
      } catch (e) {
        console.error('Error initializing Gemini Client:', e);
      }
    }
  }
  return aiClient;
}

// ---------------------------------------------------------
// REQUISITE RESUME ENGINEERING CHALLENGE 1: Mock Redis Pub/Sub Decoupled State Router
// ---------------------------------------------------------
class MockRedisPubSub {
  private channels: { [channel: string]: ((msg: string) => void)[] } = {};

  subscribe(channel: string, callback: (msg: string) => void) {
    if (!this.channels[channel]) {
      this.channels[channel] = [];
    }
    this.channels[channel].push(callback);
    return () => {
      this.channels[channel] = this.channels[channel].filter(cb => cb !== callback);
    };
  }

  publish(channel: string, message: string) {
    const subscribers = this.channels[channel] || [];
    subscribers.forEach((cb) => {
      try {
        cb(message);
      } catch (err) {
        console.error('PubSub delivery failure:', err);
      }
    });
  }
}

const pubSub = new MockRedisPubSub();

// ---------------------------------------------------------
// REQUISITE RESUME ENGINEERING CHALLENGE 2: Context Window Pruning Engine
// ---------------------------------------------------------
interface MessageFrame {
  sender: string;
  role: 'system' | 'user' | 'model';
  content: string;
  estimatedTokens: number;
}

/**
 * Loops through conversation history and simulates a text-summarization/truncation
 * algorithm when token count thresholds are breached. Keeping critical system guidelines
 * but pruning the oldest conversational history entries first.
 * 
 * Why this is crucial:
 * 1. Prevents infinite context loops when agents keep feeding previous large outputs.
 * 2. Minimizes API usage cost & query overhead in server-side context windows.
 * 3. Keeps input sizes within maximum token bounds, preventing model overflows.
 */
function pruneContextWindow(
  history: MessageFrame[],
  maxTokens: number
): { prunedHistory: MessageFrame[]; savedTokens: number; wasPruned: boolean } {
  let totalCurrentTokens = history.reduce((sum, msg) => sum + msg.estimatedTokens, 0);
  let savedTokens = 0;
  let wasPruned = false;
  const prunedHistory = [...history];

  // We always want to retain system directives or initial goals (usually history[0])
  // So we prune items starting from index 1 (the oldest conversation memories).
  while (totalCurrentTokens > maxTokens && prunedHistory.length > 2) {
    // Extract oldest discussion
    const prunedMsg = prunedHistory.splice(1, 1)[0];
    totalCurrentTokens -= prunedMsg.estimatedTokens;
    savedTokens += prunedMsg.estimatedTokens;
    wasPruned = true;
  }

  return { prunedHistory, savedTokens, wasPruned };
}

// Global active WebSocket collection
const wsClients = new Set<WebSocket>();

// Subscribe WebSocket broadcaster to the PubSub channel
pubSub.subscribe('agent:updates', (msgStr: string) => {
  wsClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msgStr);
    }
  });
});

function broadcast(type: ServerToClientMessage['type'], payload: any) {
  pubSub.publish('agent:updates', JSON.stringify({ type, payload }));
}

// ---------------------------------------------------------
// Requisite Delay and Promise concurrency logic
// ---------------------------------------------------------
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to count words as mock tokens safely
function countMockTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.split(/\s+/).length * 1.35);
}

// Real-world dynamic preset templates fallback for rapid performance or key-less operations
const DEFAULT_AGENT_DATA: Record<string, { plan: string; research: string; critic: string; finalReport: string }> = {
  default: {
    plan: "DEPARTING MEMORY PATHS: Initiating primary goal parse. Distributing specific sub-tasks to specialized sub-agents.\n- Researcher Agent: Explore search indexing and historical data points.\n- Critic Agent: Verify depth, structure, and check factual consistency.\n- Writer Agent: Synthesize research facts and criticisms into high-quality publication-ready reports.\n\nPruning checks passed. Optimizing pipeline routes.",
    research: "RESEARCH REPORT - CRITICAL DATA EXTRACTION:\n\n1. Market Overview:\n- Strong adoption curves noted in real-time digital orchestration engines.\n- Total addressable market estimated at $12.4B by 2028 with a 23% CAGR.\n\n2. Key Technical Constraints:\n- Webhooks latencies typically average 180ms without Pub/Sub routing layers.\n- Cache-miss penalties significantly impact live agent coordinate pipelines.\n\n3. Opportunities identified:\n- Hybrid execution engines with dynamic context pruning (like our simulated buffer trimmer) save up to 45% on egress bandwidth.",
    critic: "CRITIQUE REPORT & GAP AUDIT:\n\n- Fact Check: Financial CAGR rate of 23% matches premium industry reports. Good work.\n- Critical Gap identified: The research draft completely lacks visual modeling concepts or specific latency comparison figures.\n- Context Pruned Warning: History context sizes approached 3400 tokens limit. Pruning was engaged to guarantee safe loop termination.\n- Action Item for Writer: Synthesize latency stats explicitly and add an analytics section to draft.",
    finalReport: "FINAL EXECUTIVE STRATEGIC BRIEFING\n=======================================\n\n## 1. Executive Summary\nThis document synthesizes deep technical research and system assessments regarding the collaborative multi-agent real-time orchestration architecture.\n\n## 2. Research Analysis & Financial Growth\nOur research validates that the digital orchestration workspace is growing rapidly at a CAGR of 23%, heading towards a $12.4B valuation. Implementation of cache optimizations and event-driven Redis routing layers can decrease API cost rates by 45%.\n\n## 3. Real-Time Performance Benchmarks\nTo solve the critic's concern around lack of explicit latency graphs, we detail typical performance curves:\n- Redis PubSub Broker: 12ms network round-trip.\n- Standard Client-Server HTTP Webhook Polling: 180ms latency average.\n- Static Memory Cache Layer: <2ms resolution time.\n\n## 4. Conclusion & Action Strategy\nWe recommend implementing high-performance multi-agent brokers alongside a strict context pruning algorithm. This ensures memory windows are securely bounded, preventing infinite processing overheads."
  }
};

let activePipelineRunning = false;

// Core asynchronous execution orchestration coordinator
async function runAgentPipeline(goal: string, config: { maxIterations: number; pruningLevel: 'standard' | 'aggressive' | 'none' }) {
  if (activePipelineRunning) {
    broadcast('PIPELINE_ERROR', { error: 'A pipeline is already running. Please wait for completion.' });
    return;
  }
  activePipelineRunning = true;

  const maxTokensThreshold = config.pruningLevel === 'aggressive' ? 1200 : config.pruningLevel === 'standard' ? 2400 : 99999;
  const historyBuffer: MessageFrame[] = [];
  
  const metrics: TokenMetrics = {
    totalTokensUsed: 0,
    savedTokens: 0,
    pruningEvents: 0,
    latencyMs: 0,
    estimatedCostUsd: 0,
  };

  const updateMetrics = (tokensAdded: number, tokensSaved = 0, eventPruned = 0, latency = 0) => {
    metrics.totalTokensUsed += tokensAdded;
    metrics.savedTokens += tokensSaved;
    metrics.pruningEvents += eventPruned;
    metrics.latencyMs += latency;
    metrics.estimatedCostUsd = (metrics.totalTokensUsed * 0.000015) - (metrics.savedTokens * 0.000012);
    if (metrics.estimatedCostUsd < 0) metrics.estimatedCostUsd = 0;
    
    broadcast('METRICS_UPDATE', metrics);
  };

  const addLogMessage = (sender: string, message: string, type: ActivityLog['type'], agentId?: AgentId) => {
    const log: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString().substring(11, 19),
      sender,
      message,
      type,
      agentId
    };
    broadcast('LOG', log);
  };

  const streamTextToClient = async (agentId: AgentId, text: string) => {
    // Set streaming state
    broadcast('AGENT_STATE_CHANGE', { agentId, status: 'streaming', currentTask: 'Streaming report contents' });
    
    const words = text.split(' ');
    // Stream in batches of words to simulate incredibly premium live streaming
    for (let i = 0; i < words.length; i += 4) {
      const chunk = words.slice(i, i + 4).join(' ') + ' ';
      broadcast('AGENT_STREAM_CHUNK', { agentId, chunk });
      
      const chunkTokens = countMockTokens(chunk);
      updateMetrics(chunkTokens);
      await delay(80); // interactive realistic speed
    }
  };

  try {
    broadcast('PIPELINE_START', { goal, config });
    addLogMessage('System', `Initiating Multi-Agent Collaboration for goal: "${goal}"`, 'info');

    const gemini = getGeminiClient();

    // ----------------------------------------------------
    // STEP 1: Orchestrator Plan Node
    // ----------------------------------------------------
    const step1Start = Date.now();
    broadcast('AGENT_STATE_CHANGE', { agentId: 'orchestrator', status: 'thinking', currentTask: 'Analyzing goal & laying architectural pipeline' });
    addLogMessage('Orchestrator', 'Analyzing target user prompt and distributing task directives...', 'thought', 'orchestrator');
    await delay(1800);

    let orchestratorPlan = DEFAULT_AGENT_DATA.default.plan;
    if (gemini) {
      try {
        const prompt = `You are the master Orchestrator AI. The user's main goal is: "${goal}". Outline an orchestration plan detailing how Researcher, Critic, and Writer agents must coordinate. Keep it brief (under 120 words).`;
        const response = await gemini.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
        });
        if (response?.text) {
          orchestratorPlan = response.text;
        }
      } catch (err) {
        console.error('Gemini call failed for Orchestrator, using preset.', err);
      }
    }

    const planTokens = countMockTokens(orchestratorPlan);
    historyBuffer.push({
      sender: 'Orchestrator',
      role: 'system',
      content: orchestratorPlan,
      estimatedTokens: planTokens
    });
    updateMetrics(planTokens, 0, 0, Date.now() - step1Start);

    addLogMessage('Orchestrator', 'Broadcasting structured sub-tasks to Researcher Agent.', 'info', 'orchestrator');
    await streamTextToClient('orchestrator', orchestratorPlan);
    broadcast('AGENT_STATE_CHANGE', { agentId: 'orchestrator', status: 'complete', currentTask: 'Directives distributed successfully' });
    await delay(1000);

    // ----------------------------------------------------
    // STEP 2: Researcher Agent Node
    // ----------------------------------------------------
    const step2Start = Date.now();
    broadcast('AGENT_STATE_CHANGE', { agentId: 'researcher', status: 'thinking', currentTask: 'Conducting web sources lookup & data analysis' });
    addLogMessage('Researcher', 'Searching market parameters, CAGR ratios, and technology dependencies...', 'thought', 'researcher');
    await delay(2200);

    let researcherContent = DEFAULT_AGENT_DATA.default.research;
    if (gemini) {
      try {
        const prompt = `You are the Researcher AI. Read this goal: "${goal}". Formulate a set of detailed research points, technical requirements, and target metrics. Keep it structured and under 150 words.`;
        const response = await gemini.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
        });
        if (response?.text) {
          researcherContent = response.text;
        }
      } catch (err) {
        console.error('Gemini call failed for Researcher, using preset.', err);
      }
    }

    const researchTokens = countMockTokens(researcherContent);
    // Push and check context pruning
    historyBuffer.push({
      sender: 'Researcher',
      role: 'user',
      content: researcherContent,
      estimatedTokens: researchTokens
    });

    const pruneResult1 = pruneContextWindow(historyBuffer, maxTokensThreshold);
    if (pruneResult1.wasPruned) {
      addLogMessage('System', `Pruning engaged: Cleared older context nodes. Saved ${pruneResult1.savedTokens} tokens!`, 'warn');
      updateMetrics(researchTokens, pruneResult1.savedTokens, 1, Date.now() - step2Start);
    } else {
      updateMetrics(researchTokens, 0, 0, Date.now() - step2Start);
    }

    addLogMessage('Researcher', 'Delivering data analysis notes to the Critic node.', 'info', 'researcher');
    await streamTextToClient('researcher', researcherContent);
    broadcast('AGENT_STATE_CHANGE', { agentId: 'researcher', status: 'complete', currentTask: 'Research completed' });
    await delay(1000);

    // ----------------------------------------------------
    // STEP 3: Critic Agent Node
    // ----------------------------------------------------
    const step3Start = Date.now();
    broadcast('AGENT_STATE_CHANGE', { agentId: 'critic', status: 'thinking', currentTask: 'Validating fact compliance & diagnosing technical gaps' });
    addLogMessage('Critic', 'Reviewing researcher documentation against safety rules and quality thresholds...', 'thought', 'critic');
    await delay(2000);

    let criticContent = DEFAULT_AGENT_DATA.default.critic;
    if (gemini) {
      try {
        const prompt = `You are the Critic AI. Review this research work: "${researcherContent}". Find technical gaps, verify clarity of goal: "${goal}", and list precise suggestions for improvement. Keep it sharp and under 100 words.`;
        const response = await gemini.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
        });
        if (response?.text) {
          criticContent = response.text;
        }
      } catch (err) {
        console.error('Gemini call failed for Critic, using preset.', err);
      }
    }

    const criticTokens = countMockTokens(criticContent);
    historyBuffer.push({
      sender: 'Critic',
      role: 'model',
      content: criticContent,
      estimatedTokens: criticTokens
    });

    const pruneResult2 = pruneContextWindow(historyBuffer, maxTokensThreshold);
    if (pruneResult2.wasPruned) {
      addLogMessage('System', `Context Pruning engaged. Safe bounds retained. Saved ${pruneResult2.savedTokens} tokens.`, 'warn');
      updateMetrics(criticTokens, pruneResult2.savedTokens, 1, Date.now() - step3Start);
    } else {
      updateMetrics(criticTokens, 0, 0, Date.now() - step3Start);
    }

    addLogMessage('Critic', 'Rejecting/Approving draft & forwarding feedback to the Writer Agent.', 'info', 'critic');
    await streamTextToClient('critic', criticContent);
    broadcast('AGENT_STATE_CHANGE', { agentId: 'critic', status: 'complete', currentTask: 'Quality check passed with notes' });
    await delay(1000);

    // ----------------------------------------------------
    // STEP 4: Writer Agent Node
    // ----------------------------------------------------
    const step4Start = Date.now();
    broadcast('AGENT_STATE_CHANGE', { agentId: 'writer', status: 'thinking', currentTask: 'Synthesizing report & editing language formatting' });
    addLogMessage('Writer', 'Drafting final markdown report integrating raw facts & solving critic issues...', 'thought', 'writer');
    await delay(2500);

    let writerContent = DEFAULT_AGENT_DATA.default.finalReport;
    if (gemini) {
      try {
        const prompt = `You are the Writer AI. Research: "${researcherContent}". Critic Notes: "${criticContent}". Main Goal: "${goal}". Synthesize a professional executive markdown report addressing all suggestions. Make it outstanding and under 250 words.`;
        const response = await gemini.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
        });
        if (response?.text) {
          writerContent = response.text;
        }
      } catch (err) {
        console.error('Gemini call failed for Writer, using preset.', err);
      }
    }

    const writerTokens = countMockTokens(writerContent);
    historyBuffer.push({
      sender: 'Writer',
      role: 'model',
      content: writerContent,
      estimatedTokens: writerTokens
    });

    const pruneResult3 = pruneContextWindow(historyBuffer, maxTokensThreshold);
    if (pruneResult3.wasPruned) {
      addLogMessage('System', `Pruned oldest frames to yield write space. Saved ${pruneResult3.savedTokens} tokens.`, 'warn');
      updateMetrics(writerTokens, pruneResult3.savedTokens, 1, Date.now() - step4Start);
    } else {
      updateMetrics(writerTokens, 0, 0, Date.now() - step4Start);
    }

    addLogMessage('Writer', 'Publishing polished output block to client console workspace.', 'info', 'writer');
    await streamTextToClient('writer', writerContent);
    broadcast('AGENT_STATE_CHANGE', { agentId: 'writer', status: 'complete', currentTask: 'Report synthesized' });
    await delay(800);

    // Complete Pipeline
    addLogMessage('System', 'All agent pipelines completed. Synthesis compiled successfully.', 'success');
    broadcast('PIPELINE_COMPLETE', { finalReport: writerContent });

  } catch (error: any) {
    console.error('Pipeline error:', error);
    addLogMessage('System', `Pipeline execution crashed: ${error?.message || error}`, 'warn');
    broadcast('PIPELINE_ERROR', { error: error?.message || 'Unexpected pipeline interrupt' });
  } finally {
    activePipelineRunning = false;
  }
}

// ---------------------------------------------------------
// WebSocket Server Wireup & Communication Actions
// ---------------------------------------------------------
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws) => {
  console.log('Client connected to real-time agent updates.');
  wsClients.add(ws);

  ws.on('message', async (messageData) => {
    try {
      const data = JSON.parse(messageData.toString());
      if (data.type === 'START_EXECUTION') {
        const { goal, config } = data.payload;
        if (!goal) {
          ws.send(JSON.stringify({ type: 'PIPELINE_ERROR', payload: { error: 'Please submit a goal prompt.' } }));
          return;
        }
        // Run asynchronous pipeline in background to retain non-blocking state
        runAgentPipeline(goal, config);
      }
    } catch (e) {
      console.error('Error handling websocket message:', e);
    }
  });

  ws.on('close', () => {
    wsClients.delete(ws);
    console.log('Client disconnected.');
  });
});

// Bridge ws server upgrade sequence
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// API endpoint to return active state
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', api_key_configured: !!process.env.GEMINI_API_KEY });
});

// Vite middleware development mode configuration vs Static production routing
async function initServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Multi-Agent Express Server] Listening on http://localhost:${PORT}`);
  });
}

initServer();
