import React, { useState } from 'react';
import { Play, Sliders, AlertTriangle } from 'lucide-react';
import { PipelineConfig } from '../types';

interface ControlPanelProps {
  onExecute: (config: PipelineConfig) => void;
  isRunning: boolean;
}

const PRESET_GOALS = [
  "Research Nvidia AI chips market competition in 2026 and compile a report",
  "Design a secure decentralized OAuth authentication flow for hybrid apps",
  "Summarize 2026 renewable energy smart-grid breakthroughs and critical bottlenecks",
];

export function ControlPanel({ onExecute, isRunning }: ControlPanelProps) {
  const [goal, setGoal] = useState(PRESET_GOALS[0]);
  const [maxIterations, setMaxIterations] = useState(4);
  const [pruningLevel, setPruningLevel] = useState<PipelineConfig['tokenPruningLevel']>('standard');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRunning || !goal.trim()) return;
    onExecute({
      goal: goal.trim(),
      maxIterations,
      tokenPruningLevel: pruningLevel,
    });
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden" id="control-panel-container">
      {/* Decorative top strip */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-linear-to-r from-indigo-500 via-indigo-600 to-indigo-500" />
      
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-sans font-bold text-xs uppercase tracking-widest text-indigo-400 flex items-center gap-2" id="panel-title">
          <Sliders className="w-4 h-4" />
          Control Panel
        </h3>
        {isRunning && (
          <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-tight text-indigo-400 bg-indigo-950/45 border border-indigo-900/60 px-2 py-0.5 rounded-full animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Active
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" id="control-form">
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest" htmlFor="goal-input">
            Primary Goal / Prompt
          </label>
          <textarea
            id="goal-input"
            className="w-full h-24 text-xs text-zinc-200 placeholder-zinc-600 bg-zinc-950 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 p-3.5 rounded-xl transition duration-150 outline-hidden resize-none leading-relaxed"
            placeholder="Describe your multi-step objective..."
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            disabled={isRunning}
          />
        </div>

        {/* Presets Grid */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-normal">Quick-Start Goal Templates</span>
          <div className="flex flex-col gap-2" id="presets-container">
            {PRESET_GOALS.map((preset, index) => (
              <button
                id={`preset-btn-${index}`}
                key={index}
                type="button"
                onClick={() => setGoal(preset)}
                disabled={isRunning}
                className={`text-left text-xs px-3.5 py-2.5 rounded-xl border transition-all duration-15 font-sans leading-normal ${
                  goal === preset
                    ? 'bg-indigo-950/40 border-indigo-500/60 text-indigo-300 font-medium'
                    : 'bg-zinc-950/40 border-zinc-800/80 text-zinc-400 hover:bg-zinc-900 hover:border-zinc-700'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Configuration settings row */}
        <div className="grid grid-cols-2 gap-4 pt-1">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest animate-pulse" htmlFor="max-iterations">
                Max Loops
              </label>
              <span className="text-[10px] font-mono font-bold text-indigo-400">
                0{maxIterations}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="max-iterations"
                type="range"
                min="2"
                max="8"
                className="w-full accent-indigo-500 cursor-pointer h-1 bg-zinc-800 rounded-full outline-hidden"
                value={maxIterations}
                onChange={(e) => setMaxIterations(Number(e.target.value))}
                disabled={isRunning}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest" htmlFor="pruning-level">
              Context Buffer Trimming
            </label>
            <select
              id="pruning-level"
              className="w-full text-xs text-zinc-300 bg-zinc-950 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 px-3 py-2 rounded-xl transition duration-150 outline-hidden cursor-pointer"
              value={pruningLevel}
              onChange={(e) => setPruningLevel(e.target.value as PipelineConfig['tokenPruningLevel'])}
              disabled={isRunning}
            >
              <option value="standard">Standard (2.4K TK)</option>
              <option value="aggressive">Aggressive (1.2K TK)</option>
              <option value="none">Disabled</option>
            </select>
          </div>
        </div>

        {pruningLevel === 'none' && (
          <div className="flex items-start gap-2 bg-amber-950/20 border border-amber-900/35 p-3 rounded-xl scale-[0.98]" id="warning-disabled-pruning">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-500/90 leading-normal">
              Warning: Disabling context pruning maximizes token context usage, increasing risk of Gemini memory loops.
            </p>
          </div>
        )}

        <button
          id="btn-execute-pipeline"
          type="submit"
          disabled={isRunning || !goal.trim()}
          className={`w-full flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest py-3 hover:translate-y-[-1px] active:translate-y-[0px] rounded-xl transition-all duration-200 ${
            isRunning || !goal.trim()
              ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed shadow-none border border-zinc-850'
              : 'bg-indigo-600 hover:bg-indigo-500 text-zinc-100 cursor-pointer shadow-lg shadow-indigo-600/30 font-semibold'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          {isRunning ? 'Execution Active...' : 'Execute Pipeline'}
        </button>
      </form>
    </div>
  );
}
