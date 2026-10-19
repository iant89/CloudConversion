import React, { useState } from 'react';
import { Search, ArrowRight, Sparkles } from 'lucide-react';
import { FORMAT_CATALOG, CATEGORY_LABELS, getDefaultTargetFormat } from '../data/formats';
import { FormatCategory } from '../types/conversion';

interface SupportedFormatsViewProps {
  onTestFormatConversion: (sourceExt: string, targetExt: string) => void;
}

export const SupportedFormatsView: React.FC<SupportedFormatsViewProps> = ({
  onTestFormatConversion,
}) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | FormatCategory>('all');

  const categories = Object.keys(CATEGORY_LABELS) as FormatCategory[];
  const filtered = FORMAT_CATALOG.filter((f) => {
    const matchesCategory = selectedCategory === 'all' || f.category === selectedCategory;
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      f.ext.includes(q) ||
      f.label.toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Supported File Formats ({FORMAT_CATALOG.length}+ Built-in + Universal Custom Extensions)
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Click any format card below to immediately generate and queue a test conversion for that file type.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter formats (e.g. avi, mp4, pdf)..."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#c83e37]"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5 py-4">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selectedCategory === 'all'
                ? 'bg-[#c83e37] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#c83e37] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
          {filtered.map((fmt) => {
            const defaultTarget = getDefaultTargetFormat(fmt.ext);
            return (
              <div
                key={fmt.ext}
                className="p-4 rounded-xl border border-slate-200 hover:border-[#c83e37]/60 bg-slate-50/50 hover:bg-white transition-all flex items-center justify-between gap-3 group"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#1b222c] text-white font-bold text-xs uppercase">
                      .{fmt.label}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 uppercase">
                      {CATEGORY_LABELS[fmt.category]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5 truncate" title={fmt.description}>
                    {fmt.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onTestFormatConversion(fmt.ext, defaultTarget.ext)}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-white group-hover:bg-[#c83e37] text-slate-700 group-hover:text-white border border-slate-300 group-hover:border-[#c83e37] text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title={`Queue sample .${fmt.ext.toUpperCase()} to .${defaultTarget.ext.toUpperCase()} conversion`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{fmt.label}</span>
                  <ArrowRight className="w-3 h-3" />
                  <span>{defaultTarget.label}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
