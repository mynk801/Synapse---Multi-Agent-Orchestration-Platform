import { Cpu, DollarSign, Bookmark, Timer } from 'lucide-react';
import { TokenMetrics } from '../types';

interface TokenAnalyticsProps {
  metrics: TokenMetrics;
  pruningLevel: string;
}

export function TokenAnalytics({ metrics, pruningLevel }: TokenAnalyticsProps) {
  const formatNum = (val: number) => val.toLocaleString();
  
  const formatCost = (val: number) => {
    if (val === 0) return '$0.00000';
    return `$${val.toFixed(4)}`;
  };

  const savedPercent = metrics.totalTokensUsed > 0 
    ? ((metrics.savedTokens / (metrics.totalTokensUsed + metrics.savedTokens)) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-3" id="token-analytics-container">
      <div className="flex items-center gap-2">
        <h4 className="font-sans font-bold text-xs uppercase tracking-widest text-indigo-400">
          Performance Metrics Matrix
        </h4>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="analytics-grid">
        {/* Total Tokens Used Card */}
        <div className="bg-zinc-900/50 border border-zinc-805 rounded-2xl p-4.5 relative overflow-hidden" id="metric-card-total">
          <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
            <Cpu className="w-3.5 h-3.5 text-indigo-455" />
            <span className="text-[10px] font-sans font-semibold uppercase tracking-wider">Active Tokens</span>
          </div>
          <div className="font-mono text-xl font-extrabold text-zinc-100 tracking-tight leading-none">
            {formatNum(metrics.totalTokensUsed)}
          </div>
          <span className="text-[9px] text-zinc-500 font-mono block mt-2">
            Active session footprint
          </span>
        </div>

        {/* Saved Tokens Card */}
        <div className="bg-zinc-900/50 border border-zinc-805 rounded-2xl p-4.5 relative overflow-hidden" id="metric-card-saved">
          <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
            <Bookmark className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[10px] font-sans font-semibold uppercase tracking-wider">Saved (Trimmer)</span>
          </div>
          <div className="flex items-baseline gap-1.5 leading-none">
            <span className="font-mono text-xl font-extrabold text-emerald-400 tracking-tight">
              {savedPercent}%
            </span>
            {metrics.savedTokens > 0 && (
              <span className="text-[9px] font-bold text-zinc-300 font-mono">
                ({formatNum(metrics.savedTokens)})
              </span>
            )}
          </div>
          <span className="text-[9px] text-zinc-500 font-mono block mt-2">
            Pruning count: {metrics.pruningEvents} runs
          </span>
        </div>

        {/* Latency Card */}
        <div className="bg-zinc-900/50 border border-zinc-805 rounded-2xl p-4.5 relative overflow-hidden" id="metric-card-latency">
          <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
            <Timer className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[10px] font-sans font-semibold uppercase tracking-wider">Avg Latency</span>
          </div>
          <div className="font-mono text-xl font-extrabold text-zinc-100 tracking-tight leading-none">
            {formatNum(metrics.latencyMs)} <span className="text-xs text-zinc-500">ms</span>
          </div>
          <span className="text-[9px] text-zinc-500 font-mono block mt-2">
            Network response lag
          </span>
        </div>

        {/* Estimated Cost Card */}
        <div className="bg-zinc-900/50 border border-zinc-805 rounded-2xl p-4.5 relative overflow-hidden" id="metric-card-cost">
          <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-[10px] font-sans font-semibold uppercase tracking-wider">Cost index</span>
          </div>
          <div className="font-mono text-xl font-extrabold text-zinc-100 tracking-tight leading-none">
            {formatCost(metrics.estimatedCostUsd)}
          </div>
          <span className="text-[9px] text-zinc-500 font-mono block mt-2">
            Calculated rate: standard
          </span>
        </div>
      </div>

      <div className="bg-zinc-950/40 border border-zinc-900 p-2.5 rounded-xl flex items-center justify-between font-mono text-[9px] text-zinc-500" id="strategy-telemetry-pill">
        <span>STRATEGY ACTIVE: {pruningLevel.toUpperCase()}</span>
        <span>TRIM TRIGGER: {pruningLevel === 'aggressive' ? '>1,200 TK' : pruningLevel === 'standard' ? '>2,400 TK' : 'NONE'}</span>
      </div>
    </div>
  );
}
