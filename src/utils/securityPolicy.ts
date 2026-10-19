import {
  BlockedEventLog,
  FilenameFilterRule,
  FormatCategory,
  IpBlockRule,
  IpUsageRecord,
  SecurityPolicyConfig,
  ShaHashBlockRule,
} from '../types/conversion';
import { extractFileParts, getFormatDefinition, formatBytes } from '../data/formats';

/**
 * Pure-TypeScript SHA-256 implementation used as a fallback if crypto.subtle
 * is unavailable, and for synchronous deterministic hashing of known test payloads.
 */
export function sha256BytesSync(data: Uint8Array): string {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  const rotr = (n: number, x: number) => (x >>> n) | (x << (32 - n));

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const bitLen = data.length * 8;
  const padLen = ((data.length + 8) >> 6) * 64 + 64;
  const padded = new Uint8Array(padLen);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(padLen - 4, bitLen >>> 0, false);

  const W = new Uint32Array(64);
  for (let offset = 0; offset < padLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      W[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(7, W[i - 15]) ^ rotr(18, W[i - 15]) ^ (W[i - 15] >>> 3);
      const s1 = rotr(17, W[i - 2]) ^ rotr(19, W[i - 2]) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((v) => v.toString(16).padStart(8, '0'))
    .join('');
}

/**
 * Computes the SHA-256 hex digest of a File or Blob using Web Crypto API (with sync fallback).
 */
export async function computeFileSha256(file: Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
    try {
      const hashBuf = await crypto.subtle.digest('SHA-256', buffer);
      return Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      // Fallback to pure-TS SHA-256
    }
  }
  return sha256BytesSync(new Uint8Array(buffer));
}

export const BLOCKED_SAMPLE_PAYLOAD =
  'CLOUDCONVERSION_QUARANTINED_SIGNATURE_PAYLOAD_EICAR_DEMO_2026';

export const BLOCKED_SAMPLE_SHA256 = sha256BytesSync(
  new TextEncoder().encode(BLOCKED_SAMPLE_PAYLOAD)
);

export function createBlockedShaSampleFile(): File {
  return new File([BLOCKED_SAMPLE_PAYLOAD], 'quarantined_invoice_attachment.pdf', {
    type: 'application/pdf',
  });
}

export function createBlockedFilenameSampleFile(): File {
  return new File(
    ['Sample confidential document content blocked by filename filter.'],
    'secret_draft_2026_payroll.docx',
    {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }
  );
}

export function createBlockedExtensionSampleFile(): File {
  return new File(['MZ_EXECUTABLE_HEADER_DEMO'], 'installer_setup.exe', {
    type: 'application/x-msdownload',
  });
}

export function getDefaultSecurityPolicy(): SecurityPolicyConfig {
  return {
    filenameRules: [
      {
        id: 'fn-rule-1',
        pattern: 'confidential',
        mode: 'text',
        caseSensitive: false,
        enabled: true,
        reason: 'Contains restricted keyword "confidential" in filename',
        createdAt: Date.now() - 86400000,
      },
      {
        id: 'fn-rule-2',
        pattern: 'malware',
        mode: 'text',
        caseSensitive: false,
        enabled: true,
        reason: 'Contains security-flagged substring "malware"',
        createdAt: Date.now() - 72000000,
      },
      {
        id: 'fn-rule-3',
        pattern: '^secret_draft_\\d+',
        mode: 'regex',
        caseSensitive: false,
        enabled: true,
        reason: 'Matches restricted regex pattern ^secret_draft_\\d+',
        createdAt: Date.now() - 36000000,
      },
      {
        id: 'fn-rule-4',
        pattern: '\\.(exe|bat|cmd|scr|vbs|ps1)$',
        mode: 'regex',
        caseSensitive: false,
        enabled: true,
        reason: 'Executable script filename extension matched by regex',
        createdAt: Date.now() - 18000000,
      },
    ],
    sha256Rules: [
      {
        id: 'sha-rule-1',
        sha256: BLOCKED_SAMPLE_SHA256,
        label: 'Quarantined Sample Signature (quarantined_invoice_attachment.pdf)',
        enabled: true,
        createdAt: Date.now() - 86400000,
      },
      {
        id: 'sha-rule-2',
        sha256: '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f',
        label: 'Standard EICAR Test File SHA-256 Signature',
        enabled: true,
        createdAt: Date.now() - 50000000,
      },
    ],
    blockedExtensions: ['exe', 'bat', 'cmd', 'scr', 'msi', 'dll', 'sh', 'com'],
    blockedCategories: [],
    maxFileSizeMB: 500,
    blockEmptyFiles: false,
    currentClientIp: '198.51.100.42',
    ipBlocklist: [
      {
        id: 'ip-rule-1',
        ipOrCidr: '203.0.113.99',
        reason: 'Flagged automated scraper host (Exact IP match)',
        enabled: true,
        createdAt: Date.now() - 90000000,
      },
      {
        id: 'ip-rule-2',
        ipOrCidr: '192.0.2.0/24',
        reason: 'Restricted external subnet (CIDR /24 range block)',
        enabled: true,
        createdAt: Date.now() - 60000000,
      },
      {
        id: 'ip-rule-3',
        ipOrCidr: '10.99.*.*',
        reason: 'Quarantined internal wildcard subnet (10.99.*.*)',
        enabled: true,
        createdAt: Date.now() - 30000000,
      },
    ],
    ipRateLimit: {
      enabled: true,
      maxConversionsPerWindow: 12,
      windowSeconds: 60,
      maxBytesPerWindowMB: 250,
    },
  };
}

/**
 * Parses an IPv4 address string ("192.0.2.1") into a 32-bit unsigned integer, or null if invalid.
 */
function ipv4ToUint32(ip: string): number | null {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  let num = 0;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    const val = Number(part);
    if (val < 0 || val > 255) return null;
    num = ((num << 8) | val) >>> 0;
  }
  return num >>> 0;
}

