import React from 'react';
import {
  GripVertical,
  Lock,
  Wrench,
  Download,
  XCircle,
  Trash2,
  RotateCcw,
  Binoculars,
  Info,
  Play,
  ArrowUp,
  ArrowDown,
  Film,
  Music,
  Image as ImageIcon,
  FileText,
  Table,
  Archive,
  Code2,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Loader2,
  Ban,
  FileWarning,
  Activity,
} from 'lucide-react';
import { ConversionQueueItem } from '../types/conversion';
import { formatBytes } from '../data/formats';
import { FormatSelectorPopover } from './FormatSelectorPopover';
import { isLockedAboveUnfinishedStatus, isUnfinishedStatus } from '../utils/queueOrdering';
import { Tooltip, ResponsiveActionButton } from './Tooltip';

interface QueueItemRowProps {
  item: ConversionQueueItem;
  index: number;
  totalCount: number;
  firstUnfinishedIndex: number;
  isDragging: boolean;
  draggedItem: ConversionQueueItem | null;
  dragOverIndex: number | null;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
  onMoveItem: (fromIndex: number, toIndex: number) => void;
  onChangeTargetFormat: (itemId: string, newExt: string) => void;
  onOpenOptions: (item: ConversionQueueItem) => void;
  onOpenInfo: (item: ConversionQueueItem) => void;
  onRequestCancelItem: (item: ConversionQueueItem) => void;
  onRetryItem: (itemId: string) => void;
  onStartNowItem: (itemId: string) => void;
  onRequestDeleteItem: (item: ConversionQueueItem) => void;
  onDownloadItem: (item: ConversionQueueItem) => void;
  onPreviewItem: (item: ConversionQueueItem) => void;
  onDropdownOpenChange: (isOpen: boolean) => void;
}

