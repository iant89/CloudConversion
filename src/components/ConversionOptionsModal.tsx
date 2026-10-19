import React, { useState } from 'react';
import { X, Wrench, Sliders, AlertTriangle, FileWarning, Check } from 'lucide-react';
import { ConversionOptions, ConversionQueueItem } from '../types/conversion';
import { ResponsiveActionButton } from './Tooltip';

interface ConversionOptionsModalProps {
  item: ConversionQueueItem;
  onClose: () => void;
  onSave: (itemId: string, updatedOptions: ConversionOptions) => void;
}

export const ConversionOptionsModal: React.FC<ConversionOptionsModalProps> = ({
  item,
  onClose,
  onSave,
}) => {
  const [opts, setOpts] = useState<ConversionOptions>({ ...item.options });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(item.id, opts);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#1b222c] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#c83e37] flex items-center justify-center">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                Conversion Options — .{item.sourceExt.toUpperCase()} to .{item.targetExt.toUpperCase()}
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-[320px]">{item.fileName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-sm">
          {item.targetCategory === 'video' && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Sliders className="w-3.5 h-3.5 text-[#c83e37]" />
                <span>Video & Audio Stream Settings</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Video Codec
                  </label>
                  <select
                    value={opts.videoCodec || 'h264'}
                    onChange={(e) =>
                      setOpts({
                        ...opts,
                        videoCodec: e.target.value as ConversionOptions['videoCodec'],
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium bg-white focus:outline-none focus:border-[#c83e37]"
                  >
                    <option value="h264">x264 (H.264 / AVC)</option>
                    <option value="h265">x265 (H.265 / HEVC)</option>
                    <option value="vp9">VP9 (WebM Video)</option>
                    <option value="av1">AV1 (AOMedia Video 1)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Resolution
                  </label>
                  <select
                    value={opts.videoResolution || 'original'}
                    onChange={(e) =>
                      setOpts({
                        ...opts,
                        videoResolution: e.target.value as ConversionOptions['videoResolution'],
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium bg-white focus:outline-none focus:border-[#c83e37]"
                  >
                    <option value="original">Keep Original Resolution</option>
                    <option value="3840x2160">3840 × 2160 (4K UHD)</option>
                    <option value="1920x1080">1920 × 1080 (1080p Full HD)</option>
                    <option value="1280x720">1280 × 720 (720p HD)</option>
                    <option value="854x480">854 × 480 (480p SD)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Constant Rate Factor (CRF: {opts.videoCrf ?? 23})
                  </label>
                  <input
                    type="range"
                    min={16}
                    max={32}
                    value={opts.videoCrf ?? 23}
                    onChange={(e) => setOpts({ ...opts, videoCrf: Number(e.target.value) })}
                    className="w-full accent-[#c83e37]"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>16 (Lossless quality)</span>
                    <span>23 (Balanced)</span>
                    <span>32 (Smallest size)</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Audio Bitrate
                  </label>
                  <select
                    value={opts.audioBitrate || '192k'}
                    onChange={(e) =>
                      setOpts({
                        ...opts,
                        audioBitrate: e.target.value as ConversionOptions['audioBitrate'],
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium bg-white focus:outline-none focus:border-[#c83e37]"
                  >
                    <option value="128k">128 kbps</option>
                    <option value="192k">192 kbps (Standard)</option>
                    <option value="256k">256 kbps (High)</option>
                    <option value="320k">320 kbps (Studio)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {item.targetCategory === 'audio' && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Sliders className="w-3.5 h-3.5 text-[#c83e37]" />
                <span>Audio Encoding Options</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Audio Bitrate
                  </label>
                  <select
                    value={opts.audioBitrate || '192k'}
                    onChange={(e) =>
                      setOpts({
                        ...opts,
                        audioBitrate: e.target.value as ConversionOptions['audioBitrate'],
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium bg-white focus:outline-none focus:border-[#c83e37]"
                  >
                    <option value="128k">128 kbps</option>
                    <option value="192k">192 kbps</option>
                    <option value="256k">256 kbps</option>
                    <option value="320k">320 kbps</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sample Rate
                  </label>
                  <select
                    value={opts.sampleRate || '44100'}
                    onChange={(e) =>
                      setOpts({
                        ...opts,
                        sampleRate: e.target.value as ConversionOptions['sampleRate'],
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium bg-white focus:outline-none focus:border-[#c83e37]"
                  >
                    <option value="44100">44100 Hz (CD Quality)</option>
                    <option value="48000">48000 Hz (Broadcast / DVD)</option>
                    <option value="96000">96000 Hz (Hi-Res Studio)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {(item.targetCategory === 'image' || item.targetCategory === 'vector') && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Sliders className="w-3.5 h-3.5 text-[#c83e37]" />
                <span>Image Raster & Quality Settings</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Compression Quality ({opts.imageQuality ?? 90}%)
                </label>
                <input
                  type="range"
                  min={20}
                  max={100}
                  value={opts.imageQuality ?? 90}
                  onChange={(e) => setOpts({ ...opts, imageQuality: Number(e.target.value) })}
                  className="w-full accent-[#c83e37]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Width (px, optional)
                  </label>
                  <input
                    type="number"
                    placeholder="Original"
                    value={opts.imageResizeWidth || ''}
                    onChange={(e) =>
                      setOpts({
                        ...opts,
                        imageResizeWidth: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Height (px, optional)
                  </label>
                  <input
                    type="number"
                    placeholder="Original"
                    value={opts.imageResizeHeight || ''}
                    onChange={(e) =>
                      setOpts({
                        ...opts,
                        imageResizeHeight: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {item.targetCategory !== 'video' &&
            item.targetCategory !== 'audio' &&
            item.targetCategory !== 'image' &&
            item.targetCategory !== 'vector' && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Sliders className="w-3.5 h-3.5 text-[#c83e37]" />
                  <span>Document & Page Layout Settings</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Page Size
                    </label>
                    <select
                      value={opts.pageSize || 'A4'}
                      onChange={(e) =>
                        setOpts({
                          ...opts,
                          pageSize: e.target.value as ConversionOptions['pageSize'],
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium bg-white"
                    >
                      <option value="A4">A4 (210 × 297 mm)</option>
                      <option value="Letter">US Letter (8.5 × 11 in)</option>
                      <option value="Legal">US Legal (8.5 × 14 in)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Orientation
                    </label>
                    <select
                      value={opts.pageOrientation || 'portrait'}
                      onChange={(e) =>
                        setOpts({
                          ...opts,
                          pageOrientation: e.target.value as ConversionOptions['pageOrientation'],
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium bg-white"
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

          {/* Queue Failure & Corruption Diagnostic Toggles */}
          <div className="pt-3 border-t border-slate-200 space-y-2.5">
            <label className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50/80 border border-amber-200/80 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(opts.simulateFailure)}
                onChange={(e) =>
                  setOpts({
                    ...opts,
                    simulateFailure: e.target.checked,
                    simulateCorrupted: e.target.checked ? false : opts.simulateCorrupted,
                  })
                }
                className="mt-0.5 rounded accent-[#c83e37]"
              />
              <div className="text-xs">
                <div className="font-semibold text-amber-900 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Simulate Transient Codec Failure (Document Intact — Retryable)</span>
                </div>
                <p className="text-amber-700/90 mt-0.5">
                  Triggers a tooltip-style error pointing at the file entry at ~50%, allowing you to retry since the document is not corrupted.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50/80 border border-red-200/80 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(opts.simulateCorrupted)}
                onChange={(e) =>
                  setOpts({
                    ...opts,
                    simulateCorrupted: e.target.checked,
                    simulateFailure: e.target.checked ? false : opts.simulateFailure,
                  })
                }
                className="mt-0.5 rounded accent-[#c83e37]"
              />
              <div className="text-xs">
                <div className="font-semibold text-red-900 flex items-center gap-1">
                  <FileWarning className="w-3.5 h-3.5 text-red-600" />
                  <span>Simulate Corrupted Document (Retry Disabled)</span>
                </div>
                <p className="text-red-700/90 mt-0.5">
                  Marks the source document as corrupted so conversion fails with a tooltip-style error and blocks retrying.
                </p>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <ResponsiveActionButton
              icon={<X className="w-3.5 h-3.5" />}
              label="Cancel"
              tooltipText="Discard changes"
              breakpoint={640}
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#c83e37] hover:bg-[#b2342d] text-white flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Options</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
