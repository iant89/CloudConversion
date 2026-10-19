import { FormatCategory, FormatDefinition, ConversionOptions } from '../types/conversion';

export const CATEGORY_LABELS: Record<FormatCategory, string> = {
  video: 'Video',
  audio: 'Audio',
  image: 'Image',
  document: 'Document',
  spreadsheet: 'Spreadsheet',
  presentation: 'Presentation',
  ebook: 'Ebook',
  archive: 'Archive',
  vector: 'Vector',
  data: 'Data & Code',
};

export const FORMAT_CATALOG: FormatDefinition[] = [
  // Video
  { ext: 'mp4', label: 'MP4', category: 'video', mimeType: 'video/mp4', description: 'MPEG-4 Part 14 Video Container' },
  { ext: 'avi', label: 'AVI', category: 'video', mimeType: 'video/x-msvideo', description: 'Audio Video Interleave File' },
  { ext: 'mkv', label: 'MKV', category: 'video', mimeType: 'video/x-matroska', description: 'Matroska Multimedia Container' },
  { ext: 'mov', label: 'MOV', category: 'video', mimeType: 'video/quicktime', description: 'Apple QuickTime Movie' },
  { ext: 'webm', label: 'WEBM', category: 'video', mimeType: 'video/webm', description: 'WebM Open Media File' },
  { ext: 'wmv', label: 'WMV', category: 'video', mimeType: 'video/x-ms-wmv', description: 'Windows Media Video' },
  { ext: 'flv', label: 'FLV', category: 'video', mimeType: 'video/x-flv', description: 'Flash Video Container' },
  { ext: 'mpeg', label: 'MPEG', category: 'video', mimeType: 'video/mpeg', description: 'Moving Picture Experts Group Phase 2' },
  { ext: 'm4v', label: 'M4V', category: 'video', mimeType: 'video/x-m4v', description: 'iTunes Video Container' },
  { ext: '3gp', label: '3GP', category: 'video', mimeType: 'video/3gpp', description: '3GPP Multimedia File' },

  // Audio
  { ext: 'mp3', label: 'MP3', category: 'audio', mimeType: 'audio/mpeg', description: 'MPEG-1 Audio Layer III' },
  { ext: 'wav', label: 'WAV', category: 'audio', mimeType: 'audio/wav', description: 'Waveform Audio File Format' },
  { ext: 'flac', label: 'FLAC', category: 'audio', mimeType: 'audio/flac', description: 'Free Lossless Audio Codec' },
  { ext: 'aac', label: 'AAC', category: 'audio', mimeType: 'audio/aac', description: 'Advanced Audio Coding' },
  { ext: 'ogg', label: 'OGG', category: 'audio', mimeType: 'audio/ogg', description: 'Ogg Vorbis Audio File' },
  { ext: 'm4a', label: 'M4A', category: 'audio', mimeType: 'audio/mp4', description: 'MPEG-4 Audio File' },
  { ext: 'wma', label: 'WMA', category: 'audio', mimeType: 'audio/x-ms-wma', description: 'Windows Media Audio' },
  { ext: 'aiff', label: 'AIFF', category: 'audio', mimeType: 'audio/aiff', description: 'Audio Interchange File Format' },
  { ext: 'opus', label: 'OPUS', category: 'audio', mimeType: 'audio/opus', description: 'Opus Interactive Audio Codec' },

  // Image
  { ext: 'png', label: 'PNG', category: 'image', mimeType: 'image/png', description: 'Portable Network Graphics' },
  { ext: 'jpg', label: 'JPG', category: 'image', mimeType: 'image/jpeg', description: 'Joint Photographic Experts Group' },
  { ext: 'jpeg', label: 'JPEG', category: 'image', mimeType: 'image/jpeg', description: 'Joint Photographic Experts Group' },
  { ext: 'webp', label: 'WEBP', category: 'image', mimeType: 'image/webp', description: 'Google WebP Image Format' },
  { ext: 'gif', label: 'GIF', category: 'image', mimeType: 'image/gif', description: 'Graphical Interchange Format' },
  { ext: 'bmp', label: 'BMP', category: 'image', mimeType: 'image/bmp', description: 'Bitmap Image File' },
  { ext: 'ico', label: 'ICO', category: 'image', mimeType: 'image/x-icon', description: 'Microsoft Icon File' },
  { ext: 'tiff', label: 'TIFF', category: 'image', mimeType: 'image/tiff', description: 'Tagged Image File Format' },
  { ext: 'heic', label: 'HEIC', category: 'image', mimeType: 'image/heic', description: 'High Efficiency Image Container' },
  { ext: 'avif', label: 'AVIF', category: 'image', mimeType: 'image/avif', description: 'AV1 Image File Format' },
  { ext: 'psd', label: 'PSD', category: 'image', mimeType: 'image/vnd.adobe.photoshop', description: 'Adobe Photoshop Document' },

  // Document
  { ext: 'pdf', label: 'PDF', category: 'document', mimeType: 'application/pdf', description: 'Portable Document Format' },
  { ext: 'docx', label: 'DOCX', category: 'document', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', description: 'Microsoft Word Open XML Document' },
  { ext: 'doc', label: 'DOC', category: 'document', mimeType: 'application/msword', description: 'Microsoft Word Document' },
  { ext: 'txt', label: 'TXT', category: 'document', mimeType: 'text/plain', description: 'Plain Text Document' },
  { ext: 'rtf', label: 'RTF', category: 'document', mimeType: 'application/rtf', description: 'Rich Text Format Document' },
  { ext: 'odt', label: 'ODT', category: 'document', mimeType: 'application/vnd.oasis.opendocument.text', description: 'OpenDocument Text Document' },
  { ext: 'html', label: 'HTML', category: 'document', mimeType: 'text/html', description: 'HyperText Markup Language' },
  { ext: 'md', label: 'MD', category: 'document', mimeType: 'text/markdown', description: 'Markdown Documentation File' },
  { ext: 'pages', label: 'PAGES', category: 'document', mimeType: 'application/vnd.apple.pages', description: 'Apple Pages Document' },
  { ext: 'tex', label: 'TEX', category: 'document', mimeType: 'application/x-tex', description: 'LaTeX Source Document' },

  // Spreadsheet
  { ext: 'xlsx', label: 'XLSX', category: 'spreadsheet', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', description: 'Microsoft Excel Open XML Spreadsheet' },
  { ext: 'xls', label: 'XLS', category: 'spreadsheet', mimeType: 'application/vnd.ms-excel', description: 'Microsoft Excel Spreadsheet' },
  { ext: 'ods', label: 'ODS', category: 'spreadsheet', mimeType: 'application/vnd.oasis.opendocument.spreadsheet', description: 'OpenDocument Spreadsheet' },
  { ext: 'csv', label: 'CSV', category: 'spreadsheet', mimeType: 'text/csv', description: 'Comma-Separated Values' },
  { ext: 'tsv', label: 'TSV', category: 'spreadsheet', mimeType: 'text/tab-separated-values', description: 'Tab-Separated Values' },

  // Presentation
  { ext: 'pptx', label: 'PPTX', category: 'presentation', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', description: 'Microsoft PowerPoint Open XML Presentation' },
  { ext: 'ppt', label: 'PPT', category: 'presentation', mimeType: 'application/vnd.ms-powerpoint', description: 'Microsoft PowerPoint Presentation' },
  { ext: 'odp', label: 'ODP', category: 'presentation', mimeType: 'application/vnd.oasis.opendocument.presentation', description: 'OpenDocument Presentation' },
  { ext: 'key', label: 'KEY', category: 'presentation', mimeType: 'application/vnd.apple.keynote', description: 'Apple Keynote Presentation' },

  // Ebook
  { ext: 'epub', label: 'EPUB', category: 'ebook', mimeType: 'application/epub+zip', description: 'Electronic Publication Format' },
  { ext: 'mobi', label: 'MOBI', category: 'ebook', mimeType: 'application/x-mobipocket-ebook', description: 'Mobipocket Ebook' },
  { ext: 'azw3', label: 'AZW3', category: 'ebook', mimeType: 'application/vnd.amazon.ebook', description: 'Amazon Kindle Format 8' },

  // Archive
  { ext: 'zip', label: 'ZIP', category: 'archive', mimeType: 'application/zip', description: 'ZIP Compressed Archive' },
  { ext: 'tar', label: 'TAR', category: 'archive', mimeType: 'application/x-tar', description: 'Consolidated Unix File Archive' },
  { ext: 'gz', label: 'GZ', category: 'archive', mimeType: 'application/gzip', description: 'Gnu Zipped Archive' },
  { ext: '7z', label: '7Z', category: 'archive', mimeType: 'application/x-7z-compressed', description: '7-Zip Compressed Archive' },
  { ext: 'rar', label: 'RAR', category: 'archive', mimeType: 'application/vnd.rar', description: 'Roshal Archive Compressed File' },

  // Vector
  { ext: 'svg', label: 'SVG', category: 'vector', mimeType: 'image/svg+xml', description: 'Scalable Vector Graphics' },
  { ext: 'eps', label: 'EPS', category: 'vector', mimeType: 'application/postscript', description: 'Encapsulated PostScript' },
  { ext: 'ai', label: 'AI', category: 'vector', mimeType: 'application/postscript', description: 'Adobe Illustrator Artwork' },
  { ext: 'dwg', label: 'DWG', category: 'vector', mimeType: 'image/vnd.dwg', description: 'AutoCAD Drawing Database' },
  { ext: 'dxf', label: 'DXF', category: 'vector', mimeType: 'image/vnd.dxf', description: 'Drawing Exchange Format' },

  // Data & Code
  { ext: 'json', label: 'JSON', category: 'data', mimeType: 'application/json', description: 'JavaScript Object Notation' },
  { ext: 'xml', label: 'XML', category: 'data', mimeType: 'application/xml', description: 'Extensible Markup Language' },
  { ext: 'yaml', label: 'YAML', category: 'data', mimeType: 'text/yaml', description: 'YAML Ain\'t Markup Language' },
  { ext: 'sql', label: 'SQL', category: 'data', mimeType: 'application/sql', description: 'Structured Query Language Data' },
];

const DEFAULT_TARGET_BY_EXT: Record<string, string> = {
  // Video -> MP4 (and MP4 -> WEBM or MP3)
  avi: 'mp4',
  mkv: 'mp4',
  mov: 'mp4',
  wmv: 'mp4',
  flv: 'mp4',
  mpeg: 'mp4',
  m4v: 'mp4',
  '3gp': 'mp4',
  webm: 'mp4',
  mp4: 'mp3',

  // Audio -> MP3 (and MP3 -> WAV)
  wav: 'mp3',
  flac: 'mp3',
  aac: 'mp3',
  ogg: 'mp3',
  m4a: 'mp3',
  wma: 'mp3',
  aiff: 'mp3',
  opus: 'mp3',
  mp3: 'wav',

  // Image
  png: 'webp',
  jpg: 'png',
  jpeg: 'png',
  webp: 'png',
  gif: 'mp4',
  bmp: 'png',
  ico: 'png',
  tiff: 'jpg',
  heic: 'jpg',
  avif: 'png',
  psd: 'png',

  // Document
  docx: 'pdf',
  doc: 'pdf',
  odt: 'pdf',
  rtf: 'pdf',
  txt: 'pdf',
  md: 'html',
  html: 'pdf',
  pages: 'pdf',
  tex: 'pdf',
  pdf: 'docx',

  // Spreadsheet
  xlsx: 'csv',
  xls: 'xlsx',
  ods: 'xlsx',
  csv: 'json',
  tsv: 'csv',

  // Presentation
  pptx: 'pdf',
  ppt: 'pdf',
  odp: 'pdf',
  key: 'pdf',

  // Ebook
  epub: 'pdf',
  mobi: 'epub',
  azw3: 'epub',

  // Archive
  zip: 'tar',
  tar: 'zip',
  gz: 'zip',
  '7z': 'zip',
  rar: 'zip',

  // Vector
  svg: 'png',
  eps: 'pdf',
  ai: 'pdf',
  dwg: 'pdf',
  dxf: 'pdf',

  // Data
  json: 'csv',
  xml: 'json',
  yaml: 'json',
  sql: 'json',
};

export function getFormatDefinition(ext: string): FormatDefinition {
  const normalized = ext.toLowerCase().replace(/^\./, '');
  const found = FORMAT_CATALOG.find((f) => f.ext === normalized);
  if (found) return found;

  return {
    ext: normalized || 'bin',
    label: (normalized || 'BIN').toUpperCase(),
    category: 'document',
    mimeType: 'application/octet-stream',
    description: `${(normalized || 'BIN').toUpperCase()} File`,
  };
}

export function getDefaultTargetFormat(sourceExt: string): FormatDefinition {
  const normalized = sourceExt.toLowerCase().replace(/^\./, '');
  const mappedExt = DEFAULT_TARGET_BY_EXT[normalized];
  if (mappedExt) {
    return getFormatDefinition(mappedExt);
  }
  const sourceDef = getFormatDefinition(normalized);
  switch (sourceDef.category) {
    case 'video':
      return getFormatDefinition(normalized === 'mp4' ? 'webm' : 'mp4');
    case 'audio':
      return getFormatDefinition(normalized === 'mp3' ? 'wav' : 'mp3');
    case 'image':
      return getFormatDefinition(normalized === 'png' ? 'jpg' : 'png');
    case 'spreadsheet':
      return getFormatDefinition(normalized === 'csv' ? 'json' : 'csv');
    case 'data':
      return getFormatDefinition(normalized === 'json' ? 'csv' : 'json');
    default:
      return getFormatDefinition(normalized === 'pdf' ? 'docx' : 'pdf');
  }
}

export function getSuggestedFormats(sourceExt: string, sourceCategory: FormatCategory): FormatDefinition[] {
  const normalized = sourceExt.toLowerCase().replace(/^\./, '');
  const sameCategory = FORMAT_CATALOG.filter(
    (f) => f.category === sourceCategory && f.ext !== normalized
  );
  // Also include popular cross-category targets (e.g. Video -> MP3/GIF, Document <-> Image/PDF, Spreadsheet <-> Data)
  const crossTargets: string[] = [];
  if (sourceCategory === 'video') crossTargets.push('mp3', 'gif', 'wav');
  if (sourceCategory === 'image') crossTargets.push('pdf', 'svg');
  if (sourceCategory === 'document') crossTargets.push('png', 'jpg', 'epub');
  if (sourceCategory === 'spreadsheet') crossTargets.push('json', 'xml', 'pdf', 'html');
  if (sourceCategory === 'data') crossTargets.push('csv', 'xlsx', 'html', 'txt');
  if (sourceCategory === 'vector') crossTargets.push('png', 'webp', 'pdf', 'jpg');

  const extras = crossTargets
    .map((ext) => FORMAT_CATALOG.find((f) => f.ext === ext))
    .filter((f): f is FormatDefinition => Boolean(f && f.ext !== normalized));

  const seen = new Set<string>();
  const combined: FormatDefinition[] = [];
  for (const item of [...sameCategory, ...extras]) {
    if (!seen.has(item.ext)) {
      seen.add(item.ext);
      combined.push(item);
    }
  }
  return combined.slice(0, 12);
}

export function getDefaultOptionsForTarget(targetCategory: FormatCategory): ConversionOptions {
  return {
    videoCodec: 'h264',
    videoResolution: 'original',
    videoPreset: 'medium',
    videoCrf: 23,
    frameRate: 'original',
    audioCodec: targetCategory === 'audio' ? 'mp3' : 'aac',
    audioBitrate: '192k',
    sampleRate: '44100',
    channels: 'stereo',
    imageQuality: 90,
    stripMetadata: false,
    pageSize: 'A4',
    pageOrientation: 'portrait',
    simulateFailure: false,
  };
}

export function extractFileParts(fileName: string): { baseName: string; ext: string } {
  const trimmed = fileName.trim();
  const lastDot = trimmed.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === trimmed.length - 1) {
    return { baseName: trimmed || 'document', ext: 'txt' };
  }
  return {
    baseName: trimmed.slice(0, lastDot),
    ext: trimmed.slice(lastDot + 1).toLowerCase(),
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(Math.max(1, bytes)) / Math.log(k)), sizes.length - 1);
  const val = bytes / Math.pow(k, i);
  return `${val >= 100 || i === 0 ? val.toFixed(0) : val.toFixed(1)} ${sizes[i]}`;
}
