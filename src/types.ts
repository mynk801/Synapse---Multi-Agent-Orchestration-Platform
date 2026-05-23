export type AgentId = 'orchestrator' | 'researcher' | 'critic' | 'writer';

export type AgentStatus = 'idle' | 'thinking' | 'streaming' | 'complete';

export interface AgentNode {
  id: AgentId;
  label: string;
  status: AgentStatus;
  currentTask?: string;
  avatar: string;
  color: string;
  x: number;
  y: number;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  sender: string;
  message: string;
  type: 'info' | 'thought' | 'stream' | 'success' | 'warn';
  agentId?: AgentId;
}

export interface TokenMetrics {
  totalTokensUsed: number;
  savedTokens: number;
  pruningEvents: number;
  latencyMs: number;
  estimatedCostUsd: number;
}

export interface PipelineConfig {
  maxIterations: number;
  tokenPruningLevel: 'standard' | 'aggressive' | 'none';
  goal: string;
}

export interface ServerToClientMessage {
  type: 
    | 'PIPELINE_START'
    | 'AGENT_STATE_CHANGE'
    | 'AGENT_THOUGHT'
    | 'AGENT_STREAM_CHUNK'
    | 'AGENT_COMPLETE'
    | 'PRUNING_EVENT'
    | 'METRICS_UPDATE'
    | 'LOG'
    | 'PIPELINE_COMPLETE'
    | 'PIPELINE_ERROR';
  payload: any;
}