export const QueueItemRow: React.FC<QueueItemRowProps> = ({
  item,
  index,
  totalCount,
  firstUnfinishedIndex,
  isDragging,
  draggedItem,
  dragOverIndex,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onMoveItem,
  onChangeTargetFormat,
  onOpenOptions,
  onOpenInfo,
  onRequestCancelItem,
  onRetryItem,
  onStartNowItem,
  onRequestDeleteItem,
  onDownloadItem,
  onPreviewItem,
  onDropdownOpenChange,
}) => {
  const isUnfinished = isUnfinishedStatus(item.status);
  const isLocked = isLockedAboveUnfinishedStatus(item.status);

  const isHoveredByDrag = dragOverIndex === index && draggedItem?.id !== item.id;
  const isIllegalHover =
    isHoveredByDrag &&
    draggedItem !== null &&
    ((isUnfinishedStatus(draggedItem.status) && isLocked) ||
      (isLockedAboveUnfinishedStatus(draggedItem.status) && isUnfinished));

  const isLegalHover = isHoveredByDrag && !isIllegalHover;

  const canMoveUp = isUnfinished && index > firstUnfinishedIndex;
  const canMoveDown = isUnfinished && index < totalCount - 1;

  const latestMbps =
    item.telemetry && item.telemetry.length > 0
      ? item.telemetry[item.telemetry.length - 1].mbps
      : item.avgMbps;

  const getCategoryIcon = () => {
    switch (item.sourceCategory) {
      case 'video':
        return <Film className="w-5 h-5 text-rose-500" />;
      case 'audio':
        return <Music className="w-5 h-5 text-amber-500" />;
      case 'image':
      case 'vector':
        return <ImageIcon className="w-5 h-5 text-emerald-500" />;
      case 'spreadsheet':
        return <Table className="w-5 h-5 text-cyan-600" />;
      case 'archive':
        return <Archive className="w-5 h-5 text-purple-500" />;
      case 'data':
        return <Code2 className="w-5 h-5 text-indigo-500" />;
      default:
        return <FileText className="w-5 h-5 text-blue-600" />;
    }
  };

  const renderStatusBadge = () => {
    switch (item.status) {
      case 'queued': {
        const waitingPos = index - firstUnfinishedIndex + 1;
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>WAIT / QUEUED #{waitingPos}</span>
          </span>
        );
      }
      case 'converting':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
            <span>CONVERTING ({item.progress}%)</span>
          </span>
        );
      case 'finished':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>FINISHED</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
            <Ban className="w-3.5 h-3.5 text-amber-600" />
            <span>CANCELLED</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
            <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
            <span>FAILED</span>
          </span>
        );
    }
  };

  return (
    <div
      draggable={true}
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={() => onDrop(index)}
      onDragEnd={onDragEnd}
      data-testid={`queue-item-${item.id}`}
      data-status={item.status}
      className={`group relative bg-white transition-all duration-150 border-b last:border-b-0 ${
        isDragging ? 'opacity-55 bg-slate-50 scale-[0.995]' : 'hover:bg-slate-50/70'
      } ${
        item.status === 'failed'
          ? 'bg-red-50/25 border-red-200'
          : isIllegalHover
          ? 'ring-2 ring-inset ring-red-500 bg-red-50/40'
          : isLegalHover
          ? 'ring-2 ring-inset ring-[#c83e37] bg-rose-50/30'
          : 'border-slate-200/90'
      }`}
    >
      {/* Illegal Drop Warning Banner when hovering an unfinished item over a locked item */}
      {isIllegalHover && (
        <div className="bg-red-600 text-white text-xs font-semibold px-4 py-1.5 flex items-center justify-between animate-in fade-in duration-100">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>
              Ordering Rule: An unfinished file cannot be placed above a{' '}
              {item.status === 'converting' ? 'currently converting' : item.status} file (
              {item.fileName}).
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-wider bg-black/25 px-2 py-0.5 rounded">
            Locked Position
          </span>
        </div>
      )}

      {/* Legal Drop Insertion Indicator */}
      {isLegalHover && (
        <div className="bg-[#c83e37] text-white text-[11px] font-semibold px-4 py-1 flex items-center gap-2">
          <span>Drop here to reorder in waiting queue (Position #{index + 1})</span>
        </div>
      )}

      <div className="px-3 sm:px-5 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
        {/* Left Section: Drag Handle + Position + File Info */}
        <div className="flex items-center gap-3 min-w-0 lg:w-[32%]">
          <div className="flex items-center gap-1 shrink-0">
            <Tooltip
              content={
                isUnfinished
                  ? 'Drag to reorder unfinished file in waiting queue'
                  : `Locked (${item.status}): Unfinished files cannot be placed above this item`
              }
            >
              <div
                className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${
                  isUnfinished
                    ? 'cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    : 'cursor-not-allowed text-slate-300 bg-slate-50'
                }`}
              >
                {isUnfinished ? (
                  <GripVertical className="w-4 h-4" />
                ) : (
                  <Lock className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </Tooltip>

            {/* Accessible Up/Down Reorder Controls for Unfinished Items */}
            {isUnfinished && (
              <div className="flex flex-col -space-y-0.5">
                <Tooltip
                  content={
                    canMoveUp
                      ? 'Move up in queue'
                      : index > 0
                      ? 'Cannot move unfinished file above finished/cancelled/failed/converting files'
                      : 'Already at top of queue'
                  }
                >
                  <button
                    type="button"
                    disabled={!canMoveUp}
                    onClick={() => onMoveItem(index, index - 1)}
                    aria-label="Move item up"
                    className={`p-0.5 rounded transition-colors ${
                      canMoveUp
                        ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200 cursor-pointer'
                        : 'text-slate-200 cursor-not-allowed'
                    }`}
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                </Tooltip>
                <Tooltip content={canMoveDown ? 'Move down in queue' : 'Already at bottom of queue'}>
                  <button
                    type="button"
                    disabled={!canMoveDown}
                    onClick={() => onMoveItem(index, index + 1)}
                    aria-label="Move item down"
                    className={`p-0.5 rounded transition-colors ${
                      canMoveDown
                        ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200 cursor-pointer'
                        : 'text-slate-200 cursor-not-allowed'
                    }`}
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </Tooltip>
              </div>
            )}
          </div>

          {/* File Type Icon */}
          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0">
            {getCategoryIcon()}
          </div>

          {/* File Name & Metadata */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span
                className="font-semibold text-sm text-slate-800 truncate"
                title={item.fileName}
              >
                {item.fileName}
              </span>
              {item.isCorrupted && (
                <Tooltip content="Corrupted source document" variant="error">
                  <FileWarning className="w-4 h-4 text-red-600 shrink-0" />
                </Tooltip>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500">
              <span className="px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 font-bold text-[10px] uppercase text-slate-600">
                .{item.sourceExt}
              </span>
              <span>•</span>
              <span>{formatBytes(item.fileSize)}</span>
              {item.status === 'finished' && item.convertedSize !== undefined && (
                <>
                  <span>→</span>
                  <span className="text-emerald-700 font-semibold">
                    {formatBytes(item.convertedSize)}
                  </span>
                </>
              )}
              {latestMbps !== undefined && latestMbps > 0 && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-0.5 text-blue-600 font-mono text-[11px] font-semibold">
                    <Activity className="w-3 h-3" />
                    {latestMbps.toFixed(1)} Mbps
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Middle-Left: Format Dropdown + Options Wrench + File Info Icon */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-slate-500 font-medium">convert to</span>
          <FormatSelectorPopover
            sourceExt={item.sourceExt}
            sourceCategory={item.sourceCategory}
            selectedExt={item.targetExt}
            onSelectFormat={(newExt) => onChangeTargetFormat(item.id, newExt)}
            onOpenChange={onDropdownOpenChange}
          />

          <ResponsiveActionButton
            icon={<Wrench className="w-3.5 h-3.5" />}
            label="Options"
            tooltipText="Conversion Options & Codec Settings"
            iconOnly={true}
            onClick={() => onOpenOptions(item)}
            className="p-2 rounded-md border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          />

          <ResponsiveActionButton
            icon={<Info className="w-4 h-4 text-blue-600" />}
            label="Info"
            tooltipText="File Information, Before/After Stats & Mbps Rate Graph"
            breakpoint={1280}
            onClick={() => onOpenInfo(item)}
            className="px-2.5 py-1.5 rounded-md border border-blue-200 bg-blue-50/60 hover:bg-blue-100/80 text-blue-800 text-xs font-bold"
          />
        </div>

        {/* Middle-Right: Progress Bar & Status Badge */}
        <div className="flex-1 min-w-[190px] lg:max-w-[280px]">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            {renderStatusBadge()}
            <span className="text-xs font-semibold text-slate-600 tabular-nums">
              {item.status === 'converting' || item.status === 'finished'
                ? `${item.progress}%`
                : item.status === 'cancelled'
                ? `Stopped at ${item.progress}%`
                : item.status === 'failed'
                ? `Failed at ${item.progress}%`
                : 'Ready'}
            </span>
          </div>

          {/* Progress Bar Track */}
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/80">
            <div
              className={`h-full transition-all duration-200 rounded-full ${
                item.status === 'finished'
                  ? 'bg-[#28a745]'
                  : item.status === 'converting'
                  ? 'bg-gradient-to-r from-[#c83e37] via-[#e0524a] to-blue-600'
                  : item.status === 'cancelled'
                  ? 'bg-amber-400'
                  : item.status === 'failed'
                  ? 'bg-red-500'
                  : 'bg-slate-300'
              }`}
              style={{
                width: `${
                  item.status === 'finished'
                    ? 100
                    : item.status === 'queued'
                    ? 0
                    : Math.max(4, item.progress)
                }%`,
              }}
            />
          </div>

          {/* Stage Sub-label / Error reason */}
          <div
            className={`text-[11px] mt-1 truncate ${
              item.status === 'failed'
                ? 'text-red-600 font-semibold'
                : item.status === 'cancelled'
                ? 'text-amber-700'
                : item.status === 'finished'
                ? 'text-emerald-700 font-medium'
                : 'text-slate-500'
            }`}
            title={item.errorMessage || item.stageLabel}
          >
            {item.status === 'failed'
              ? item.errorMessage || 'Conversion failed'
              : item.status === 'finished'
              ? `Ready: ${item.baseName}.${item.targetExt}`
              : item.stageLabel}
          </div>
        </div>

        {/* Right Section: Action Buttons (with Icons + Responsive Text + Tooltips) */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          {/* If Queued: Convert Now + Cancel */}
          {item.status === 'queued' && (
            <>
              <ResponsiveActionButton
                icon={<Play className="w-3.5 h-3.5 text-[#c83e37] fill-[#c83e37]" />}
                label="Convert"
                tooltipText="Start converting this file immediately"
                breakpoint={1150}
                onClick={() => onStartNowItem(item.id)}
                className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
              />
              <ResponsiveActionButton
                icon={<XCircle className="w-3.5 h-3.5 text-amber-600" />}
                label="Cancel"
                tooltipText="Cancel queued conversion (asks for confirmation)"
                breakpoint={1150}
                onClick={() => onRequestCancelItem(item)}
                className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"
              />
            </>
          )}

          {/* If Currently Converting: Cancel button (asks confirmation) */}
          {item.status === 'converting' && (
            <ResponsiveActionButton
              icon={<XCircle className="w-4 h-4 text-amber-600" />}
              label="Cancel"
              tooltipText="Cancel active conversion (asks for confirmation)"
              breakpoint={1150}
              onClick={() => onRequestCancelItem(item)}
              className="px-3 py-1.5 rounded-md text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs"
            />
          )}

          {/* If Finished: Binoculars Preview Button + CloudConvert Green Download Button */}
          {item.status === 'finished' && (
            <>
              <ResponsiveActionButton
                icon={<Binoculars className="w-4 h-4 text-[#c83e37]" />}
                label="Preview"
                tooltipText="Preview converted file before downloading"
                breakpoint={1150}
                onClick={() => onPreviewItem(item)}
                className="px-3 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-bold shadow-2xs"
              />
              <ResponsiveActionButton
                icon={<Download className="w-4 h-4" />}
                label="Download"
                tooltipText={`Download ${item.baseName}.${item.targetExt}`}
                breakpoint={1150}
                onClick={() => onDownloadItem(item)}
                className="px-3.5 py-2 rounded-md text-xs font-bold bg-[#28a745] hover:bg-[#218838] active:bg-[#1e7e34] text-white shadow-sm"
              />
            </>
          )}

          {/* If Cancelled: Retry Button */}
          {item.status === 'cancelled' && (
            <ResponsiveActionButton
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              label="Retry"
              tooltipText="Re-queue and convert this file"
              breakpoint={1150}
              onClick={() => onRetryItem(item.id)}
              className="px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300"
            />
          )}

          {/* If Failed: Allow Retry ONLY if the document is NOT corrupted */}
          {item.status === 'failed' && (
            <ResponsiveActionButton
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              label="Retry"
              tooltipText={
                item.isCorrupted
                  ? 'Cannot retry: Source document is corrupted'
                  : 'Document is not corrupted — click to retry conversion'
              }
              tooltipVariant={item.isCorrupted ? 'error' : 'default'}
              breakpoint={1150}
              disabled={Boolean(item.isCorrupted)}
              onClick={() => {
                if (!item.isCorrupted) onRetryItem(item.id);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold border ${
                item.isCorrupted
                  ? 'bg-slate-100 text-slate-400 border-slate-200'
                  : 'bg-red-600 hover:bg-red-700 text-white border-red-700 shadow-2xs'
              }`}
            />
          )}

          {/* Explicit Delete Button (asks confirmation before deleting!) */}
          <ResponsiveActionButton
            icon={<Trash2 className="w-4 h-4" />}
            label="Delete"
            tooltipText={`Delete ${item.fileName} from queue`}
            breakpoint={1360}
            onClick={() => onRequestDeleteItem(item)}
            className="p-2 rounded-md text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200"
          />
        </div>
      </div>

      {/* Tooltip-Style Error Callout Bubble Pointing Directly at the Failed File Entry */}
      {item.status === 'failed' && (
        <div className="px-4 sm:px-6 pb-3.5 pt-0.5">
          <div
            role="alert"
            className="relative bg-[#2a1215] text-red-50 border border-red-500/80 rounded-xl px-4 py-2.5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in slide-in-from-top-1 duration-150"
          >
            {/* Pointer Arrow pointing UP at the file entry */}
            <div className="absolute -top-2 left-10 w-3.5 h-3.5 rotate-45 bg-[#2a1215] border-l border-t border-red-500/80" />

            <div className="flex items-start sm:items-center gap-2.5 text-xs relative z-10">
              {item.isCorrupted ? (
                <FileWarning className="w-4 h-4 text-red-400 shrink-0 mt-0.5 sm:mt-0" />
              ) : (
                <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
              )}
              <div>
                <span className="font-bold text-red-200 mr-1.5">
                  {item.isCorrupted
                    ? 'Corrupted Document Error:'
                    : 'Conversion Failed (Document Intact):'}
                </span>
                <span className="text-red-100/95">
                  {item.errorMessage || 'An error occurred while converting this file.'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 relative z-10 self-end sm:self-center">
              <ResponsiveActionButton
                icon={<Info className="w-3.5 h-3.5" />}
                label="Error Details"
                tooltipText="Open file diagnostics & Mbps telemetry"
                breakpoint={640}
                onClick={() => onOpenInfo(item)}
                className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold border border-white/15"
              />
              {!item.isCorrupted ? (
                <ResponsiveActionButton
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                  label="Retry Conversion"
                  tooltipText="Document is not corrupted — click to retry conversion now"
                  breakpoint={640}
                  onClick={() => onRetryItem(item.id)}
                  className="px-3 py-1 rounded-md bg-[#c83e37] hover:bg-[#e0524a] text-white text-[11px] font-bold shadow-xs"
                />
              ) : (
                <span className="px-2.5 py-1 rounded-md bg-red-950/90 border border-red-700/70 text-red-300 text-[11px] font-semibold">
                  Corrupted — Cannot Retry
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
