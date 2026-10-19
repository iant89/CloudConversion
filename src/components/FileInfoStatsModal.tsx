import React, { useEffect, useState } from 'react';
import {
  X,
  Info,
  Activity,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Loader2,
  Ban,
  ArrowRight,
  Download,
  Binoculars,
  RotateCcw,
  FileWarning,
  ShieldCheck,
  Gauge,
  Zap,
  HardDrive,
  Hash,
} from 'lucide-react';
import { ConversionQueueItem, TelemetryPoint } from '../types/conversion';
import { formatBytes, getFormatDefinition, CATEGORY_LABELS } from '../data/formats';
import { ResponsiveActionButton } from './Tooltip';

interface FileInfoStatsModalProps {
  item: ConversionQueueItem;
  onClose: () => void;
  onPreview: (item: ConversionQueueItem) => void;
  onDownload: (item: ConversionQueueItem) => void;
  onRetry: (itemId: string) => void;
  onBlockSha256?: (sha256: string, fileName: string) => void;
}

export const FileInfoStatsModal: React.FC<FileInfoStatsModalProps> = ({
  item,
  onClose,
  onPreview,
  onDownload,
  onRetry,
  onBlockSha256,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<TelemetryPoint | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const sourceDef = getFormatDefinition(item.sourceExt);
  const targetDef = getFormatDefinition(item.targetExt);

  const telemetry = item.telemetry || [];
  const mbpsValues = telemetry.map((t) => t.mbps);
  const avgMbps =
    item.avgMbps ??
    (mbpsValues.length > 0
      ? Number((mbpsValues.reduce((a, b) => a + b, 0) / mbpsValues.length).toFixed(2))
      : 0);
  const peakMbps =
    item.peakMbps ??
    (mbpsValues.length > 0 ? Number(Math.max(...mbpsValues).toFixed(2)) : 0);
  const latestMbps =
    mbpsValues.length > 0 ? Number(mbpsValues[mbpsValues.length - 1].toFixed(2)) : 0;

  const durationMs =
    item.startedAt && item.completedAt
      ? item.completedAt - item.startedAt
      : item.startedAt
      ? Date.now() - item.startedAt
      : telemetry.length > 0
      ? telemetry[telemetry.length - 1].elapsedMs
      : 0;

  const sizeDeltaPct =
    item.convertedSize && item.fileSize > 0
      ? (((item.convertedSize - item.fileSize) / item.fileSize) * 100).toFixed(1)
      : null;

  // SVG Chart dimensions & coordinates
  const chartW = 640;
  const chartH = 175;
  const padLeft = 46;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 28;
  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  const maxMbpsScale = Math.max(40, Math.ceil((peakMbps || 35) / 10) * 10);

  const pointsCoord = telemetry.map((pt, idx) => {
    const xRatio =
      telemetry.length > 1 ? idx / Math.max(1, telemetry.length - 1) : pt.progress / 100;
    const x = padLeft + xRatio * plotW;
    const y = padTop + plotH - Math.min(1, pt.mbps / maxMbpsScale) * plotH;
    return { x, y, pt };
  });

  const linePath =
    pointsCoord.length > 0
      ? pointsCoord
          .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
          .join(' ')
      : '';

  const areaPath =
    pointsCoord.length > 0
      ? `${linePath} L ${pointsCoord[pointsCoord.length - 1].x.toFixed(1)} ${(
          padTop + plotH
        ).toFixed(1)} L ${pointsCoord[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
      : '';

  const renderStatusPill = () => {
    switch (item.status) {
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-slate-100 text-slate-700 border border-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Queued / Waiting</span>
          </span>
        );
      case 'converting':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
            <span>Converting ({item.progress}%)</span>
          </span>
        );
      case 'finished':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Finished (100%)</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
            <Ban className="w-3.5 h-3.5 text-amber-600" />
            <span>Cancelled at {item.progress}%</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-red-50 text-red-700 border border-red-200">
            <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
            <span>Failed at {item.progress}%</span>
          </span>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`File Information and Statistics for ${item.fileName}`}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#1b222c] text-white px-5 py-4 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
              <Info className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base truncate">
                File Information & Conversion Telemetry
              </h3>
              <p className="text-xs text-slate-400 truncate mt-0.5">{item.fileName}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close file statistics modal"
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 bg-slate-50 flex-1">
          {/* 1. Current Status & Integrity Overview */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Current Queue Status & Stage
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                {renderStatusPill()}
                <span className="text-xs text-slate-600 font-medium">{item.stageLabel}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Document Integrity Badge */}
              {item.isCorrupted ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                  <FileWarning className="w-4 h-4 text-red-600" />
                  <span>Corrupted Document</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Document Intact (Valid)</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Error Diagnostic Alert (Shown if conversion failed or had an error) */}
          {(item.status === 'failed' || item.errorMessage) && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertOctagon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-red-900">
                      Conversion Error Diagnostic Report
                    </h4>
                    <p className="text-xs text-red-800 mt-0.5 leading-relaxed">
                      {item.errorMessage || 'An unexpected error occurred during conversion.'}
                    </p>
                  </div>
                </div>

                {!item.isCorrupted ? (
                  <ResponsiveActionButton
                    icon={<RotateCcw className="w-3.5 h-3.5" />}
                    label="Retry Conversion"
                    tooltipText="Source document is intact — click to retry conversion"
                    breakpoint={640}
                    onClick={() => {
                      onRetry(item.id);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shrink-0 shadow-xs"
                  />
                ) : (
                  <span className="px-2.5 py-1 rounded bg-red-200/80 text-red-900 text-[11px] font-bold shrink-0">
                    Retry Blocked (Corrupted File)
                  </span>
                )}
              </div>

              <div className="text-[11px] text-red-700/90 bg-white/70 px-3 py-2 rounded-lg border border-red-200/70">
                {item.isCorrupted
                  ? 'Diagnostic: The uploaded source document has corrupted headers or 0-byte payload. Please upload a valid source file.'
                  : 'Diagnostic: The source document passed integrity checks and is NOT corrupted. You can safely retry the conversion.'}
              </div>
            </div>
          )}

          {/* 3. Conversion Rate on a Mbps Graph */}
          <div className="bg-[#151b23] text-white rounded-xl p-4 sm:p-5 border border-slate-800 shadow-md space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#e0524a]" />
                <h4 className="font-bold text-xs sm:text-sm tracking-wide">
                  Conversion Rate Telemetry (Mbps Graph)
                </h4>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {telemetry.length} samples recorded • Elapsed:{' '}
                {(durationMs / 1000).toFixed(2)}s
              </span>
            </div>

            {/* 4 Telemetry KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-[#1e2632] border border-slate-700/80 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-blue-400" />
                  <span>Average Rate</span>
                </div>
                <div className="text-base sm:text-lg font-extrabold text-white mt-0.5 font-mono">
                  {avgMbps.toFixed(1)} <span className="text-xs font-normal text-slate-400">Mbps</span>
                </div>
              </div>

              <div className="bg-[#1e2632] border border-slate-700/80 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Peak Rate</span>
                </div>
                <div className="text-base sm:text-lg font-extrabold text-emerald-400 mt-0.5 font-mono">
                  {peakMbps.toFixed(1)} <span className="text-xs font-normal text-slate-400">Mbps</span>
                </div>
              </div>

              <div className="bg-[#1e2632] border border-slate-700/80 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-rose-400" />
                  <span>Latest Rate</span>
                </div>
                <div className="text-base sm:text-lg font-extrabold text-rose-300 mt-0.5 font-mono">
                  {latestMbps.toFixed(1)}{' '}
                  <span className="text-xs font-normal text-slate-400">Mbps</span>
                </div>
              </div>

              <div className="bg-[#1e2632] border border-slate-700/80 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <HardDrive className="w-3 h-3 text-cyan-400" />
                  <span>Processed</span>
                </div>
                <div className="text-base sm:text-lg font-extrabold text-cyan-300 mt-0.5 font-mono">
                  {formatBytes(Math.round((item.fileSize * item.progress) / 100))}
                </div>
              </div>
            </div>

            {/* SVG Mbps Line & Area Chart */}
            <div className="relative bg-[#0f141b] rounded-xl border border-slate-800 p-2">
              <svg
                viewBox={`0 0 ${chartW} ${chartH}`}
                className="w-full h-44 overflow-visible"
                role="img"
                aria-label="Conversion Rate Mbps Graph"
              >
                <defs>
                  <linearGradient id="mbpsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e0524a" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#e0524a" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* Horizontal Y-Axis Gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                  const y = padTop + plotH - ratio * plotH;
                  const val = Math.round(ratio * maxMbpsScale);
                  return (
                    <g key={ratio}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={chartW - padRight}
                        y2={y}
                        stroke="#1e293b"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      <text
                        x={padLeft - 8}
                        y={y + 4}
                        textAnchor="end"
                        fill="#64748b"
                        fontSize="10"
                        fontFamily="monospace"
                      >
                        {val} Mbps
                      </text>
                    </g>
                  );
                })}

                {/* X-Axis Labels */}
                {[0, 25, 50, 75, 100].map((pct) => {
                  const x = padLeft + (pct / 100) * plotW;
                  return (
                    <text
                      key={pct}
                      x={x}
                      y={chartH - 6}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {pct}%
                    </text>
                  );
                })}

                {/* Area & Line Path */}
                {pointsCoord.length > 0 && (
                  <>
                    <path d={areaPath} fill="url(#mbpsAreaGrad)" />
                    <path
                      d={linePath}
                      fill="none"
                      stroke="#e0524a"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {pointsCoord.map((c, idx) => (
                      <circle
                        key={idx}
                        cx={c.x}
                        cy={c.y}
                        r={hoveredPoint?.step === c.pt.step ? 5 : 3}
                        fill={hoveredPoint?.step === c.pt.step ? '#ffffff' : '#e0524a'}
                        stroke="#0f141b"
                        strokeWidth="1.5"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredPoint(c.pt)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    ))}
                  </>
                )}

                {pointsCoord.length === 0 && (
                  <text
                    x={chartW / 2}
                    y={chartH / 2}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="12"
                  >
                    Waiting for conversion stream to start recording Mbps telemetry...
                  </text>
                )}
              </svg>

              {/* Hovered Point Tooltip Overlay */}
              {hoveredPoint && (
                <div className="mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] flex items-center justify-between text-slate-200">
                  <span>
                    Progress: <strong>{hoveredPoint.progress}%</strong> ({hoveredPoint.stage})
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {hoveredPoint.mbps.toFixed(2)} Mbps @ {(hoveredPoint.elapsedMs / 1000).toFixed(2)}s
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 4. Before & After Conversion Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Before Conversion Card */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Before Conversion (Source)
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-white font-bold text-xs uppercase">
                  .{sourceDef.label}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Source File Name:</span>
                  <strong className="text-slate-800 truncate max-w-[200px]" title={item.fileName}>
                    {item.fileName}
                  </strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Category:</span>
                  <strong className="text-slate-800">{CATEGORY_LABELS[item.sourceCategory]}</strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">MIME Type:</span>
                  <code className="text-slate-700 font-mono text-[11px]">{sourceDef.mimeType}</code>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Original Size:</span>
                  <strong className="text-slate-800">
                    {formatBytes(item.fileSize)} ({item.fileSize.toLocaleString()} B)
                  </strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Document Integrity:</span>
                  <strong className={item.isCorrupted ? 'text-red-600' : 'text-emerald-700'}>
                    {item.isCorrupted ? 'Corrupted Header / Stream' : 'Verified Intact'}
                  </strong>
                </div>
                {item.sha256 && (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Hash className="w-3 h-3 text-[#c83e37]" />
                        <span>SHA-256 Digest:</span>
                      </span>
                      {onBlockSha256 && (
                        <button
                          type="button"
                          onClick={() => onBlockSha256(item.sha256!, item.fileName)}
                          className="px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold cursor-pointer"
                        >
                          Block SHA-256 Hash
                        </button>
                      )}
                    </div>
                    <code className="block font-mono text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200 break-all">
                      {item.sha256}
                    </code>
                  </div>
                )}
              </div>
            </div>

            {/* After Conversion Card */}
            <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                  <span>After Conversion (Output)</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-[#c83e37] text-white font-bold text-xs uppercase">
                  .{targetDef.label}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Output File Name:</span>
                  <strong
                    className="text-slate-800 truncate max-w-[200px]"
                    title={item.convertedFileName || `${item.baseName}.${item.targetExt}`}
                  >
                    {item.convertedFileName || `${item.baseName}.${item.targetExt}`}
                  </strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Target Category:</span>
                  <strong className="text-slate-800">{CATEGORY_LABELS[item.targetCategory]}</strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Target MIME Type:</span>
                  <code className="text-slate-700 font-mono text-[11px]">{targetDef.mimeType}</code>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Converted Size:</span>
                  <strong className="text-emerald-700">
                    {item.convertedSize !== undefined
                      ? `${formatBytes(item.convertedSize)} (${item.convertedSize.toLocaleString()} B)`
                      : item.status === 'converting'
                      ? 'Encoding in progress...'
                      : 'Pending conversion'}
                  </strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Size Ratio Delta:</span>
                  <strong className="text-slate-800">
                    {sizeDeltaPct !== null
                      ? `${Number(sizeDeltaPct) > 0 ? '+' : ''}${sizeDeltaPct}% vs. original`
                      : 'N/A'}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-white px-5 py-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">.{item.sourceExt.toUpperCase()}</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-[#c83e37]">.{item.targetExt.toUpperCase()}</span>
          </div>

          <div className="flex items-center gap-2">
            {item.status === 'finished' && (
              <>
                <ResponsiveActionButton
                  icon={<Binoculars className="w-4 h-4 text-[#c83e37]" />}
                  label="Preview Output"
                  tooltipText="Preview converted file before downloading"
                  breakpoint={640}
                  onClick={() => {
                    onClose();
                    onPreview(item);
                  }}
                  className="px-3.5 py-2 rounded-lg text-xs font-bold border border-slate-300 bg-white hover:bg-slate-100 text-slate-700"
                />
                <ResponsiveActionButton
                  icon={<Download className="w-4 h-4" />}
                  label={`Download .${item.targetExt.toUpperCase()}`}
                  tooltipText={`Download ${item.baseName}.${item.targetExt}`}
                  breakpoint={640}
                  onClick={() => onDownload(item)}
                  className="px-3.5 py-2 rounded-lg text-xs font-bold bg-[#28a745] hover:bg-[#218838] text-white shadow-sm"
                />
              </>
            )}

            <ResponsiveActionButton
              icon={<X className="w-4 h-4" />}
              label="Close"
              tooltipText="Close file statistics dialog"
              breakpoint={640}
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
