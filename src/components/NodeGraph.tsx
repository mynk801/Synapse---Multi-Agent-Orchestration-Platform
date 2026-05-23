import { Cpu, Search, HelpCircle, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { AgentNode, AgentId } from '../types';

interface NodeGraphProps {
  agents: AgentNode[];
  activeAgentId: AgentId | null;
}

// Coordinates map for drawing the connectors
const COORDINATES = {
  orchestrator: { x: 50, y: 15 },
  researcher: { x: 20, y: 55 },
  critic: { x: 80, y: 55 },
  writer: { x: 50, y: 88 }
};

export function NodeGraph({ agents, activeAgentId }: NodeGraphProps) {
  // Helper to pick the agent icon
  const getAgentIcon = (id: AgentId) => {
    switch (id) {
      case 'orchestrator':
        return <Cpu className="w-5 h-5 text-indigo-400" />;
      case 'researcher':
        return <Search className="w-5 h-5 text-emerald-400" />;
      case 'critic':
        return <HelpCircle className="w-5 h-5 text-amber-500" />;
      case 'writer':
        return <FileText className="w-5 h-5 text-violet-400" />;
    }
  };

  const getAgentHeaderStyle = (id: AgentId, status: string) => {
    if (status === 'thinking' || status === 'streaming') {
      switch (id) {
        case 'orchestrator': return 'bg-indigo-950/20 text-indigo-300 border-indigo-900/50';
        case 'researcher': return 'bg-emerald-950/20 text-emerald-300 border-emerald-900/50';
        case 'critic': return 'bg-amber-950/20 text-amber-300 border-amber-900/50';
        case 'writer': return 'bg-violet-950/20 text-violet-300 border-violet-900/50';
      }
    }
    return 'bg-zinc-950/40 text-zinc-400 border-zinc-900/40';
  };

  const getAgentGlowColor = (id: AgentId, status: string) => {
    if (status === 'thinking') {
      switch (id) {
        case 'orchestrator': return 'ring-2 ring-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.25)] scale-[1.03] border-indigo-400';
        case 'researcher': return 'ring-2 ring-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.25)] scale-[1.03] border-emerald-400';
        case 'critic': return 'ring-2 ring-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.25)] scale-[1.03] border-amber-400';
        case 'writer': return 'ring-2 ring-violet-500/20 shadow-[0_0_20px_rgba(139,92,246,0.25)] scale-[1.03] border-violet-400';
      }
    }
    if (status === 'streaming') {
      switch (id) {
        case 'orchestrator': return 'ring-2 ring-indigo-500/40 shadow-[0_0_25px_rgba(99,102,241,0.4)] scale-[1.03] border-indigo-500';
        case 'researcher': return 'ring-2 ring-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.4)] scale-[1.03] border-emerald-500';
        case 'critic': return 'ring-2 ring-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.4)] scale-[1.03] border-amber-500';
        case 'writer': return 'ring-2 ring-violet-500/40 shadow-[0_0_25px_rgba(139,92,246,0.4)] scale-[1.03] border-violet-500';
      }
    }
    if (status === 'complete') {
      return 'border-zinc-800 shadow-md opacity-90';
    }
    return 'border-zinc-900 hover:border-zinc-800';
  };

  // Determine line active status
  const line1Active = 
    agents.find(a => a.id === 'orchestrator')?.status === 'streaming' ||
    agents.find(a => a.id === 'researcher')?.status === 'thinking';

  const line2Active =
    agents.find(a => a.id === 'researcher')?.status === 'streaming' ||
    agents.find(a => a.id === 'critic')?.status === 'thinking';

  const line3Active =
    agents.find(a => a.id === 'critic')?.status === 'streaming' ||
    agents.find(a => a.id === 'writer')?.status === 'thinking';

  return (
    <div className="bg-zinc-950/30 border border-zinc-800 rounded-3xl p-6 relative w-full h-[520px] overflow-hidden select-none shadow-inner" id="node-graph-canvas">
      {/* High-tech grid overlay background */}
      <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'radial-gradient(#6366f1 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }} />
      
      {/* Connection SVG Lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" id="svg-paths-container">
        <defs>
          <linearGradient id="grad-orchestrator-researcher" x1="50%" y1="15%" x2="20%" y2="55%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="grad-researcher-critic" x1="20%" y1="55%" x2="80%" y2="55%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="grad-critic-writer" x1="80%" y1="55%" x2="50%" y2="88%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>

        {/* 1. Orchestrator -> Researcher Link */}
        <path
          d={`M ${COORDINATES.orchestrator.x}% ${COORDINATES.orchestrator.y}% L ${COORDINATES.researcher.x}% ${COORDINATES.researcher.y}%`}
          stroke={line1Active ? 'url(#grad-orchestrator-researcher)' : '#1f1f23'}
          strokeWidth={line1Active ? '3' : '1.5'}
          fill="none"
          strokeDasharray={line1Active ? '8, 4' : '4, 4'}
          className={line1Active ? 'animate-[dash_20s_linear_infinite]' : ''}
          style={{ animationDuration: '0.6s' }}
        />

        {/* 2. Researcher -> Critic Link */}
        <path
          d={`M ${COORDINATES.researcher.x}% ${COORDINATES.researcher.y}% L ${COORDINATES.critic.x}% ${COORDINATES.critic.y}%`}
          stroke={line2Active ? 'url(#grad-researcher-critic)' : '#1f1f23'}
          strokeWidth={line2Active ? '3' : '1.5'}
          fill="none"
          strokeDasharray={line2Active ? '8, 4' : '4, 4'}
          className={line2Active ? 'animate-[dash_20s_linear_infinite]' : ''}
          style={{ animationDuration: '0.6s' }}
        />

        {/* 3. Critic -> Writer Link */}
        <path
          d={`M ${COORDINATES.critic.x}% ${COORDINATES.critic.y}% L ${COORDINATES.writer.x}% ${COORDINATES.writer.y}%`}
          stroke={line3Active ? 'url(#grad-critic-writer)' : '#1f1f23'}
          strokeWidth={line3Active ? '3' : '1.5'}
          fill="none"
          strokeDasharray={line3Active ? '8, 4' : '4, 4'}
          className={line3Active ? 'animate-[dash_20s_linear_infinite]' : ''}
          style={{ animationDuration: '0.6s' }}
        />
      </svg>

      {/* Styled directional arrow symbols */}
      <div className="absolute top-[32%] left-[34%] rotate-[-48deg] scale-110 z-0 hidden md:block">
        <span className={`text-[12px] font-mono ${line1Active ? 'text-indigo-400 animate-pulse' : 'text-zinc-800'}`}>➔</span>
      </div>
      <div className="absolute top-[52%] left-[49%] rotate-[0deg] scale-110 z-0 hidden md:block">
        <span className={`text-[12px] font-mono ${line2Active ? 'text-emerald-400 animate-pulse' : 'text-zinc-800'}`}>➔</span>
      </div>
      <div className="absolute top-[70%] left-[64%] rotate-[130deg] scale-110 z-0 hidden md:block">
        <span className={`text-[12px] font-mono ${line3Active ? 'text-violet-400 animate-pulse' : 'text-zinc-800'}`}>➔</span>
      </div>

      {/* Render Node Cards */}
      <div className="absolute inset-0 z-10 w-full h-full pointer-events-none">
        {agents.map((agent) => {
          const coords = COORDINATES[agent.id];
          const isFocussed = activeAgentId === agent.id;
          
          return (
            <div
              id={`agent-card-${agent.id}`}
              key={agent.id}
              className={`absolute bg-zinc-900 border text-zinc-100 rounded-2xl p-4.5 w-[240px] pointer-events-auto transition-all duration-300 ${getAgentGlowColor(
                agent.id,
                agent.status
              )}`}
              style={{
                left: `${coords.x}%`,
                top: `${coords.y}%`,
                transform: `translate(-50%, -50%) ${
                  agent.status === 'thinking' || agent.status === 'streaming' ? 'scale(1.02)' : ''
                }`,
              }}
            >
              {/* Header block with bento layout */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest">
                  {agent.id === 'orchestrator' ? 'Main Node' : agent.id === 'researcher' ? 'Worker 01' : agent.id === 'critic' ? 'Worker 02' : 'Finalizer'}
                </span>
                <span className={`w-2 h-2 rounded-full ${
                  agent.status === 'complete' ? 'bg-emerald-500' :
                  agent.status === 'streaming' ? 'bg-indigo-500 animate-pulse' :
                  agent.status === 'thinking' ? 'bg-amber-500 animate-pulse' : 'bg-zinc-700'
                }`} />
              </div>

              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800 shrink-0">
                  {getAgentIcon(agent.id)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-zinc-100 font-sans leading-tight">{agent.label}</h3>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                    {agent.id === 'orchestrator' ? 'Root Logic Handler' : 
                     agent.id === 'researcher' ? 'Web & Database Search' : 
                     agent.id === 'critic' ? 'Validation & Audit' : 'Report Output Synthesizer'}
                  </p>
                </div>
              </div>

              {/* Status information and live logging tasks */}
              <div className="space-y-2">
                {agent.currentTask ? (
                  <div className="bg-zinc-950 p-2 border border-zinc-800 rounded-lg flex items-start gap-2 min-h-[46px]">
                    {(agent.status === 'thinking' || agent.status === 'streaming') && (
                      <Loader2 className="w-3 h-3 text-indigo-400 animate-spin shrink-0 mt-0.5" />
                    )}
                    <span className="text-[10px] font-mono text-zinc-400 leading-normal line-clamp-2">
                      {agent.currentTask}
                    </span>
                  </div>
                ) : (
                  <div className="bg-zinc-950/40 border border-dashed border-zinc-850 p-2 rounded-lg flex items-center justify-center min-h-[46px]">
                    <span className="text-[10px] font-mono text-zinc-650 italic uppercase tracking-wider">Awaiting trigger</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