/**
 * Checks if `clientIp` matches `ipOrCidr` (Exact match, IPv4 CIDR subnet e.g. 192.0.2.0/24, or wildcard 10.99.*.*)
 */
export function matchesIpRule(clientIp: string, ipOrCidr: string): boolean {
  const cleanClient = clientIp.trim().toLowerCase();
  const cleanRule = ipOrCidr.trim().toLowerCase();
  if (!cleanClient || !cleanRule) return false;

  // 1. Exact match
  if (cleanClient === cleanRule) return true;

  // 2. Wildcard match (e.g. "10.99.*.*" or "192.168.1.*")
  if (cleanRule.includes('*')) {
    const escaped = cleanRule
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '[^.]+');
    try {
      const regex = new RegExp(`^${escaped}$`, 'i');
      if (regex.test(cleanClient)) return true;
    } catch {
      // Ignore invalid regex
    }
  }

  // 3. IPv4 CIDR match (e.g. "192.0.2.0/24")
  if (cleanRule.includes('/')) {
    const [subnetStr, prefixStr] = cleanRule.split('/');
    const prefix = Number(prefixStr);
    const clientNum = ipv4ToUint32(cleanClient);
    const subnetNum = ipv4ToUint32(subnetStr);
    if (
      clientNum !== null &&
      subnetNum !== null &&
      Number.isInteger(prefix) &&
      prefix >= 0 &&
      prefix <= 32
    ) {
      if (prefix === 0) return true;
      const mask = (0xffffffff << (32 - prefix)) >>> 0;
      return (clientNum & mask) >>> 0 === (subnetNum & mask) >>> 0;
    }
  }

  return false;
}

export interface IpAccessEvaluation {
  allowed: boolean;
  clientIp: string;
  isIpBlocked: boolean;
  isRateLimited: boolean;
  matchedIpRule?: IpBlockRule;
  conversionsUsedInWindow: number;
  maxConversionsPerWindow: number;
  conversionsRemaining: number;
  bytesUsedInWindow: number;
  maxBytesInWindow: number;
  resetInSeconds: number;
  reason?: string;
}

