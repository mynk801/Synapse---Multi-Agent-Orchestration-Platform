import { useState, useEffect, useRef } from 'react';
import { Network, Bot, Layers, Server, Sparkles } from 'lucide-react';
import { AgentNode, ActivityLog, TokenMetrics, PipelineConfig, AgentId } from './types';
import { ControlPanel } from './components/ControlPanel';
import { NodeGraph } from './components/NodeGraph';
import { ActivityFeed } from './components/ActivityFeed';
import { TokenAnalytics } from './components/TokenAnalytics';
import { FinalReportView } from './components/FinalReportView';

const INITIAL_AGENTS: AgentNode[] = [
  { id: 'orchestrator', label: 'Orchestrator Node', status: 'idle', avatar: '👑', color: 'bg-indigo-600', x: 50, y: 15 },
  { id: 'researcher', label: 'Researcher Node', status: 'idle', avatar: '🔬', color: 'bg-emerald-600', x: 20, y: 55 },
  { id: 'critic', label: 'Critic Node', status: 'idle', avatar: '⚖️', color: 'bg-amber-600', x: 80, y: 55 },
  { id: 'writer', label: 'Writer Node', status: 'idle', avatar: '✍️', color: 'bg-violet-600', x: 50, y: 88 }
];

const INITIAL_METRICS: TokenMetrics = {
  totalTokensUsed: 0,
  savedTokens: 0,
  pruningEvents: 0,
  latencyMs: 0,
  estimatedCostUsd: 0
};

