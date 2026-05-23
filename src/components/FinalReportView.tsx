import { useState } from 'react';
import Markdown from 'react-markdown';
import { Copy, Download, FileCheck, Check } from 'lucide-react';

interface FinalReportViewProps {
  report: string;
  goal: string;
}

export function FinalReportView({ report, goal }: FinalReportViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy text:', e);
    }
  };

  const handleDownload = () => {
    try {
      const element = document.createElement('a');
      const file = new Blob([report], { type: 'text/markdown' });
      element.href = URL.createObjectURL(file);
      element.download = `multi-agent-briefing-${Date.now()}.md`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (e) {
      console.error('Download failed:', e);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-805 rounded-2xl shadow-xl relative overflow-hidden" id="final-report-container">
      {/* Decorative top style */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-linear-to-r from-violet-500 via-indigo-500 to-violet-500" />

      {/* Header with bento tags */}
      <div className="p-5 border-b border-zinc-800/80 bg-zinc-800/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-950 text-indigo-400 rounded-xl border border-zinc-800 shrink-0">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-sans font-bold text-sm text-zinc-100 uppercase tracking-widest leading-none mb-1">
              Synthesized Briefing
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono block">
              Objective: "{goal}"
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            id="report-copy-btn"
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-2 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-850 hover:border-zinc-700 rounded-xl transition duration-150 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy MD
              </>
            )}
          </button>

          <button
            id="report-download-btn"
            onClick={handleDownload}
            className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-zinc-100 rounded-xl shadow-lg shadow-indigo-600/20 transition duration-155 cursor-pointer"
          >
            <Download className="w-3 h-3" />
            Download
          </button>
        </div>
      </div>

      {/* Markdown Content view within a sleek high-tech paper align */}
      <div className="p-6 bg-zinc-950/40 max-h-[500px] overflow-y-auto" id="report-md-body">
        <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-6 md:p-8 shadow-inner max-w-3xl mx-auto leading-relaxed" id="report-paper-sheet">
          <div className="markdown-body">
            <Markdown>{report}</Markdown>
          </div>
        </div>
      </div>

      {/* Output footer telemetry info */}
      <div className="bg-zinc-950 px-6 py-3 flex items-center justify-between text-[9px] text-zinc-600 font-mono border-t border-zinc-900">
        <span>Format: GFM Markdown (GitHub Flavored)</span>
        <span>Compiler: writer_runtime_v2.4</span>
      </div>
    </div>
  );
}