export function evaluateIpAccess(
  policy: SecurityPolicyConfig,
  ipUsageMap: Record<string, IpUsageRecord>,
  now = Date.now(),
  additionalFilesCount = 0,
  additionalBytes = 0
): IpAccessEvaluation {
  const clientIp = policy.currentClientIp.trim() || '127.0.0.1';

  // 1. Check IP Blocklist
  const matchedBlock = policy.ipBlocklist.find(
    (rule) => rule.enabled && matchesIpRule(clientIp, rule.ipOrCidr)
  );

  const windowMs = Math.max(5, policy.ipRateLimit.windowSeconds) * 1000;
  const cutoff = now - windowMs;
  const usage = ipUsageMap[clientIp] || {
    ip: clientIp,
    conversionTimestamps: [],
    bytesRecords: [],
  };

  const recentTimestamps = usage.conversionTimestamps.filter((ts) => ts > cutoff);
  const recentByteRecords = usage.bytesRecords.filter((r) => r.timestamp > cutoff);
  const conversionsUsedInWindow = recentTimestamps.length;
  const bytesUsedInWindow = recentByteRecords.reduce((sum, r) => sum + r.bytes, 0);

  const oldestTs = recentTimestamps.length > 0 ? Math.min(...recentTimestamps) : now;
  const resetInSeconds =
    recentTimestamps.length > 0
      ? Math.max(1, Math.ceil((oldestTs + windowMs - now) / 1000))
      : policy.ipRateLimit.windowSeconds;

  const maxConversions = policy.ipRateLimit.maxConversionsPerWindow;
  const maxBytes = policy.ipRateLimit.maxBytesPerWindowMB * 1024 * 1024;

  if (matchedBlock) {
    return {
      allowed: false,
      clientIp,
      isIpBlocked: true,
      isRateLimited: false,
      matchedIpRule: matchedBlock,
      conversionsUsedInWindow,
      maxConversionsPerWindow: maxConversions,
      conversionsRemaining: Math.max(0, maxConversions - conversionsUsedInWindow),
      bytesUsedInWindow,
      maxBytesInWindow: maxBytes,
      resetInSeconds,
      reason: `Client IP ${clientIp} is blocked by rule "${matchedBlock.ipOrCidr}" (${matchedBlock.reason}).`,
    };
  }

  // 2. Check IP Rate Limit
  if (policy.ipRateLimit.enabled) {
    if (conversionsUsedInWindow + additionalFilesCount > maxConversions) {
      return {
        allowed: false,
        clientIp,
        isIpBlocked: false,
        isRateLimited: true,
        conversionsUsedInWindow,
        maxConversionsPerWindow: maxConversions,
        conversionsRemaining: Math.max(0, maxConversions - conversionsUsedInWindow),
        bytesUsedInWindow,
        maxBytesInWindow: maxBytes,
        resetInSeconds,
        reason: `IP Conversion Rate Limit Exceeded for ${clientIp}: ${conversionsUsedInWindow}/${maxConversions} conversions used in ${policy.ipRateLimit.windowSeconds}s window (resets in ${resetInSeconds}s).`,
      };
    }

    if (
      policy.ipRateLimit.maxBytesPerWindowMB > 0 &&
      bytesUsedInWindow + additionalBytes > maxBytes
    ) {
      return {
        allowed: false,
        clientIp,
        isIpBlocked: false,
        isRateLimited: true,
        conversionsUsedInWindow,
        maxConversionsPerWindow: maxConversions,
        conversionsRemaining: Math.max(0, maxConversions - conversionsUsedInWindow),
        bytesUsedInWindow,
        maxBytesInWindow: maxBytes,
        resetInSeconds,
        reason: `IP Bandwidth Quota Exceeded for ${clientIp}: ${formatBytes(
          bytesUsedInWindow + additionalBytes
        )} exceeds ${policy.ipRateLimit.maxBytesPerWindowMB} MB window limit (resets in ${resetInSeconds}s).`,
      };
    }
  }

  return {
    allowed: true,
    clientIp,
    isIpBlocked: false,
    isRateLimited: false,
    conversionsUsedInWindow,
    maxConversionsPerWindow: maxConversions,
    conversionsRemaining: Math.max(0, maxConversions - conversionsUsedInWindow),
    bytesUsedInWindow,
    maxBytesInWindow: maxBytes,
    resetInSeconds,
  };
}

export interface FileInspectionResult {
  allowed: boolean;
  sha256: string;
  blockedEvent?: BlockedEventLog;
}

/**
 * Inspects a single uploaded file against all active input file blocking rules:
 * - IP Blocklist & IP Rate Limit
 * - File Type / Extension Blocklist
 * - Format Category Blocklist
 * - Filename Text & Regex Filters
 * - SHA-256 Cryptographic File Hash Blocklist
 * - File Size Restrictions
 */
