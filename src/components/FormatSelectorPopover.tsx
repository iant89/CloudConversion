import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Sparkles, Check } from 'lucide-react';
import {
  FORMAT_CATALOG,
  CATEGORY_LABELS,
  getSuggestedFormats,
} from '../data/formats';
import { FormatCategory, FormatDefinition } from '../types/conversion';

interface FormatSelectorPopoverProps {
  sourceExt: string;
  sourceCategory: FormatCategory;
  selectedExt: string;
  onSelectFormat: (ext: string) => void;
  disabled?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

const ALL_CATEGORIES: FormatCategory[] = [
  'video',
  'audio',
  'image',
  'document',
  'spreadsheet',
  'presentation',
  'ebook',
  'archive',
  'vector',
  'data',
];

export const FormatSelectorPopover: React.FC<FormatSelectorPopoverProps> = ({
  sourceExt,
  sourceCategory,
  selectedExt,
  onSelectFormat,
  disabled = false,
  onOpenChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'suggested' | FormatCategory>('suggested');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleOpen = (next: boolean) => {
    setIsOpen(next);
    onOpenChange?.(next);
    if (next) {
      setSearch('');
      setActiveCategory('suggested');
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        toggleOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        toggleOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    setTimeout(() => inputRef.current?.focus(), 20);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const suggestedFormats = getSuggestedFormats(sourceExt, sourceCategory);
  const cleanSearch = search.trim().toLowerCase().replace(/^\./, '');

  let visibleFormats: FormatDefinition[] = [];
  if (cleanSearch) {
    visibleFormats = FORMAT_CATALOG.filter(
      (f) =>
        f.ext.includes(cleanSearch) ||
        f.label.toLowerCase().includes(cleanSearch) ||
        f.description.toLowerCase().includes(cleanSearch) ||
        f.category.includes(cleanSearch)
    );
  } else if (activeCategory === 'suggested') {
    visibleFormats = suggestedFormats;
  } else {
    visibleFormats = FORMAT_CATALOG.filter((f) => f.category === activeCategory);
  }

  const handleChoose = (ext: string) => {
    onSelectFormat(ext.toLowerCase());
    toggleOpen(false);
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => toggleOpen(!isOpen)}
        aria-label={`Select target format, currently ${selectedExt.toUpperCase()}`}
        aria-expanded={isOpen}
        className={`inline-flex items-center justify-between gap-2 min-w-[92px] px-3 py-1.5 rounded-md font-bold text-xs tracking-wide uppercase transition-all border shadow-sm ${
          isOpen
            ? 'bg-[#1b222c] text-white border-[#c83e37] ring-2 ring-[#c83e37]/30'
            : 'bg-[#232b38] hover:bg-[#1b222c] text-white border-slate-700 hover:border-slate-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span>{selectedExt.toUpperCase()}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-300 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-[#e0524a]' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-[330px] sm:w-[440px] bg-[#1e2631] text-slate-100 rounded-xl shadow-2xl border border-slate-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          role="dialog"
          aria-label="Target file format selector"
        >
          {/* Search Header */}
          <div className="p-2.5 bg-[#161c24] border-b border-slate-700/80">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search format (e.g. MP4, PDF, WEBP, MP3, JSON)..."
                className="w-full pl-9 pr-3 py-1.5 bg-[#252f3d] border border-slate-600/80 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#c83e37]"
              />
            </div>
          </div>

          <div className="flex max-h-[290px]">
            {/* Categories Sidebar (hidden while searching) */}
            {!cleanSearch && (
              <div className="w-36 bg-[#171d26] border-r border-slate-700/70 overflow-y-auto py-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveCategory('suggested')}
                  className={`w-full px-3 py-1.5 text-left text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    activeCategory === 'suggested'
                      ? 'bg-[#c83e37] text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Suggested</span>
                </button>
                {ALL_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`w-full px-3 py-1.5 text-left text-xs font-medium flex items-center justify-between transition-colors ${
                      activeCategory === cat
                        ? 'bg-[#c83e37] text-white font-semibold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{CATEGORY_LABELS[cat]}</span>
                    {cat === sourceCategory && activeCategory !== cat && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#e0524a]" title="Same category as source" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Formats Grid */}
            <div className="flex-1 p-3 overflow-y-auto">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                <span>
                  {cleanSearch
                    ? `Matching Formats (${visibleFormats.length})`
                    : activeCategory === 'suggested'
                    ? `Recommended for .${sourceExt.toUpperCase()}`
                    : `${CATEGORY_LABELS[activeCategory]} Formats`}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {visibleFormats.map((fmt) => {
                  const isSelected = fmt.ext === selectedExt.toLowerCase();
                  return (
                    <button
                      key={fmt.ext}
                      type="button"
                      onClick={() => handleChoose(fmt.ext)}
                      title={fmt.description}
                      className={`px-2.5 py-2 rounded-md text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-1 transition-all border ${
                        isSelected
                          ? 'bg-[#c83e37] text-white border-[#e0524a] shadow-sm'
                          : 'bg-[#283241] hover:bg-[#334053] text-slate-100 border-slate-600/60 hover:border-slate-500'
                      }`}
                    >
                      <span>{fmt.label}</span>
                      {isSelected && <Check className="w-3 h-3 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Allow custom format extension if typed in search */}
              {cleanSearch &&
                /^[a-z0-9]{1,8}$/.test(cleanSearch) &&
                !visibleFormats.some((f) => f.ext === cleanSearch) && (
                  <div className="mt-3 pt-2.5 border-t border-slate-700">
                    <button
                      type="button"
                      onClick={() => handleChoose(cleanSearch)}
                      className="w-full py-2 px-3 rounded-md bg-[#c83e37]/20 hover:bg-[#c83e37] border border-[#c83e37]/50 text-xs font-semibold text-white transition-colors flex items-center justify-between"
                    >
                      <span>Use custom format: .{cleanSearch.toUpperCase()}</span>
                      <span className="px-1.5 py-0.5 rounded bg-black/30 text-[10px]">Custom</span>
                    </button>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
