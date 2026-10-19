import React, { useRef, useState } from 'react';
import {
  FolderPlus,
  ChevronDown,
  UploadCloud,
  Sparkles,
  FilePlus2,
  Film,
  FileText,
  Music,
  Image as ImageIcon,
  Table,
  Layers,
} from 'lucide-react';
import { SAMPLE_PRESETS, SamplePreset } from '../utils/sampleFiles';

interface HeroDropzoneProps {
  onFilesAdded: (files: File[]) => void;
  onLoadDemoBatch: () => void;
  activeConversionPair?: { source: string; target: string } | null;
}

export const HeroDropzone: React.FC<HeroDropzoneProps> = ({
  onFilesAdded,
  onLoadDemoBatch,
  activeConversionPair,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCustomFileModal, setShowCustomFileModal] = useState(false);
  const [customFileName, setCustomFileName] = useState('cinema_clip_raw.avi');
  const [customFileContent, setCustomFileContent] = useState(
    'Sample document or stream payload for CloudConversion testing.'
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesAdded(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesAdded(Array.from(e.dataTransfer.files));
    }
  };

  const handleCreateCustomFile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = customFileName.trim() || 'sample_document.avi';
    const file = new File([customFileContent], cleanName, {
      type: 'application/octet-stream',
    });
    onFilesAdded([file]);
    setShowCustomFileModal(false);
  };

  const getPresetIcon = (cat: string) => {
    switch (cat) {
      case 'video':
        return <Film className="w-3.5 h-3.5 text-rose-400" />;
      case 'audio':
        return <Music className="w-3.5 h-3.5 text-amber-400" />;
      case 'image':
        return <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />;
      case 'spreadsheet':
        return <Table className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  return (
    <section
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className="bg-gradient-to-b from-[#1b222c] via-[#1f2733] to-[#232c3a] text-white border-b border-slate-800 relative overflow-hidden"
    >
      {/* Subtle Decorative Grid Glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 25%, rgba(200, 62, 55, 0.35), transparent 45%), radial-gradient(circle at 80% 70%, rgba(59, 130, 246, 0.2), transparent 45%)',
        }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left Hero Copy */}
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300 mb-3">
              <span className="w-2 h-2 rounded-full bg-[#e0524a]" />
              <span>200+ Format Pairs • Auto-Convert Queue • Local Instant Download</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {activeConversionPair
                ? `${activeConversionPair.source.toUpperCase()} to ${activeConversionPair.target.toUpperCase()} Converter`
                : 'File Converter'}
            </h1>
            <p className="text-slate-300 text-sm sm:text-base mt-2 leading-relaxed">
              CloudConversion converts your documents, videos, audio tracks, images, and spreadsheets automatically. Upload any file (e.g.,{' '}
              <code className="text-rose-300 font-semibold">.AVI → .MP4</code>,{' '}
              <code className="text-rose-300 font-semibold">.DOCX → .PDF</code>,{' '}
              <code className="text-rose-300 font-semibold">.WAV → .MP3</code>), reorder your queue, customize codecs, and download immediately.
            </p>
          </div>

          {/* Right Format Pair Pill Display (CloudConvert signature visual) */}
          <div className="flex items-center gap-2.5 bg-[#151b23]/90 border border-slate-700/80 px-4 py-3 rounded-xl self-start lg:self-center shadow-lg">
            <span className="text-xs text-slate-400 font-medium">convert</span>
            <span className="px-3 py-1.5 rounded-md bg-[#252f3d] border border-slate-600 text-xs font-bold uppercase tracking-wider text-white">
              {activeConversionPair ? activeConversionPair.source : 'ANY FILE'}
            </span>
            <span className="text-xs text-slate-400 font-medium">to</span>
            <span className="px-3 py-1.5 rounded-md bg-[#c83e37] text-xs font-bold uppercase tracking-wider text-white shadow-xs">
              {activeConversionPair ? activeConversionPair.target : 'ANY FORMAT'}
            </span>
          </div>
        </div>

        {/* Central CloudConvert Select File Action Area + Dropzone */}
        <div
          className={`mt-7 rounded-2xl border-2 border-dashed transition-all p-6 sm:p-8 text-center ${
            isDragOver
              ? 'border-[#e0524a] bg-[#c83e37]/15 scale-[1.005]'
              : 'border-slate-600/80 bg-[#161c24]/75 hover:border-slate-500'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
            aria-label="Upload files to convert"
          />

          <div className="flex flex-col items-center justify-center">
            {/* Iconic CloudConvert Red Split Button */}
            <div className="relative inline-flex rounded-lg shadow-xl shadow-black/30">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className=" inline-flex items-center gap-3 px-7 py-4 bg-[#c83e37] hover:bg-[#b5352e] active:bg-[#9f2e28] text-white font-bold text-base sm:text-lg rounded-l-lg transition-colors cursor-pointer"
              >
                <FolderPlus className="w-5 h-5" />
                <span>Select File</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDropdown((prev) => !prev)}
                aria-label="More file upload options"
                className="px-3.5 py-4 bg-[#ad332d] hover:bg-[#992b26] text-white rounded-r-lg border-l border-red-900/50 flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronDown className="w-5 h-5" />
              </button>

              {showDropdown && (
                <div
                  className="absolute left-0 top-full mt-2 w-72 bg-[#1e2631] border border-slate-700 rounded-xl shadow-2xl py-1.5 z-40 text-left text-xs"
                  onMouseLeave={() => setShowDropdown(false)}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowDropdown(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full px-4 py-2.5 hover:bg-slate-800 flex items-center gap-2.5 text-slate-100 font-medium"
                  >
                    <UploadCloud className="w-4 h-4 text-[#e0524a]" />
                    <span>From my Computer (Any File)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDropdown(false);
                      onLoadDemoBatch();
                    }}
                    className="w-full px-4 py-2.5 hover:bg-slate-800 flex items-center gap-2.5 text-slate-100 font-medium"
                  >
                    <Layers className="w-4 h-4 text-amber-400" />
                    <span>Load 5-File Demo Queue Batch</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDropdown(false);
                      setShowCustomFileModal(true);
                    }}
                    className="w-full px-4 py-2.5 hover:bg-slate-800 flex items-center gap-2.5 text-slate-100 font-medium"
                  >
                    <FilePlus2 className="w-4 h-4 text-emerald-400" />
                    <span>Synthesize Custom File (.AVI, .MKV, etc.)</span>
                  </button>
                </div>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-400 mt-3">
              or drag and drop any documents, videos, audio, or images anywhere on this box
            </p>

            {/* Quick-Add Sample Files Bar */}
            <div className="mt-5 pt-4 border-t border-slate-800/90 w-full max-w-3xl flex flex-wrap items-center justify-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1 mr-1">
                <Sparkles className="w-3.5 h-3.5 text-[#e0524a]" />
                <span>Quick Test Samples:</span>
              </span>

              {SAMPLE_PRESETS.map((preset: SamplePreset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onFilesAdded([preset.createFile()])}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#232c3b] hover:bg-[#2d384b] border border-slate-700 hover:border-slate-500 text-xs font-medium text-slate-200 transition-all cursor-pointer shadow-xs"
                  title={`Add sample file ${preset.fileName} (${preset.sublabel})`}
                >
                  {getPresetIcon(preset.category)}
                  <span>+{preset.sublabel}</span>
                </button>
              ))}

              <button
                type="button"
                onClick={onLoadDemoBatch}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#c83e37]/25 hover:bg-[#c83e37]/40 border border-[#c83e37]/50 text-xs font-semibold text-rose-200 transition-all cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-[#e0524a]" />
                <span>+ Load Full Queue (5 Files)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom File Generator Modal */}
      {showCustomFileModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowCustomFileModal(false)}
        >
          <div
            className="bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#1b222c] text-white px-5 py-3.5 font-bold text-sm flex items-center justify-between">
              <span>Create Custom Test File</span>
              <button
                type="button"
                onClick={() => setShowCustomFileModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateCustomFile} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  File Name & Extension (any format, e.g. my_movie.avi, report.docx)
                </label>
                <input
                  type="text"
                  value={customFileName}
                  onChange={(e) => setCustomFileName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium text-slate-800"
                  placeholder="example_video.avi"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Sample Payload Content
                </label>
                <textarea
                  rows={3}
                  value={customFileContent}
                  onChange={(e) => setCustomFileContent(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomFileModal(false)}
                  className="px-3.5 py-2 rounded-lg font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-bold bg-[#c83e37] hover:bg-[#b2342d] text-white"
                >
                  Add to Queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