export async function inspectFileAgainstSecurityPolicy(
  file: File,
  policy: SecurityPolicyConfig,
  ipUsageMap: Record<string, IpUsageRecord>,
  now = Date.now()
): Promise<FileInspectionResult> {
  const sha256 = await computeFileSha256(file);
  const { ext } = extractFileParts(file.name);
  const sourceDef = getFormatDefinition(ext);
  const clientIp = policy.currentClientIp.trim() || '127.0.0.1';

  const makeBlockEvent = (
    blockCategory: BlockedEventLog['blockCategory'],
    matchedRule: string,
    reason: string
  ): BlockedEventLog => ({
    id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: now,
    fileName: file.name,
    fileSize: file.size,
    sha256,
    clientIp,
    blockCategory,
    matchedRule,
    reason,
  });

  // 1. Check IP Blocklist & IP Conversion Rate Limit
  const ipEval = evaluateIpAccess(policy, ipUsageMap, now, 1, file.size);
  if (!ipEval.allowed) {
    return {
      allowed: false,
      sha256,
      blockedEvent: makeBlockEvent(
        ipEval.isIpBlocked ? 'ip-blocked' : 'ip-rate-limit',
        ipEval.matchedIpRule
          ? `IP Rule: ${ipEval.matchedIpRule.ipOrCidr}`
          : `Rate Limit: ${policy.ipRateLimit.maxConversionsPerWindow} / ${policy.ipRateLimit.windowSeconds}s`,
        ipEval.reason || 'Blocked by IP security policy'
      ),
    };
  }

  // 2. Check File Extension / Type Blocklist
  const normalizedExt = ext.toLowerCase().replace(/^\./, '');
  if (
    policy.blockedExtensions.some(
      (blocked) => blocked.toLowerCase().replace(/^\./, '') === normalizedExt
    )
  ) {
    return {
      allowed: false,
      sha256,
      blockedEvent: makeBlockEvent(
        'file-type',
        `.${normalizedExt.toUpperCase()}`,
        `File type .${normalizedExt.toUpperCase()} is blocked by the File Type Blocklist.`
      ),
    };
  }

  // 3. Check Blocked Format Category
  if (policy.blockedCategories.includes(sourceDef.category)) {
    return {
      allowed: false,
      sha256,
      blockedEvent: makeBlockEvent(
        'file-category',
        `Category: ${sourceDef.category.toUpperCase()}`,
        `All ${sourceDef.category} files are currently blocked by category policy.`
      ),
    };
  }

  // 4. Check Filename Filter Rules (Plain Text & Regex)
  for (const rule of policy.filenameRules) {
    if (!rule.enabled || !rule.pattern.trim()) continue;
    if (rule.mode === 'text') {
      const haystack = rule.caseSensitive ? file.name : file.name.toLowerCase();
      const needle = rule.caseSensitive ? rule.pattern : rule.pattern.toLowerCase();
      if (haystack.includes(needle)) {
        return {
          allowed: false,
          sha256,
          blockedEvent: makeBlockEvent(
            'filename-text',
            `Text Filter: "${rule.pattern}"`,
            `Filename "${file.name}" matched text filter "${rule.pattern}" (${rule.reason}).`
          ),
        };
      }
    } else {
      try {
        const flags = rule.caseSensitive ? '' : 'i';
        const regex = new RegExp(rule.pattern, flags);
        if (regex.test(file.name)) {
          return {
            allowed: false,
            sha256,
            blockedEvent: makeBlockEvent(
              'filename-regex',
              `Regex: /${rule.pattern}/${flags}`,
              `Filename "${file.name}" matched regex filter /${rule.pattern}/${flags} (${rule.reason}).`
            ),
          };
        }
      } catch {
        // Ignore malformed user regex
      }
    }
  }

  // 5. Check SHA-256 Cryptographic File Hash Blocklist
  const matchedShaRule = policy.sha256Rules.find(
    (r) => r.enabled && r.sha256.trim().toLowerCase() === sha256.toLowerCase()
  );
  if (matchedShaRule) {
    return {
      allowed: false,
      sha256,
      blockedEvent: makeBlockEvent(
        'sha256-hash',
        `SHA-256: ${sha256.slice(0, 16)}...`,
        `File SHA-256 hash matches blocked signature "${matchedShaRule.label}" (${sha256.slice(
          0,
          20
        )}...).`
      ),
    };
  }

  // 6. Check File Size Limits
  if (policy.blockEmptyFiles && file.size === 0) {
    return {
      allowed: false,
      sha256,
      blockedEvent: makeBlockEvent(
        'file-size',
        'Empty File (0 B)',
        `Empty (0-byte) files are blocked by input file size policy.`
      ),
    };
  }

  if (
    policy.maxFileSizeMB !== null &&
    policy.maxFileSizeMB > 0 &&
    file.size > policy.maxFileSizeMB * 1024 * 1024
  ) {
    return {
      allowed: false,
      sha256,
      blockedEvent: makeBlockEvent(
        'file-size',
        `Max Size: ${policy.maxFileSizeMB} MB`,
        `File size (${formatBytes(file.size)}) exceeds maximum allowed limit of ${
          policy.maxFileSizeMB
        } MB.`
      ),
    };
  }

  return {
    allowed: true,
    sha256,
  };
}
