import React from 'react';
import {
  Cloud,
  RefreshCw,
  Layers,
  CheckCircle2,
  FileCode2,
  ShieldCheck,
  ShieldAlert,
  Globe,
  History,
} from 'lucide-react';
import { ResponsiveActionButton } from './Tooltip';

export type ActiveAppTab = 'converter' | 'security' | 'formats' | 'rules';

interface NavbarProps {
  activeTab: ActiveAppTab;
  onSelectTab: (tab: ActiveAppTab) => void;
  onOpenHistory: () => void;
  totalCount: number;
  convertingCount: number;
  queuedCount: number;
  finishedCount: number;
  blockedCount: number;
  historyCount: number;
  clientIp: string;
  isIpBlocked: boolean;
  conversionsRemaining: number;
  maxConversionsPerWindow: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenHistory,
  totalCount,
  convertingCount,
  queuedCount,
  finishedCount,
  blockedCount,
  historyCount,
  clientIp,
  isIpBlocked,
  conversionsRemaining,
  maxConversionsPerWindow,
}) => {
  return (
    <header className="bg-[#151b23] border-b border-slate-800 text-slate-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-4 lg:gap-6">
          <button
            type="button"
            onClick={() => onSelectTab('converter')}
            className="flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-[#c83e37] group-hover:bg-[#d94841] transition-colors flex items-center justify-center shadow-md shadow-red-950/40 relative">
              <Cloud className="w-5 h-5 text-white fill-white/15" />
              <RefreshCw className="w-3 h-3 text-white absolute -bottom-0.5 -right-0.5 bg-[#151b23] rounded-full p-0.5" />
            </div>
            <div>
              <div className="font-bold text-lg tracking-tight text-white flex items-center gap-1">
                <span>cloud</span>
                <span className="text-[#e0524a]">conversion</span>
              </div>
              <div className="text-[10px] text-slate-400 -mt-1 tracking-wider uppercase">
                Universal File Transcoder
              </div>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-xs lg:text-sm">
            <button
              type="button"
              onClick={() => onSelectTab('converter')}
              className={`px-3 py-2 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'converter'
                  ? 'bg-slate-800/90 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Layers className="w-4 h-4 text-[#e0524a]" />
              <span>File Converter</span>
              {totalCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 text-xs rounded-full bg-[#c83e37] text-white font-semibold">
                  {totalCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('security')}
              className={`px-3 py-2 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'security'
                  ? 'bg-slate-800/90 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Security & Blocking</span>
              {blockedCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 text-xs rounded-full bg-red-600 text-white font-semibold">
                  {blockedCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('formats')}
              className={`px-3 py-2 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'formats'
                  ? 'bg-slate-800/90 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <FileCode2 className="w-4 h-4 text-slate-400" />
              <span>Formats (65+)</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('rules')}
              className={`px-3 py-2 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'rules'
                  ? 'bg-slate-800/90 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Queue Rules</span>
            </button>
          </nav>
        </div>

        {/* Right Telemetry: History Modal Button + IP & Quota Status + Queue Status */}
        <div className="flex items-center gap-2 text-xs">
          <ResponsiveActionButton
            icon={<History className="w-4 h-4 text-[#e0524a]" />}
            label={`History (${historyCount})`}
            tooltipText="Open Action & Conversion History Log Modal"
            tooltipPosition="bottom"
            breakpoint={900}
            onClick={onOpenHistory}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold border border-slate-700"
          />

          <button
            type="button"
            onClick={() => onSelectTab('security')}
            title="Click to configure IP blocking & rate limits"
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-mono text-[11px] transition-colors cursor-pointer ${
              isIpBlocked
                ? 'bg-red-500/20 border-red-500/40 text-red-300'
                : conversionsRemaining === 0
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-[#e0524a]" />
            <span>{clientIp}</span>
            <span className="text-slate-500">|</span>
            <span>
              Quota: {conversionsRemaining}/{maxConversionsPerWindow}
            </span>
          </button>

          {convertingCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 font-medium">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
              <span className="hidden lg:inline">Converting:</span>
              <span>{convertingCount}</span>
            </div>
          )}
          {queuedCount > 0 && (
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Queued: {queuedCount}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline">Finished:</span>
            <span>{finishedCount}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
