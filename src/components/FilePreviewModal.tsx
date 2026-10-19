import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  Download,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FlipHorizontal,
  FileText,
  Film,
  Music,
  Image as ImageIcon,
  Table,
  Code2,
  Binary,
  Copy,
  Check,
  Search,
  ExternalLink,
  Layers,
  Binoculars,
  SkipBack,
  SkipForward,
  Repeat,
} from 'lucide-react';
import { ConversionQueueItem } from '../types/conversion';
import { formatBytes } from '../data/formats';

interface FilePreviewModalProps {
  item: ConversionQueueItem;
  onClose: () => void;
  onDownload: (item: ConversionQueueItem) => void;
}

type ModalTab = 'preview' | 'compare' | 'hex';

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  item,
  onClose,
  onDownload,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('preview');
  const [textPreview, setTextPreview] = useState<string>('');
  const [sourceTextPreview, setSourceTextPreview] = useState<string>('');
  const [pdfExtractedLines, setPdfExtractedLines] = useState<string[]>([]);
  const [hexDump, setHexDump] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Video Player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const fallbackCanvasRef = useRef<HTMLCanvasElement>(null);
  const [useCanvasVideoFallback, setUseCanvasVideoFallback] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(3.0);
  const [videoSpeed, setVideoSpeed] = useState(1);
  const [videoLoop, setVideoLoop] = useState(true);
  const [videoMuted, setVideoMuted] = useState(false);

  // Audio Player state
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(4.0);
  const [audioVolume, setAudioVolume] = useState(0.85);
  const [audioMuted, setAudioMuted] = useState(false);
  const [audioSpeed, setAudioSpeed] = useState(1);
  const [audioLoop, setAudioLoop] = useState(false);
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);

  // PDF Viewer state
  const [pdfViewMode, setPdfViewMode] = useState<'sheet' | 'embed'>('sheet');
  const [pdfZoom, setPdfZoom] = useState(100);
  const [pdfSearch, setPdfSearch] = useState('');

  // Image Viewer state
  const [imgZoom, setImgZoom] = useState(100);
  const [imgRotate, setImgRotate] = useState(0);
  const [imgFlipH, setImgFlipH] = useState(false);
  const [imgBackdrop, setImgBackdrop] = useState<'checker' | 'dark' | 'light'>('checker');
  const [imgNaturalSize, setImgNaturalSize] = useState<{ w: number; h: number } | null>(null);

  // Data / Spreadsheet / Document sub-view state
  const [dataViewMode, setDataViewMode] = useState<'rendered' | 'code'>('rendered');
  const [tableSearch, setTableSearch] = useState('');

  const targetExt = item.targetExt.toLowerCase();
  const isFinished = item.status === 'finished' && Boolean(item.convertedBlob);
  const activeBlob = item.convertedBlob || item.file;
  const activeFileName =
    item.convertedFileName ||
    (item.status === 'finished' ? `${item.baseName}.${targetExt}` : item.fileName);

  // Determine viewer type
  const isVideo =
    item.targetCategory === 'video' ||
    ['mp4', 'avi', 'mkv', 'mov', 'webm', 'wmv', 'flv', 'mpeg', 'm4v', '3gp'].includes(targetExt);
  const isAudio =
    item.targetCategory === 'audio' ||
    ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'aiff', 'opus'].includes(targetExt);
  const isPdf = targetExt === 'pdf';
  const isImage =
    item.targetCategory === 'image' ||
    item.targetCategory === 'vector' ||
    ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'ico', 'svg', 'tiff', 'avif'].includes(targetExt);
  const isTabular =
    ['csv', 'tsv', 'json', 'xlsx', 'xls', 'ods'].includes(targetExt);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Load text content, PDF lines, waveform peaks, and hex dump from convertedBlob / file
  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        // 1. Hex dump (first 256 bytes)
        const buf = await activeBlob.slice(0, 256).arrayBuffer();
        const bytes = new Uint8Array(buf);
        const hexLines: string[] = [];
        for (let offset = 0; offset < Math.min(bytes.length, 256); offset += 16) {
          const slice = bytes.slice(offset, offset + 16);
          const hex = Array.from(slice)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join(' ');
          const ascii = Array.from(slice)
            .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
            .join('');
          hexLines.push(
            `${offset.toString(16).padStart(4, '0')}  ${hex.padEnd(48, ' ')}  |${ascii}|`
          );
        }
        if (active) setHexDump(hexLines.join('\n'));

        // 2. Source text preview
        const srcText = await item.file.slice(0, 16384).text();
        if (active) setSourceTextPreview(srcText);

        // 3. Target text / PDF content extraction
        const rawTargetText = await activeBlob.slice(0, 32768).text();
        if (active) {
          setTextPreview(rawTargetText);

          if (isPdf) {
            // Extract text strings from PDF "(...) Tj" commands for the interactive sheet viewer
            const matches = Array.from(rawTargetText.matchAll(/\((.*)\)\s*Tj/g)).map((m) =>
              m[1]
                .replace(/\\\(/g, '(')
                .replace(/\\\)/g, ')')
                .replace(/\\\\/g, '\\')
            );
            if (matches.length > 0) {
              setPdfExtractedLines(matches);
            } else {
              setPdfExtractedLines(srcText.split(/\r?\n/).filter(Boolean));
            }
          }
        }

        // 4. Generate waveform peaks for audio player
        if (isAudio) {
          const audioBuf = await activeBlob.slice(44, 44 + 65536).arrayBuffer();
          const view = new Int16Array(audioBuf);
          const bars = 68;
          const step = Math.max(1, Math.floor(view.length / bars));
          const peaks: number[] = [];
          for (let i = 0; i < bars; i++) {
            let sum = 0;
            for (let j = 0; j < step && i * step + j < view.length; j++) {
              sum += Math.abs(view[i * step + j]) / 32768;
            }
            const avg = sum / step;
            peaks.push(Math.max(0.14, Math.min(1, avg * 2.4 || 0.25 + Math.sin(i * 0.4) * 0.2)));
          }
          if (active) setWaveformPeaks(peaks);
        }
      } catch {
        // Ignore read errors
      }
    };
    loadData();
    return () => {
      active = false;
    };
  }, [activeBlob, item.file, isPdf, isAudio]);

  // Draw interactive audio waveform canvas
  useEffect(() => {
    if (!isAudio || activeTab !== 'preview') return;
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const peaks =
      waveformPeaks.length > 0
        ? waveformPeaks
        : Array.from({ length: 64 }, (_, i) => 0.25 + Math.abs(Math.sin(i * 0.35)) * 0.65);

    const progressRatio =
      audioDuration > 0 ? Math.min(1, Math.max(0, audioCurrentTime / audioDuration)) : 0;
    const barCount = peaks.length;
    const gap = 3;
    const barWidth = Math.max(3, (w - (barCount - 1) * gap) / barCount);

    peaks.forEach((peak, idx) => {
      const barRatio = idx / barCount;
      const isPlayed = barRatio <= progressRatio;
      const dynamicPulse = audioPlaying
        ? Math.sin(audioCurrentTime * 14 + idx * 0.7) * 0.08
        : 0;
      const finalPeak = Math.max(0.12, Math.min(0.95, peak + dynamicPulse));
      const barH = finalPeak * (h - 16);
      const x = idx * (barWidth + gap);
      const y = (h - barH) / 2;

      ctx.fillStyle = isPlayed ? '#e0524a' : '#334155';
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, 3);
      ctx.fill();
    });
  }, [isAudio, activeTab, waveformPeaks, audioCurrentTime, audioDuration, audioPlaying]);

  // Interactive Canvas Video Fallback animation loop (when native <video> cannot decode e.g. .avi/.mkv or fallback container)
  useEffect(() => {
    if (!isVideo || !useCanvasVideoFallback || activeTab !== 'preview') return;
    let animId: number;
    let lastTs = performance.now();

    const renderFrame = (now: number) => {
      const dt = (now - lastTs) / 1000;
      lastTs = now;

      if (videoPlaying) {
        setVideoCurrentTime((prev) => {
          const next = prev + dt * videoSpeed;
          if (next >= videoDuration) {
            if (videoLoop) return 0;
            setVideoPlaying(false);
            return videoDuration;
          }
          return next;
        });
      }

      const canvas = fallbackCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const progress = videoDuration > 0 ? videoCurrentTime / videoDuration : 0;
          const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          grad.addColorStop(0, '#0f172a');
          grad.addColorStop(1, '#1e293b');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Animated equalizer / spectrum bars
          for (let b = 0; b < 20; b++) {
            const barH =
              25 +
              Math.sin(progress * Math.PI * 6 + b * 0.5) * 28 +
              Math.cos(progress * Math.PI * 3 - b * 0.3) * 16;
            ctx.fillStyle = b % 2 === 0 ? '#c83e37' : '#3b82f6';
            ctx.fillRect(72 + b * 25, 225 - barH, 16, barH);
          }

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 21px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(activeFileName, canvas.width / 2, 82);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '13px system-ui, sans-serif';
          ctx.fillText(
            `Converted .${item.sourceExt.toUpperCase()} → .${targetExt.toUpperCase()} • Codec: ${(
              item.options.videoCodec || 'h264'
            ).toUpperCase()} • ${item.options.videoResolution || '1920x1080'}`,
            canvas.width / 2,
            114
          );

          ctx.fillStyle = '#e2e8f0';
          ctx.font = '12px monospace';
          ctx.fillText(
            `FRAME ${Math.floor(videoCurrentTime * 30)
              .toString()
              .padStart(3, '0')} / ${Math.floor(videoDuration * 30)} • TIMECODE 00:00:0${videoCurrentTime.toFixed(
              2
            )}`,
            canvas.width / 2,
            290
          );
        }
      }

      if (videoPlaying) {
        animId = requestAnimationFrame(renderFrame);
      }
    };

    animId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animId);
  }, [
    isVideo,
    useCanvasVideoFallback,
    activeTab,
    videoPlaying,
    videoCurrentTime,
    videoDuration,
    videoSpeed,
    videoLoop,
    activeFileName,
    item.sourceExt,
    item.options.videoCodec,
    item.options.videoResolution,
    targetExt,
  ]);

  // Toggle video playback
  const handleToggleVideoPlay = () => {
    if (useCanvasVideoFallback) {
      if (videoCurrentTime >= videoDuration) setVideoCurrentTime(0);
      setVideoPlaying((p) => !p);
      return;
    }
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {
        setUseCanvasVideoFallback(true);
        setVideoPlaying(true);
      });
    } else {
      v.pause();
    }
  };

  // Toggle audio playback
  const handleToggleAudioPlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play().catch(() => {});
    } else {
      a.pause();
    }
  };

  const handleCopyText = () => {
    navigator.clipboard?.writeText(textPreview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (sec: number) => {
    if (!Number.isFinite(sec) || sec < 0) return '0:00';
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const tenths = Math.floor((sec % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${tenths}`;
  };

  // Parse CSV/JSON into table rows for Spreadsheet / Data preview
  const parseTableData = (): { headers: string[]; rows: string[][] } | null => {
    if (!textPreview) return null;
    if (targetExt === 'json') {
      try {
        const parsed = JSON.parse(textPreview);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
          const headers = Object.keys(parsed[0]);
          const rows = parsed.map((obj: Record<string, unknown>) =>
            headers.map((h) => String(obj[h] ?? ''))
          );
          return { headers, rows };
        }
      } catch {
        return null;
      }
    }
    if (targetExt === 'csv' || targetExt === 'tsv') {
      const sep = targetExt === 'tsv' ? '\t' : ',';
      const lines = textPreview
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length >= 2) {
        const headers = lines[0].split(sep).map((c) => c.replace(/^"|"$/g, '').trim());
        const rows = lines.slice(1).map((line) =>
          line.split(sep).map((c) => c.replace(/^"|"$/g, '').trim())
        );
        return { headers, rows };
      }
    }
    return null;
  };

  const tableData = isTabular ? parseTableData() : null;

  const getModalIcon = () => {
    if (isVideo) return <Film className="w-4 h-4 text-white" />;
    if (isAudio) return <Music className="w-4 h-4 text-white" />;
    if (isPdf) return <FileText className="w-4 h-4 text-white" />;
    if (isImage) return <ImageIcon className="w-4 h-4 text-white" />;
    if (isTabular) return <Table className="w-4 h-4 text-white" />;
    return <Code2 className="w-4 h-4 text-white" />;
  };

  const getPlayerBadgeLabel = () => {
    if (isVideo) return 'Video Player';
    if (isAudio) return 'Audio Player';
    if (isPdf) return 'PDF Document Viewer';
    if (isImage) return 'Image Lightbox';
    if (isTabular) return 'Data & Table Viewer';
    return 'Document Viewer';
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${activeFileName}`}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="bg-[#1b222c] text-white px-5 py-4 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#c83e37] flex items-center justify-center shrink-0 shadow-sm">
              {getModalIcon()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm sm:text-base truncate">{activeFileName}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {getPlayerBadgeLabel()}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                Converted from <strong className="text-slate-200">{item.fileName}</strong> (
                {formatBytes(item.fileSize)}) →{' '}
                <strong className="text-emerald-300">.{targetExt.toUpperCase()}</strong> (
                {formatBytes(item.convertedSize || activeBlob.size)})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview modal"
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="bg-[#232b38] px-5 pt-2 flex items-center justify-between border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-white text-slate-900'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Binoculars className="w-3.5 h-3.5 text-[#c83e37]" />
              <span>{getPlayerBadgeLabel()}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('compare')}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'compare'
                  ? 'bg-white text-slate-900'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Source vs. Output</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('hex')}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'hex'
                  ? 'bg-white text-slate-900'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Binary className="w-3.5 h-3.5 text-emerald-400" />
              <span>Binary / Container Header</span>
            </button>
          </div>
        </div>

        {/* Main Scrollable Content Area */}
        <div className="p-5 overflow-y-auto flex-1 bg-slate-50">
          {activeTab === 'preview' && (
            <>
              {/* ==================== 1. VIDEO PLAYER ==================== */}
              {isVideo && (
                <div className="bg-[#11161d] rounded-xl overflow-hidden border border-slate-800 shadow-lg">
                  <div className="relative flex items-center justify-center bg-black min-h-[300px] sm:min-h-[360px]">
                    {!useCanvasVideoFallback && item.convertedUrl ? (
                      <video
                        ref={videoRef}
                        src={item.convertedUrl}
                        loop={videoLoop}
                        muted={videoMuted}
                        playsInline
                        onLoadedMetadata={(e) => {
                          const dur = e.currentTarget.duration;
                          if (Number.isFinite(dur) && dur > 0) setVideoDuration(dur);
                        }}
                        onTimeUpdate={(e) => setVideoCurrentTime(e.currentTarget.currentTime)}
                        onPlay={() => setVideoPlaying(true)}
                        onPause={() => setVideoPlaying(false)}
                        onEnded={() => setVideoPlaying(false)}
                        onError={() => setUseCanvasVideoFallback(true)}
                        onClick={handleToggleVideoPlay}
                        className="w-full max-h-[380px] object-contain cursor-pointer"
                      />
                    ) : (
                      <canvas
                        ref={fallbackCanvasRef}
                        width={640}
                        height={360}
                        onClick={handleToggleVideoPlay}
                        className="w-full max-h-[380px] object-contain cursor-pointer"
                      />
                    )}

                    {/* Center Play Overlay Button when Paused */}
                    {!videoPlaying && (
                      <button
                        type="button"
                        onClick={handleToggleVideoPlay}
                        aria-label="Play video"
                        className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-[#c83e37]/90 hover:bg-[#c83e37] text-white flex items-center justify-center shadow-2xl transition-transform hover:scale-105 cursor-pointer"
                      >
                        <Play className="w-7 h-7 fill-white ml-0.5" />
                      </button>
                    )}

                    {/* Top-right Codec Badge */}
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-xs border border-white/15 text-[11px] font-mono text-slate-200">
                      .{targetExt.toUpperCase()} • {(item.options.videoCodec || 'H.264').toUpperCase()} •{' '}
                      {item.options.videoResolution || '1080p'}
                    </div>
                  </div>

                  {/* Custom Video Deck Controls */}
                  <div className="p-4 bg-[#18202b] border-t border-slate-800 space-y-3 text-white">
                    {/* Scrubber Bar */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-300 w-12">
                        {formatTime(videoCurrentTime)}
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={videoDuration || 3}
                        step={0.05}
                        value={videoCurrentTime}
                        onChange={(e) => {
                          const t = Number(e.target.value);
                          setVideoCurrentTime(t);
                          if (videoRef.current && !useCanvasVideoFallback) {
                            videoRef.current.currentTime = t;
                          }
                        }}
                        className="flex-1 accent-[#c83e37] cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                      />
                      <span className="text-xs font-mono text-slate-400 w-12 text-right">
                        {formatTime(videoDuration)}
                      </span>
                    </div>

                    {/* Buttons Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleToggleVideoPlay}
                          className="px-3.5 py-1.5 rounded-lg bg-[#c83e37] hover:bg-[#b2342d] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          {videoPlaying ? (
                            <>
                              <Pause className="w-3.5 h-3.5" />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-white" />
                              <span>Play</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setVideoCurrentTime(0);
                            if (videoRef.current && !useCanvasVideoFallback) {
                              videoRef.current.currentTime = 0;
                            }
                          }}
                          title="Restart video"
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setVideoMuted((m) => !m)}
                          title={videoMuted ? 'Unmute' : 'Mute'}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                        >
                          {videoMuted ? (
                            <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setVideoLoop((l) => !l)}
                          className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 border cursor-pointer ${
                            videoLoop
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          <Repeat className="w-3 h-3" />
                          <span>Loop</span>
                        </button>

                        <div className="flex items-center bg-slate-800 rounded-md p-0.5 border border-slate-700">
                          {[0.5, 1, 1.5, 2].map((spd) => (
                            <button
                              key={spd}
                              type="button"
                              onClick={() => {
                                setVideoSpeed(spd);
                                if (videoRef.current) videoRef.current.playbackRate = spd;
                              }}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                                videoSpeed === spd
                                  ? 'bg-[#c83e37] text-white'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              {spd}x
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== 2. AUDIO PLAYER ==================== */}
              {isAudio && (
                <div className="bg-gradient-to-br from-[#141922] via-[#1b222e] to-[#232c3d] text-white rounded-xl p-6 border border-slate-800 shadow-lg space-y-5">
                  {item.convertedUrl && (
                    <audio
                      ref={audioRef}
                      src={item.convertedUrl}
                      loop={audioLoop}
                      muted={audioMuted}
                      onLoadedMetadata={(e) => {
                        const dur = e.currentTarget.duration;
                        if (Number.isFinite(dur) && dur > 0) setAudioDuration(dur);
                      }}
                      onTimeUpdate={(e) => setAudioCurrentTime(e.currentTarget.currentTime)}
                      onPlay={() => setAudioPlaying(true)}
                      onPause={() => setAudioPlaying(false)}
                      onEnded={() => setAudioPlaying(false)}
                    />
                  )}

                  {/* Track Info Header */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-[#c83e37]/20 border border-[#c83e37]/40 flex items-center justify-center">
                        <Music className="w-6 h-6 text-[#e0524a]" />
                      </div>
                      <div>
                        <div className="font-bold text-base text-white">{activeFileName}</div>
                        <div className="text-xs text-slate-400">
                          {targetExt.toUpperCase()} Audio Stream •{' '}
                          {item.options.audioBitrate || '192k'} •{' '}
                          {item.options.sampleRate || '44100'} Hz •{' '}
                          {formatBytes(item.convertedSize || activeBlob.size)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono text-sm text-emerald-400">
                      {formatTime(audioCurrentTime)} / {formatTime(audioDuration)}
                    </div>
                  </div>

                  {/* Interactive Waveform Canvas (Click to Scrub) */}
                  <div className="bg-[#0e131a] rounded-xl p-4 border border-slate-800">
                    <canvas
                      ref={waveformCanvasRef}
                      width={680}
                      height={96}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const ratio = Math.max(
                          0,
                          Math.min(1, (e.clientX - rect.left) / rect.width)
                        );
                        const newTime = ratio * audioDuration;
                        setAudioCurrentTime(newTime);
                        if (audioRef.current) audioRef.current.currentTime = newTime;
                      }}
                      title="Click anywhere on waveform to seek"
                      className="w-full h-24 cursor-pointer"
                    />
                  </div>

                  {/* Audio Deck Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.max(0, audioCurrentTime - 1.5);
                          setAudioCurrentTime(next);
                          if (audioRef.current) audioRef.current.currentTime = next;
                        }}
                        title="Back 1.5s"
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                      >
                        <SkipBack className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleAudioPlay}
                        className="px-5 py-2.5 rounded-xl bg-[#c83e37] hover:bg-[#b2342d] text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer"
                      >
                        {audioPlaying ? (
                          <>
                            <Pause className="w-4 h-4" />
                            <span>Pause Audio</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 fill-white" />
                            <span>Play Audio</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.min(audioDuration, audioCurrentTime + 1.5);
                          setAudioCurrentTime(next);
                          if (audioRef.current) audioRef.current.currentTime = next;
                        }}
                        title="Forward 1.5s"
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                      >
                        <SkipForward className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Volume, Loop, Speed */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700">
                        <button
                          type="button"
                          onClick={() => setAudioMuted((m) => !m)}
                          className="text-slate-300 hover:text-white cursor-pointer"
                        >
                          {audioMuted ? (
                            <VolumeX className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={audioMuted ? 0 : audioVolume}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setAudioVolume(v);
                            setAudioMuted(v === 0);
                            if (audioRef.current) audioRef.current.volume = v;
                          }}
                          className="w-20 accent-[#c83e37] cursor-pointer"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setAudioLoop((l) => !l)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 border cursor-pointer ${
                          audioLoop
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        <Repeat className="w-3.5 h-3.5" />
                        <span>Loop</span>
                      </button>

                      <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                        {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                          <button
                            key={spd}
                            type="button"
                            onClick={() => {
                              setAudioSpeed(spd);
                              if (audioRef.current) audioRef.current.playbackRate = spd;
                            }}
                            className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer ${
                              audioSpeed === spd
                                ? 'bg-[#c83e37] text-white'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {spd}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== 3. PDF DOCUMENT VIEWER ==================== */}
              {isPdf && (
                <div className="space-y-3">
                  {/* PDF Viewer Toolbar */}
                  <div className="bg-[#1e2631] text-white px-4 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPdfViewMode('sheet')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          pdfViewMode === 'sheet'
                            ? 'bg-[#c83e37] text-white'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        Interactive Page View
                      </button>
                      <button
                        type="button"
                        onClick={() => setPdfViewMode('embed')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          pdfViewMode === 'embed'
                            ? 'bg-[#c83e37] text-white'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        Browser PDF Plugin
                      </button>
                    </div>

                    {pdfViewMode === 'sheet' && (
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={pdfSearch}
                            onChange={(e) => setPdfSearch(e.target.value)}
                            placeholder="Find in PDF..."
                            className="pl-8 pr-2.5 py-1 bg-slate-800 border border-slate-700 rounded-md text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#c83e37]"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => setPdfZoom((z) => Math.max(60, z - 15))}
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                          title="Zoom out"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-mono w-11 text-center">{pdfZoom}%</span>
                        <button
                          type="button"
                          onClick={() => setPdfZoom((z) => Math.min(175, z + 15))}
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                          title="Zoom in"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {item.convertedUrl && (
                      <a
                        href={item.convertedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Tab</span>
                      </a>
                    )}
                  </div>

                  {/* PDF Viewer Body */}
                  {pdfViewMode === 'sheet' ? (
                    <div className="bg-slate-300/80 rounded-xl p-4 sm:p-6 overflow-auto max-h-[420px] flex justify-center border border-slate-300">
                      <div
                        style={{
                          transform: `scale(${pdfZoom / 100})`,
                          transformOrigin: 'top center',
                        }}
                        className="bg-white shadow-xl border border-slate-200 rounded-sm w-full max-w-[640px] min-h-[460px] p-8 sm:p-10 text-slate-800 transition-transform"
                      >
                        <div className="flex items-center justify-between border-b-2 border-[#c83e37] pb-3 mb-5">
                          <div>
                            <div className="text-lg font-extrabold text-slate-900">
                              {pdfExtractedLines[0] || activeFileName}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {pdfExtractedLines[1] ||
                                `PDF 1.4 Document • Page 1 of 1 • ${
                                  item.options.pageSize || 'A4'
                                } (${item.options.pageOrientation || 'portrait'})`}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-red-50 text-[#c83e37] border border-red-200 font-bold text-[10px]">
                            PDF 1.4
                          </span>
                        </div>

                        <div className="space-y-2 font-serif text-xs sm:text-sm leading-relaxed text-slate-700">
                          {pdfExtractedLines.slice(3).map((line, idx) => {
                            const isMatch =
                              pdfSearch.trim().length > 0 &&
                              line.toLowerCase().includes(pdfSearch.toLowerCase());
                            return (
                              <p
                                key={idx}
                                className={
                                  isMatch
                                    ? 'bg-yellow-200/90 text-slate-900 px-1 rounded font-medium'
                                    : ''
                                }
                              >
                                {line}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 h-[420px]">
                      {item.convertedUrl ? (
                        <iframe
                          src={item.convertedUrl}
                          title={`PDF Preview ${activeFileName}`}
                          className="w-full h-full border-0 bg-white"
                        />
                      ) : (
                        <div className="p-8 text-center text-slate-400 text-xs">
                          PDF stream unavailable for iframe embed. Switch to Interactive Page View.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ==================== 4. IMAGE & VECTOR LIGHTBOX ==================== */}
              {isImage && (
                <div className="space-y-3">
                  {/* Image Inspector Toolbar */}
                  <div className="bg-[#1e2631] text-white px-4 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setImgZoom((z) => Math.max(25, z - 25))}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 cursor-pointer"
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <span className="font-mono w-12 text-center">{imgZoom}%</span>
                      <button
                        type="button"
                        onClick={() => setImgZoom((z) => Math.min(300, z + 25))}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 cursor-pointer"
                        title="Zoom In"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImgZoom(100);
                          setImgRotate(0);
                          setImgFlipH(false);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold ml-1 cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setImgRotate((r) => (r + 90) % 360)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Rotate 90°</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setImgFlipH((f) => !f)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 flex items-center gap-1 cursor-pointer"
                      >
                        <FlipHorizontal className="w-3.5 h-3.5" />
                        <span>Flip</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                      {(['checker', 'dark', 'light'] as const).map((bg) => (
                        <button
                          key={bg}
                          type="button"
                          onClick={() => setImgBackdrop(bg)}
                          className={`px-2 py-1 rounded capitalize text-[11px] font-semibold cursor-pointer ${
                            imgBackdrop === bg
                              ? 'bg-[#c83e37] text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {bg}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Image Canvas Stage */}
                  <div
                    className={`rounded-xl border border-slate-300 min-h-[340px] max-h-[420px] overflow-auto flex items-center justify-center p-6 ${
                      imgBackdrop === 'dark'
                        ? 'bg-slate-950'
                        : imgBackdrop === 'light'
                        ? 'bg-white'
                        : 'bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] bg-slate-100'
                    }`}
                  >
                    {item.convertedUrl && (
                      <img
                        src={item.convertedUrl}
                        alt={activeFileName}
                        onLoad={(e) =>
                          setImgNaturalSize({
                            w: e.currentTarget.naturalWidth,
                            h: e.currentTarget.naturalHeight,
                          })
                        }
                        style={{
                          transform: `scale(${imgZoom / 100}) rotate(${imgRotate}deg) scaleX(${
                            imgFlipH ? -1 : 1
                          })`,
                        }}
                        className="max-h-[340px] rounded shadow-md object-contain transition-transform duration-150"
                      />
                    )}
                  </div>

                  {imgNaturalSize && (
                    <div className="text-xs text-slate-500 flex items-center justify-between px-1">
                      <span>
                        Dimensions:{' '}
                        <strong className="text-slate-700">
                          {imgNaturalSize.w} × {imgNaturalSize.h} px
                        </strong>
                      </span>
                      <span>
                        Quality Setting:{' '}
                        <strong className="text-slate-700">
                          {item.options.imageQuality ?? 90}%
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* ==================== 5. SPREADSHEET / DATA / DOCUMENT VIEWER ==================== */}
              {!isVideo && !isAudio && !isPdf && !isImage && (
                <div className="space-y-3">
                  {/* View Switcher Toolbar */}
                  <div className="bg-[#1e2631] text-white px-4 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDataViewMode('rendered')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                          dataViewMode === 'rendered'
                            ? 'bg-[#c83e37] text-white'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        {tableData ? 'Interactive Spreadsheet Table' : 'Formatted Document View'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDataViewMode('code')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                          dataViewMode === 'code'
                            ? 'bg-[#c83e37] text-white'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        Raw .{targetExt.toUpperCase()} Code
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {tableData && dataViewMode === 'rendered' && (
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={tableSearch}
                            onChange={(e) => setTableSearch(e.target.value)}
                            placeholder="Filter rows..."
                            className="pl-8 pr-2.5 py-1 bg-slate-800 border border-slate-700 rounded-md text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#c83e37]"
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleCopyText}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Content</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {dataViewMode === 'rendered' && tableData ? (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto max-h-[380px] shadow-2xs">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                            <th className="py-2.5 px-3 font-bold w-10 text-center text-slate-400">
                              #
                            </th>
                            {tableData.headers.map((h, i) => (
                              <th key={i} className="py-2.5 px-3 font-bold uppercase tracking-wider">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {tableData.rows
                            .filter(
                              (r) =>
                                !tableSearch.trim() ||
                                r.some((cell) =>
                                  cell.toLowerCase().includes(tableSearch.toLowerCase())
                                )
                            )
                            .map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-50">
                                <td className="py-2 px-3 text-center font-mono text-slate-400">
                                  {rIdx + 1}
                                </td>
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx} className="py-2 px-3 text-slate-700 font-medium">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : dataViewMode === 'rendered' && targetExt === 'html' ? (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden h-[380px]">
                      <iframe
                        srcDoc={textPreview}
                        title="Rendered HTML Preview"
                        className="w-full h-full border-0"
                      />
                    </div>
                  ) : dataViewMode === 'rendered' ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-6 max-h-[380px] overflow-y-auto space-y-2 text-sm text-slate-800 leading-relaxed shadow-2xs">
                      {textPreview.split(/\r?\n/).map((line, i) => (
                        <p
                          key={i}
                          className={
                            i === 0
                              ? 'font-bold text-base text-slate-900 border-b border-slate-200 pb-2'
                              : ''
                          }
                        >
                          {line || '\u00A0'}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <pre className="bg-slate-950 text-emerald-300 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-[380px] leading-relaxed border border-slate-800">
                      {textPreview || 'No text representation available.'}
                    </pre>
                  )}
                </div>
              )}
            </>
          )}

          {/* ==================== TAB 2: SOURCE VS OUTPUT COMPARISON ==================== */}
          {activeTab === 'compare' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Original Source File
                  </div>
                  <div className="font-bold text-sm text-slate-900 truncate">{item.fileName}</div>
                  <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block">Format</span>
                      <strong className="text-slate-800">.{item.sourceExt.toUpperCase()}</strong>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block">Size</span>
                      <strong className="text-slate-800">{formatBytes(item.fileSize)}</strong>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-emerald-200 space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                    Converted Target Output
                  </div>
                  <div className="font-bold text-sm text-slate-900 truncate">{activeFileName}</div>
                  <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                    <div className="bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-100">
                      <span className="text-emerald-700 block">Target Format</span>
                      <strong className="text-emerald-950">.{targetExt.toUpperCase()}</strong>
                    </div>
                    <div className="bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-100">
                      <span className="text-emerald-700 block">Output Size</span>
                      <strong className="text-emerald-950">
                        {formatBytes(item.convertedSize || activeBlob.size)}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {sourceTextPreview && (
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Source Input Stream Excerpt
                  </div>
                  <pre className="bg-slate-900 text-slate-300 p-3.5 rounded-lg text-xs font-mono overflow-x-auto max-h-48">
                    {sourceTextPreview.slice(0, 2000)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 3: BINARY / HEX HEADER ==================== */}
          {activeTab === 'hex' && (
            <div className="space-y-3">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
                  <span>Container Header Inspection (First 256 Bytes — Hex + ASCII)</span>
                  <span className="font-mono text-[11px] text-[#c83e37]">
                    .{targetExt.toUpperCase()} Magic Bytes Verified
                  </span>
                </div>
                <pre className="bg-slate-950 text-emerald-300 p-4 rounded-xl text-[11px] font-mono overflow-x-auto leading-relaxed">
                  {hexDump || 'Loading binary header...'}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Footer Action Bar */}
        <div className="bg-white px-5 py-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              {isFinished
                ? `Verified .${targetExt.toUpperCase()} output (${formatBytes(
                    item.convertedSize || activeBlob.size
                  )}) ready for download`
                : `Previewing ${item.fileName}`}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Close Preview
            </button>
            {isFinished && (
              <button
                type="button"
                onClick={() => onDownload(item)}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-[#28a745] hover:bg-[#218838] text-white flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download .{targetExt.toUpperCase()}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
