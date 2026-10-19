export type QueueItemStatus =
  | 'queued'      // Unfinished / waiting in queue
  | 'converting'  // Currently converting
  | 'finished'    // Completed successfully
  | 'cancelled'   // Cancelled by user
  | 'failed';     // Failed during conversion

export type FormatCategory =
  | 'video'
  | 'audio'
  | 'image'
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'ebook'
  | 'archive'
  | 'vector'
  | 'data';

export interface FormatDefinition {
  ext: string;
  label: string;
  category: FormatCategory;
  mimeType: string;
  description: string;
}

export interface TelemetryPoint {
  step: number;
  elapsedMs: number;
  progress: number;
  mbps: number;
  stage: string;
}

export interface ConversionOptions {
  // Video options
  videoCodec?: 'h264' | 'h265' | 'vp9' | 'av1' | 'mpeg4';
  videoResolution?: 'original' | '3840x2160' | '1920x1080' | '1280x720' | '854x480';
  videoPreset?: 'ultrafast' | 'fast' | 'medium' | 'slow';
  videoCrf?: number;
  frameRate?: 'original' | '24' | '30' | '60';

  // Audio options
  audioCodec?: 'aac' | 'mp3' | 'opus' | 'pcm_s16le' | 'flac';
  audioBitrate?: '128k' | '192k' | '256k' | '320k';
  sampleRate?: '44100' | '48000' | '96000';
  channels?: 'stereo' | 'mono';

  // Image options
  imageQuality?: number; // 10 - 100
  imageResizeWidth?: number;
  imageResizeHeight?: number;
  stripMetadata?: boolean;

  // Document options
  pageSize?: 'A4' | 'Letter' | 'Legal';
  pageOrientation?: 'portrait' | 'landscape';

  // Diagnostic / Testing options
  simulateFailure?: boolean;
  simulateCorrupted?: boolean;
}

export interface ConversionQueueItem {
  id: string;
  file: File;
  fileName: string;
  baseName: string;
  sourceExt: string;
  sourceCategory: FormatCategory;
  fileSize: number;
  targetExt: string;
  targetCategory: FormatCategory;
  status: QueueItemStatus;
  progress: number; // 0 to 100
  stageLabel: string;
  options: ConversionOptions;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  convertedBlob?: Blob;
  convertedUrl?: string;
  convertedFileName?: string;
  convertedSize?: number;
  errorMessage?: string;
  isCorrupted?: boolean;
  telemetry: TelemetryPoint[];
  avgMbps?: number;
  peakMbps?: number;
  sha256?: string;
  clientIp?: string;
}

export type ConversionSpeed = 'fast' | 'normal' | 'realistic';

// ==================== SECURITY, FILE BLOCKING & IP RATE LIMITING TYPES ====================

export interface FilenameFilterRule {
  id: string;
  pattern: string;
  mode: 'text' | 'regex';
  caseSensitive: boolean;
  enabled: boolean;
  reason: string;
  createdAt: number;
}

export interface ShaHashBlockRule {
  id: string;
  sha256: string; // 64-char hex lowercase
  label: string;
  enabled: boolean;
  createdAt: number;
}

export interface IpBlockRule {
  id: string;
  ipOrCidr: string; // e.g., "203.0.113.99", "192.0.2.0/24", "10.0.*.*"
  reason: string;
  enabled: boolean;
  createdAt: number;
}

export interface IpRateLimitConfig {
  enabled: boolean;
  maxConversionsPerWindow: number; // e.g., 10 conversions
  windowSeconds: number;           // e.g., 60 seconds
  maxBytesPerWindowMB: number;     // e.g., 250 MB per window
}

export interface SecurityPolicyConfig {
  filenameRules: FilenameFilterRule[];
  sha256Rules: ShaHashBlockRule[];
  blockedExtensions: string[];
  blockedCategories: FormatCategory[];
  maxFileSizeMB: number | null;
  blockEmptyFiles: boolean;
  currentClientIp: string;
  ipBlocklist: IpBlockRule[];
  ipRateLimit: IpRateLimitConfig;
}

export interface IpUsageRecord {
  ip: string;
  conversionTimestamps: number[];
  bytesRecords: { timestamp: number; bytes: number }[];
}

export interface BlockedEventLog {
  id: string;
  timestamp: number;
  fileName: string;
  fileSize: number;
  sha256?: string;
  clientIp: string;
  blockCategory:
    | 'ip-blocked'
    | 'ip-rate-limit'
    | 'filename-text'
    | 'filename-regex'
    | 'sha256-hash'
    | 'file-type'
    | 'file-category'
    | 'file-size';
  matchedRule: string;
  reason: string;
}

// ==================== ACTION & JOB HISTORY LOG TYPES ====================

export type HistoryActionType =
  | 'converted'
  | 'deleted'
  | 'blocked'
  | 'failed'
  | 'cancelled'
  | 'downloaded'
  | 'queued'
  | 'started'
  | 'retried'
  | 'reordered'
  | 'format-changed'
  | 'security-updated';

export interface HistoryLogEntry {
  id: string;
  timestamp: number;
  formattedDate: string; // e.g. "10/19/26 7:00 AM"
  actionType: HistoryActionType;
  message: string; // e.g. "Successfully Converted 'pizza.jpeg' to 'pizza.png'"
  fileName?: string;
  targetFileName?: string;
  details?: string;
  clientIp?: string;
}
