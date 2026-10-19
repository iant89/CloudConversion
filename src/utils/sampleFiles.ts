export interface SamplePreset {
  id: string;
  label: string;
  sublabel: string;
  fileName: string;
  category: string;
  createFile: () => File;
}

function createSamplePngFile(fileName = 'product_showcase_hd.png'): File {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#c83e37"/>
        <stop offset="100%" stop-color="#1b222c"/>
      </linearGradient>
    </defs>
    <rect width="640" height="400" fill="url(#g)"/>
    <circle cx="520" cy="90" r="110" fill="rgba(255,255,255,0.08)"/>
    <circle cx="110" cy="320" r="140" fill="rgba(255,255,255,0.06)"/>
    <text x="320" y="185" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="34" font-weight="bold">CloudConversion Sample Image</text>
    <text x="320" y="230" text-anchor="middle" fill="#e2e8f0" font-family="sans-serif" font-size="18">640x400 Vector/Raster Source Asset</text>
  </svg>`;
  return new File([svg], fileName, { type: 'image/svg+xml' });
}

function createSampleAviFile(fileName = 'b_roll_footage_1080p.avi'): File {
  // Construct RIFF AVI header + sample video stream payload (~180 KB)
  const size = 184320;
  const bytes = new Uint8Array(size);
  const header = 'RIFF____AVI LIST____hdrlavih____vidsMJPG';
  for (let i = 0; i < header.length; i++) {
    bytes[i] = header.charCodeAt(i);
  }
  for (let i = header.length; i < size; i++) {
    bytes[i] = (i * 31 + 17) & 0xff;
  }
  return new File([bytes], fileName, { type: 'video/x-msvideo' });
}

function createSampleWavFile(fileName = 'studio_voiceover_master.wav'): File {
  const sampleRate = 22050;
  const durationSec = 2;
  const numSamples = sampleRate * durationSec;
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * 440 * t) * 0.3 * (1 - t / durationSec);
    view.setInt16(44 + i * 2, sample * 32767, true);
  }
  return new File([buffer], fileName, { type: 'audio/wav' });
}

function createSampleDocxFile(fileName = 'Q4_Executive_Architecture_Brief.docx'): File {
  const content = [
    'Q4 EXECUTIVE ARCHITECTURE & PRODUCT BRIEF',
    'Prepared by: Platform Engineering Team',
    'Date: October 2026',
    '',
    '1. Executive Summary',
    'CloudConversion enables universal document, media, audio, and image transcoding directly in the browser with an interactive priority queue.',
    '',
    '2. Key Capabilities',
    '- Automatic format detection and intelligent target defaults (e.g. .AVI -> .MP4, .DOCX -> .PDF, .CSV -> .JSON)',
    '- Drag-and-drop queue reordering with strict queue integrity rules',
    '- Real-time progress bars, conversion stage telemetry, and instant cancellation',
    '- Persistent queue history until explicitly deleted by the user',
  ].join('\n');
  return new File([content], fileName, {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

function createSampleCsvFile(fileName = 'cloud_usage_metrics_2026.csv'): File {
  const csv = [
    'region,service_tier,conversions_completed,avg_latency_ms,success_rate',
    'us-east-1,Enterprise,148920,412,99.98%',
    'eu-central-1,Pro,94310,465,99.95%',
    'ap-northeast-1,Enterprise,67200,489,99.94%',
    'us-west-2,Starter,51480,510,99.91%',
    'sa-east-1,Pro,22910,538,99.89%',
  ].join('\n');
  return new File([csv], fileName, { type: 'text/csv' });
}

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'sample-avi',
    label: 'b_roll_footage_1080p.avi',
    sublabel: 'AVI → MP4',
    fileName: 'b_roll_footage_1080p.avi',
    category: 'video',
    createFile: () => createSampleAviFile('b_roll_footage_1080p.avi'),
  },
  {
    id: 'sample-docx',
    label: 'Q4_Architecture_Brief.docx',
    sublabel: 'DOCX → PDF',
    fileName: 'Q4_Architecture_Brief.docx',
    category: 'document',
    createFile: () => createSampleDocxFile('Q4_Architecture_Brief.docx'),
  },
  {
    id: 'sample-wav',
    label: 'studio_voiceover_master.wav',
    sublabel: 'WAV → MP3',
    fileName: 'studio_voiceover_master.wav',
    category: 'audio',
    createFile: () => createSampleWavFile('studio_voiceover_master.wav'),
  },
  {
    id: 'sample-png',
    label: 'product_showcase_hd.png',
    sublabel: 'PNG → WEBP',
    fileName: 'product_showcase_hd.png',
    category: 'image',
    createFile: () => createSamplePngFile('product_showcase_hd.png'),
  },
  {
    id: 'sample-csv',
    label: 'cloud_usage_metrics_2026.csv',
    sublabel: 'CSV → JSON',
    fileName: 'cloud_usage_metrics_2026.csv',
    category: 'spreadsheet',
    createFile: () => createSampleCsvFile('cloud_usage_metrics_2026.csv'),
  },
];

export function createDemoQueueBatch(): File[] {
  return SAMPLE_PRESETS.map((preset) => preset.createFile());
}
