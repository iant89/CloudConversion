import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  History,
  Search,
  CheckCircle2,
  Trash2,
  ShieldAlert,
  AlertOctagon,
  Ban,
  Download,
  Clock,
  Play,
  RotateCcw,
  ArrowUpDown,
  SlidersHorizontal,
  ArrowDownUp,
  FileDown,
} from 'lucide-react';
import { HistoryActionType, HistoryLogEntry } from '../types/conversion';
import { ResponsiveActionButton } from './Tooltip';

export function formatHistoryTimestamp(ts: number): string {
  const d = new Date(ts);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = String(d.getFullYear()).slice(-2);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${month}/${day}/${year} ${hours}:${minutes} ${ampm}`;
}

export function createInitialHistoryEntries(): HistoryLogEntry[] {
  const baseDate = new Date(2026, 9, 19, 7, 0, 0).getTime(); // 10/19/26 7:00 AM
  return [
    {
      id: 'hist-seed-1',
      timestamp: baseDate,
      formattedDate: '10/19/26 7:00 AM',
      actionType: 'converted',
      message: "Successfully Converted 'pizza.jpeg' to 'pizza.png'",
      fileName: 'pizza.jpeg',
      targetFileName: 'pizza.png',
      details: 'Output size: 312.4 KB • Avg rate: 28.4 Mbps • Verified intact',
      clientIp: '198.51.100.42',
    },
    {
      id: 'hist-seed-2',
      timestamp: baseDate + 120000,
      formattedDate: '10/19/26 7:02 AM',
      actionType: 'downloaded',
      message: "Downloaded converted file 'pizza.png' (from 'pizza.jpeg')",
      fileName: 'pizza.jpeg',
      targetFileName: 'pizza.png',
      details: 'Downloaded locally (312.4 KB)',
      clientIp: '198.51.100.42',
    },
    {
      id: 'hist-seed-3',
      timestamp: baseDate + 300000,
      formattedDate: '10/19/26 7:05 AM',
      actionType: 'blocked',
      message: "Blocked File 'secret_draft_2026_payroll.docx'",
      fileName: 'secret_draft_2026_payroll.docx',
      clientIp: '198.51.100.42',
    },
    {
      id: 'hist-seed-4',
      timestamp: baseDate + 480000,
      formattedDate: '10/19/26 7:08 AM',
      actionType: 'blocked',
      message: "Blocked File 'quarantined_invoice_attachment.pdf'",
      fileName: 'quarantined_invoice_attachment.pdf',
      clientIp: '198.51.100.42',
    },
    {
      id: 'hist-seed-5',
      timestamp: baseDate + 660000,
      formattedDate: '10/19/26 7:11 AM',
      actionType: 'cancelled',
      message: "Cancelled conversion of 'raw_4k_stream.avi' to 'raw_4k_stream.mp4' at 44%",
      fileName: 'raw_4k_stream.avi',
      targetFileName: 'raw_4k_stream.mp4',
      details: 'Cancelled by user confirmation • Kept in queue until deleted',
      clientIp: '198.51.100.42',
    },
    {
      id: 'hist-seed-6',
      timestamp: baseDate + 840000,
      formattedDate: '10/19/26 7:14 AM',
      actionType: 'deleted',
      message: "Deleted 'old_backup_archive.zip' from conversion queue",
      fileName: 'old_backup_archive.zip',
      details: 'Removed permanently by user confirmation',
      clientIp: '198.51.100.42',
    },
  ];
}

type HistoryFilterCategory =
  | 'all'
  | 'converted'
  | 'deleted'
  | 'blocked'
  | 'failed-cancelled'
  | 'downloaded'
  | 'queue-ops';

interface HistoryModalProps {
  entries: HistoryLogEntry[];
  onClose: () => void;
  onClearHistory: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  entries,
  onClose,
  onClearHistory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<HistoryFilterCategory>('all');
  const [newestFirst, setNewestFirst] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const counts = useMemo(() => {
    return {
      all: entries.length,
      converted: entries.filter((e) => e.actionType === 'converted').length,
      deleted: entries.filter((e) => e.actionType === 'deleted').length,
      blocked: entries.filter((e) => e.actionType === 'blocked').length,
      failedCancelled: entries.filter(
        (e) => e.actionType === 'failed' || e.actionType === 'cancelled'
      ).length,
      downloaded: entries.filter((e) => e.actionType === 'downloaded').length,
      queueOps: entries.filter((e) =>
        ['queued', 'started', 'retried', 'reordered', 'format-changed', 'security-updated'].includes(
          e.actionType
        )
      ).length,
    };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = entries.filter((entry) => {
      if (activeFilter === 'converted' && entry.actionType !== 'converted') return false;
      if (activeFilter === 'deleted' && entry.actionType !== 'deleted') return false;
      if (activeFilter === 'blocked' && entry.actionType !== 'blocked') return false;
      if (
        activeFilter === 'failed-cancelled' &&
        entry.actionType !== 'failed' &&
        entry.actionType !== 'cancelled'
      ) {
        return false;
      }
      if (activeFilter === 'downloaded' && entry.actionType !== 'downloaded') return false;
      if (
        activeFilter === 'queue-ops' &&
        ![
          'queued',
          'started',
          'retried',
          'reordered',
          'format-changed',
          'security-updated',
        ].includes(entry.actionType)
      ) {
        return false;
      }

      if (!q) return true;
      const fullLine = `${entry.formattedDate}: ${entry.message}`.toLowerCase();
      return (
        fullLine.includes(q) ||
        entry.actionType.toLowerCase().includes(q) ||
        (entry.fileName && entry.fileName.toLowerCase().includes(q)) ||
        (entry.targetFileName && entry.targetFileName.toLowerCase().includes(q)) ||
        (entry.details && entry.details.toLowerCase().includes(q)) ||
        (entry.clientIp && entry.clientIp.toLowerCase().includes(q))
      );
    });

    return [...list].sort((a, b) =>
      newestFirst ? b.timestamp - a.timestamp : a.timestamp - b.timestamp
    );
  }, [entries, activeFilter, searchQuery, newestFirst]);

  const getJobCompletionIcon = (actionType: HistoryActionType) => {
    switch (actionType) {
      case 'converted':
        return (
          <div
            title="Job Completed Successfully"
            className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
        );
      case 'deleted':
        return (
          <div
            title="Deleted from Queue"
            className="w-9 h-9 rounded-xl bg-rose-100 border border-rose-300 flex items-center justify-center shrink-0"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
          </div>
        );
      case 'blocked':
        return (
          <div
            title="Blocked by Security / IP Policy"
            className="w-9 h-9 rounded-xl bg-red-100 border border-red-300 flex items-center justify-center shrink-0"
          >
            <ShieldAlert className="w-5 h-5 text-red-600" />
          </div>
        );
      case 'failed':
        return (
          <div
            title="Conversion Failed"
            className="w-9 h-9 rounded-xl bg-red-100 border border-red-300 flex items-center justify-center shrink-0"
          >
            <AlertOctagon className="w-5 h-5 text-red-600" />
          </div>
        );
      case 'cancelled':
        return (
          <div
            title="Conversion Cancelled"
            className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0"
          >
            <Ban className="w-4 h-4 text-amber-700" />
          </div>
        );
      case 'downloaded':
        return (
          <div
            title="Converted File Downloaded"
            className="w-9 h-9 rounded-xl bg-teal-100 border border-teal-300 flex items-center justify-center shrink-0"
          >
            <Download className="w-4 h-4 text-teal-700" />
          </div>
        );
      case 'started':
        return (
          <div
            title="Conversion Started"
            className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-300 flex items-center justify-center shrink-0"
          >
            <Play className="w-4 h-4 text-blue-600 fill-blue-600" />
          </div>
        );
      case 'retried':
        return (
          <div
            title="Job Retried"
            className="w-9 h-9 rounded-xl bg-indigo-100 border border-indigo-300 flex items-center justify-center shrink-0"
          >
            <RotateCcw className="w-4 h-4 text-indigo-600" />
          </div>
        );
      case 'reordered':
        return (
          <div
            title="Queue Order Updated"
            className="w-9 h-9 rounded-xl bg-purple-100 border border-purple-300 flex items-center justify-center shrink-0"
          >
            <ArrowUpDown className="w-4 h-4 text-purple-600" />
          </div>
        );
      case 'format-changed':
      case 'security-updated':
        return (
          <div
            title="Configuration Updated"
            className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4 text-slate-600" />
          </div>
        );
      default:
        return (
          <div
            title="Added to Queue"
            className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center shrink-0"
          >
            <Clock className="w-4 h-4 text-slate-600" />
          </div>
        );
    }
  };

  const getBadgeStyle = (actionType: HistoryActionType) => {
    switch (actionType) {
      case 'converted':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'deleted':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'blocked':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'cancelled':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'downloaded':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cloudconversion-history-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Action and Conversion History Modal"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="bg-[#1b222c] text-white px-5 py-4 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#c83e37] flex items-center justify-center shrink-0 shadow-sm">
              <History className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <span>Conversion & Activity History Log</span>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs font-bold text-slate-200">
                  {entries.length} events
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Complete chronological timeline of conversions, downloads, deletions, blocked files, and queue actions
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close history modal"
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Filter Bar at the Top */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 space-y-3 shrink-0">
          {/* Search Input + Sort / Export Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search history (e.g. pizza.jpeg, Successfully Converted, Deleted, Blocked, 10/19/26)..."
                aria-label="Search history log"
                className="w-full pl-10 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#c83e37] shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs px-1 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <ResponsiveActionButton
                icon={<ArrowDownUp className="w-3.5 h-3.5 text-[#c83e37]" />}
                label={newestFirst ? 'Newest First' : 'Oldest First'}
                tooltipText="Toggle chronological sort order"
                breakpoint={640}
                onClick={() => setNewestFirst((p) => !p)}
                className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700"
              />
              <ResponsiveActionButton
                icon={<FileDown className="w-3.5 h-3.5 text-slate-600" />}
                label="Export JSON"
                tooltipText="Download history log as JSON"
                breakpoint={768}
                onClick={handleExportJson}
                className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700"
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'all', label: `All (${counts.all})` },
                { id: 'converted', label: `Converted (${counts.converted})` },
                { id: 'deleted', label: `Deletions (${counts.deleted})` },
                { id: 'blocked', label: `Blocked (${counts.blocked})` },
                { id: 'failed-cancelled', label: `Failed / Cancelled (${counts.failedCancelled})` },
                { id: 'downloaded', label: `Downloads (${counts.downloaded})` },
                { id: 'queue-ops', label: `Queue Activity (${counts.queueOps})` },
              ] as { id: HistoryFilterCategory; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeFilter === tab.id
                    ? 'bg-[#c83e37] text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* History Entries List */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-slate-100/60 space-y-2.5">
          {filteredEntries.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
              <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="font-bold text-sm text-slate-700">No matching history entries</div>
              <p className="text-xs text-slate-400 mt-1">
                Try clearing your search filter or perform an action in the converter queue.
              </p>
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="bg-white rounded-xl border border-slate-200/90 hover:border-slate-300 p-3.5 shadow-2xs flex items-start gap-3.5 transition-all"
              >
                {/* Job Completion / Action Icon */}
                {getJobCompletionIcon(entry.actionType)}

                {/* Main Formatted Log Text & Metadata */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs sm:text-sm text-slate-900 leading-snug">
                      <span className="font-mono font-bold text-slate-600 mr-1.5">
                        {entry.formattedDate}:
                      </span>
                      <span className="font-semibold">{entry.message}</span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border shrink-0 ${getBadgeStyle(
                        entry.actionType
                      )}`}
                    >
                      {entry.actionType}
                    </span>
                  </div>

                  {(entry.actionType !== 'blocked' && entry.details) || entry.clientIp ? (
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                      {entry.actionType !== 'blocked' && entry.details && (
                        <span>{entry.details}</span>
                      )}
                      {entry.clientIp && (
                        <>
                          {entry.actionType !== 'blocked' && entry.details && <span>•</span>}
                          <span className="font-mono text-slate-400">IP: {entry.clientIp}</span>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="bg-white px-5 py-3.5 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            Showing <strong className="text-slate-800">{filteredEntries.length}</strong> of{' '}
            <strong className="text-slate-800">{entries.length}</strong> recorded events
          </div>

          <div className="flex items-center gap-2">
            {entries.length > 0 && (
              <ResponsiveActionButton
                icon={<Trash2 className="w-3.5 h-3.5 text-red-600" />}
                label="Clear History"
                tooltipText="Clear all recorded history entries"
                breakpoint={640}
                onClick={onClearHistory}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200"
              />
            )}
            <ResponsiveActionButton
              icon={<X className="w-4 h-4" />}
              label="Close"
              tooltipText="Close history dialog"
              breakpoint={640}
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-[#1b222c] hover:bg-slate-800 text-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
