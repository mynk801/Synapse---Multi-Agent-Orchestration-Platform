import { useEffect, useRef, useState } from 'react';
import { Terminal, Trash2, Filter } from 'lucide-react';
import { ActivityLog } from '../types';

interface ActivityFeedProps {
  logs: ActivityLog[];
  onClear: () => void;
}

export function ActivityFeed({ logs, onClear }: ActivityFeedProps) {
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<string>('all');

  // Autoscroll to bottom whenever logs change
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    if (filter === 'thoughts') return log.type === 'thought';
    if (filter === 'system') return log.type === 'info' || log.type === 'warn' || log.type === 'success';
    return log.agentId === filter;
  });

  const getLogColorClass = (type: ActivityLog['type']) => {
    switch (type) {
      case 'info': return 'text-zinc-400 font-mono';
      case 'thought': return 'text-amber-400 italic font-mono';
      case 'success': return 'text-emerald-400 font-mono font-medium';
      case 'warn': return 'text-indigo-400 font-mono';
      case 'stream': return 'text-zinc-300 font-mono';
    }
  };

  const getLogSenderColor = (sender: string) => {
    switch (sender.toLowerCase()) {
      case 'orchestrator': return 'text-indigo-400 font-bold';
      case 'researcher': return 'text-emerald-400 font-bold';
      case 'critic': return 'text-amber-500 font-bold';
      case 'writer': return 'text-violet-400 font-bold';
      default: return 'text-zinc-500';
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl h-full" id="activity-feed-container">
      {/* Stream Console Header */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-800/10 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5" />
          Stream Console
        </h2>
        
        <div className="flex items-center gap-2">
          {/* Custom micro filter widget */}
          <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-850 px-2.5 py-1 rounded-lg">
            <Filter className="w-3 h-3 text-zinc-500" />
            <select
              id="terminal-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-[9px] font-mono font-bold text-zinc-400 bg-transparent border-0 ring-0 focus:outline-hidden hover:text-zinc-200 cursor-pointer"
            >
              <option value="all">ALL NODES</option>
              <option value="system">TELEMETRY</option>
              <option value="thoughts">THOUGHTS</option>
              <option value="orchestrator">orchestrator</option>
              <option value="researcher">researcher</option>
              <option value="critic">critic</option>
              <option value="writer">writer</option>
            </select>
          </div>

          <button
            id="clear-logs"
            onClick={onClear}
            title="Clear Stream Data"
            className="p-1 px-1.5 bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300 rounded-lg transition duration-150 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Terminal logs list stream area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 select-text h-[360px] scrollbar-thin scrollbar-thumb-zinc-800" id="terminal-entries">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-650 font-mono text-[11px] py-12 text-center">
            <span>&gt;_ [SYSTEM WAITING FOR TRIGGER]</span>
            <span className="text-[9px] mt-1 opacity-50 uppercase tracking-widest">Connect pipeline to capture metrics</span>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div id={log.id} key={log.id} className="font-mono text-[10px] leading-relaxed break-words hover:bg-zinc-800/20 px-2 py-1 rounded-lg transition">
              <span className="text-zinc-600 mr-2">[{log.timestamp}]</span>
              
              {log.sender !== 'System' ? (
                <>
                  <span className={getLogSenderColor(log.sender)}>{log.sender.toLowerCase()}:</span>{' '}
                </>
              ) : (
                <span className="text-zinc-500 font-bold mr-2">[System]:</span>
              )}

              <span className={getLogColorClass(log.type)}>
                {log.message}
              </span>
            </div>
          ))
        )}
        <div ref={terminalEndRef} />
      </div>

      {/* Footer information bar */}
      <div className="bg-zinc-950 px-4 py-2 flex items-center justify-between font-mono text-[9px] text-zinc-600 border-t border-zinc-850">
        <span>Channel: pipeline_updates_v24</span>
        <span className="flex items-center gap-1">
          <span className="w-1 h-3 bg-indigo-500 animate-pulse inline-block" />
          CONNECTED Secure
        </span>
      </div>
    </div>
  );
}