export default function App() {
  const [agents, setAgents] = useState<AgentNode[]>(INITIAL_AGENTS);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [metrics, setMetrics] = useState<TokenMetrics>(INITIAL_METRICS);
  const [isRunning, setIsRunning] = useState(false);
  const [currentGoal, setCurrentGoal] = useState('');
  const [finalReport, setFinalReport] = useState('');
  const [activeStreamingText, setActiveStreamingText] = useState<Record<string, string>>({});
  const [pruningLevel, setPruningLevel] = useState<string>('standard');
  const [socketConnected, setSocketConnected] = useState(false);
  const [activeAgentId, setActiveAgentId] = useState<AgentId | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // Initialize and maintain resilient WebSocket connection
  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}`;
    console.log(`Establishing real-time connection to: ${wsUrl}`);
    
    let ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    const setupSocket = () => {
      ws.onopen = () => {
        console.log('WebSocket successfully linked.');
        setSocketConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const { type, payload } = message;

          switch (type) {
            case 'PIPELINE_START':
              setIsRunning(true);
              setFinalReport('');
              setActiveStreamingText({});
              setLogs([]);
              setMetrics(INITIAL_METRICS);
              setCurrentGoal(payload.goal);
              setPruningLevel(payload.config?.tokenPruningLevel || 'standard');
              // Set all agents to idle at the launch
              setAgents(prev => prev.map(a => ({ ...a, status: 'idle', currentTask: '' })));
              break;

            case 'AGENT_STATE_CHANGE': {
              const { agentId, status, currentTask } = payload;
              setAgents(prev => prev.map(agent => 
                agent.id === agentId 
                  ? { ...agent, status, currentTask: currentTask || agent.currentTask } 
                  : agent
              ));
              if (status === 'thinking' || status === 'streaming') {
                setActiveAgentId(agentId);
              } else if (status === 'complete') {
                setActiveAgentId(null);
              }
              break;
            }

            case 'AGENT_STREAM_CHUNK': {
              const { agentId, chunk } = payload;
              setActiveStreamingText(prev => ({
                ...prev,
                [agentId]: (prev[agentId] || '') + chunk
              }));
              break;
            }

            case 'LOG': {
              setLogs(prev => [...prev, payload]);
              break;
            }

            case 'METRICS_UPDATE': {
              setMetrics(payload);
              break;
            }

            case 'PIPELINE_COMPLETE':
              setIsRunning(false);
              setFinalReport(payload.finalReport);
              setActiveAgentId(null);
              break;

            case 'PIPELINE_ERROR':
              setIsRunning(false);
              setLogs(prev => [
                ...prev,
                {
                  id: `err-${Date.now()}`,
                  timestamp: new Date().toISOString().substring(11, 19),
                  sender: 'System',
                  message: `Pipeline halted: ${payload.error}`,
                  type: 'warn'
                }
              ]);
              setActiveAgentId(null);
              break;
          }
        } catch (e) {
          console.error('Error parsing WebSocket server signal:', e);
        }
      };

      ws.onclose = () => {
        console.warn('WebSocket connection dissolved. Re-attempting handshake in 3 seconds...');
        setSocketConnected(false);
        setTimeout(() => {
          ws = new WebSocket(wsUrl);
          wsRef.current = ws;
          setupSocket();
        }, 3000);
      };

      ws.onerror = (err) => {
        console.error('WS Socket error interface:', err);
      };
    };

    setupSocket();

    return () => {
      ws.close();
    };
  }, []);

  // Submit trigger to Express socket pipeline broker
  const handleExecute = (config: PipelineConfig) => {
    if (!socketConnected) {
      alert('WebSocket server is currently disconnected. Attempting automatic reconnection...');
      return;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'START_EXECUTION',
        payload: {
          goal: config.goal,
          config: {
            maxIterations: config.maxIterations,
            tokenPruningLevel: config.tokenPruningLevel
          }
        }
      }));
    }
  };

  const clearMetricsAndLogs = () => {
    setLogs([]);
    setMetrics(INITIAL_METRICS);
    setFinalReport('');
    setActiveStreamingText({});
    setAgents(prev => prev.map(a => ({ ...a, status: 'idle', currentTask: '' })));
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans" id="app-root">
      {/* High-Tech Header Section */}
      <header className="bg-zinc-950/60 border-b border-zinc-900 sticky top-0 z-40 backdrop-blur-md" id="navigation-header">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <Network className="w-5.5 h-5.5 text-zinc-100" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                SYNAPSE 
                <span className="text-indigo-400 text-[10px] font-mono tracking-widest uppercase ml-1 border border-indigo-900/40 bg-indigo-950/20 px-2 py-0.5 rounded">
                  Orchestrator v2.4
                </span>
              </h1>
              <p className="text-xs text-zinc-500 font-medium leading-none mt-1">Multi-Agent Neural Pipeline Interface</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Connection Status Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full" id="status-connection-badge">
              <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-[10px] font-mono uppercase tracking-tighter text-zinc-400 underline decoration-indigo-500/30 underline-offset-4">
                WS Connection: {socketConnected ? 'Active' : 'Offline'}
              </span>
            </div>
            
            <div className="hidden md:flex items-center gap-2 text-xs text-zinc-500 font-mono bg-zinc-950 border border-zinc-900 px-3 py-1.5 rounded-lg">
              <Server className="w-3.5 h-3.5 text-zinc-650" />
              <span>Cwd_Port: 3000</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6" id="dashboard-workspace">
        {/* Bento Grid Header Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Controls + Terminal Activity Feed (Columns: 4) */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-[90px] h-auto" id="left-sidebar">
            <ControlPanel onExecute={handleExecute} isRunning={isRunning} />
            <ActivityFeed logs={logs} onClear={clearMetricsAndLogs} />
          </div>

          {/* MAIN WORKSPACE: Visual Node graph & Generated Report briefs (Columns: 8) */}
          <div className="lg:col-span-8 space-y-6" id="main-content-workspace">
            {/* Real-time metrics bar */}
            <TokenAnalytics metrics={metrics} pruningLevel={pruningLevel} />

            {/* Live Visualizing Agent Interaction Graph */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Bot className="w-4 h-4 text-indigo-400" />
                  <span className="font-sans font-bold text-[10px] uppercase tracking-widest">
                    Live Connections Canvas
                  </span>
                </div>
                {isRunning && activeAgentId && (
                  <div className="text-[9px] font-mono text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-900/55 animate-pulse">
                    FOCUS NODE: {activeAgentId.toUpperCase()}
                  </div>
                )}
              </div>
              <NodeGraph agents={agents} activeAgentId={activeAgentId} />
            </div>

            {/* Real-time Streaming overlay frame */}
            {isRunning && Object.values(activeStreamingText).some(t => t.length > 0) && (
              <div className="bg-zinc-900 border border-zinc-805 rounded-xl p-4 shadow-2xl" id="live-streaming-chunk-overlay">
                <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-zinc-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-mono tracking-widest font-extrabold uppercase text-zinc-500">
                    Active Output Stream Intercept (Real-time Frame)
                  </span>
                </div>
                <div className="space-y-2.5 max-h-[120px] overflow-y-auto">
                  {agents.map((agent) => {
                    const str = activeStreamingText[agent.id];
                    if (!str) return null;
                    return (
                      <div id={`stream-chunk-${agent.id}`} key={agent.id} className="text-[10px] font-mono leading-relaxed text-zinc-300">
                        <span className="text-indigo-400 font-bold">&gt; {agent.label}:</span>{' '}
                        <span className="text-zinc-400 italic line-clamp-2">{str}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Document synthesis result pane */}
            {finalReport ? (
              <FinalReportView report={finalReport} goal={currentGoal} />
            ) : isRunning ? (
              <div className="bg-zinc-900/50 border border-zinc-805 rounded-3xl p-8 flex flex-col items-center justify-center text-center min-h-[220px]" id="synthesis-generating-waiter">
                <div className="relative mb-4">
                  <div className="w-10 h-10 rounded-full border-2 border-zinc-800 border-t-indigo-500 animate-spin" />
                  <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse absolute top-3 left-3" />
                </div>
                <h4 className="font-sans font-bold text-xs uppercase tracking-widest text-zinc-300">
                  Compiling Synthesis
                </h4>
                <p className="text-[10px] text-zinc-500 max-w-sm mt-1.5">
                  The agents are currently executing sequential/parallel promises. Monitor node flows and state transition glows on the canvas above.
                </p>
              </div>
            ) : (
              <div className="bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl p-8 flex flex-col items-center justify-center text-center text-zinc-500 min-h-[200px]" id="workspace-initial-splash">
                <Layers className="w-7 h-7 text-zinc-700 mb-3" />
                <h4 className="font-sans font-bold text-xs uppercase tracking-widest text-zinc-400">
                  Awaiting Pipeline Run
                </h4>
                <p className="text-[10px] text-zinc-500 mt-1 max-w-xs mx-auto">
                  Submit a goal prompt in the Control Console on the left. The agents will stream insights and compile markdown briefings.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Bento Grid High-Fidelity Legendary Footer */}
        <footer className="mt-8 flex flex-col sm:flex-row items-center justify-between text-[10px] text-zinc-600 uppercase font-mono border-t border-zinc-900/60 pt-5">
          <div className="flex flex-wrap gap-5">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              <span>Active State / Complete</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
              <span>Processing Stream</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
              <span>Action / Critique Buffer</span>
            </div>
          </div>
          <div className="mt-2.5 sm:mt-0 text-right">
            Runtime_Version: 2.12.8 | Channel: pubsub_redis_local
          </div>
        </footer>
      </main>
    </div>
  );
}
