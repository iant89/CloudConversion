import React, { useState, useRef } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  FileCode2,
  Hash,
  FileX2,
  Globe,
  Gauge,
  Plus,
  Trash2,
  CheckCircle2,
  Ban,
  Upload,
  RotateCcw,
  Sparkles,
  Search,
  Lock,
  Unlock,
  AlertOctagon,
} from 'lucide-react';
import {
  BlockedEventLog,
  FormatCategory,
  IpUsageRecord,
  SecurityPolicyConfig,
} from '../types/conversion';
import { CATEGORY_LABELS, formatBytes } from '../data/formats';
import {
  computeFileSha256,
  createBlockedExtensionSampleFile,
  createBlockedFilenameSampleFile,
  createBlockedShaSampleFile,
  evaluateIpAccess,
} from '../utils/securityPolicy';
import { ResponsiveActionButton } from './Tooltip';

interface SecurityPolicyViewProps {
  policy: SecurityPolicyConfig;
  onUpdatePolicy: React.Dispatch<React.SetStateAction<SecurityPolicyConfig>>;
  ipUsageMap: Record<string, IpUsageRecord>;
  onResetIpQuota: (ip?: string) => void;
  blockedLogs: BlockedEventLog[];
  onClearBlockedLogs: () => void;
  onTestUploadFiles: (files: File[]) => void;
}

const QUICK_EXT_TOGGLES = [
  'exe',
  'bat',
  'cmd',
  'scr',
  'msi',
  'dll',
  'sh',
  'avi',
  'mp4',
  'mkv',
  'wav',
  'mp3',
  'pdf',
  'docx',
  'zip',
  'rar',
  'csv',
  'json',
];

const PRESET_CLIENT_IPS = [
  { ip: '198.51.100.42', label: '198.51.100.42 (Default Allowed Client)' },
  { ip: '203.0.113.99', label: '203.0.113.99 (Matches Exact IP Block)' },
  { ip: '192.0.2.45', label: '192.0.2.45 (Matches 192.0.2.0/24 CIDR Block)' },
  { ip: '10.99.8.14', label: '10.99.8.14 (Matches 10.99.*.* Wildcard Block)' },
];

export const SecurityPolicyView: React.FC<SecurityPolicyViewProps> = ({
  policy,
  onUpdatePolicy,
  ipUsageMap,
  onResetIpQuota,
  blockedLogs,
  onClearBlockedLogs,
  onTestUploadFiles,
}) => {
  // Filename rule inputs
  const [newFnPattern, setNewFnPattern] = useState('');
  const [newFnMode, setNewFnMode] = useState<'text' | 'regex'>('text');
  const [newFnCaseSensitive, setNewFnCaseSensitive] = useState(false);
  const [newFnReason, setNewFnReason] = useState('');
  const [testFilenameInput, setTestFilenameInput] = useState('secret_draft_2026_report.pdf');

  // SHA-256 hash rule inputs
  const [newShaHash, setNewShaHash] = useState('');
  const [newShaLabel, setNewShaLabel] = useState('');
  const [hashingFile, setHashingFile] = useState(false);
  const shaFileInputRef = useRef<HTMLInputElement>(null);

  // Extension input
  const [customExtInput, setCustomExtInput] = useState('');

  // IP Block rule inputs
  const [newIpPattern, setNewIpPattern] = useState('');
  const [newIpReason, setNewIpReason] = useState('');

  const ipEval = evaluateIpAccess(policy, ipUsageMap);

  // Add Filename Rule
  const handleAddFilenameRule = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newFnPattern.trim();
    if (!clean) return;
    onUpdatePolicy((prev) => ({
      ...prev,
      filenameRules: [
        {
          id: `fn-${Date.now()}`,
          pattern: clean,
          mode: newFnMode,
          caseSensitive: newFnCaseSensitive,
          enabled: true,
          reason:
            newFnReason.trim() ||
            (newFnMode === 'regex'
              ? `Matches regex pattern /${clean}/`
              : `Contains restricted text "${clean}"`),
          createdAt: Date.now(),
        },
        ...prev.filenameRules,
      ],
    }));
    setNewFnPattern('');
    setNewFnReason('');
  };

  // Add SHA-256 Rule manually
  const handleAddShaRule = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newShaHash.trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(clean)) return;
    onUpdatePolicy((prev) => ({
      ...prev,
      sha256Rules: [
        {
          id: `sha-${Date.now()}`,
          sha256: clean,
          label: newShaLabel.trim() || `Blocked SHA-256 (${clean.slice(0, 12)}...)`,
          enabled: true,
          createdAt: Date.now(),
        },
        ...prev.sha256Rules,
      ],
    }));
    setNewShaHash('');
    setNewShaLabel('');
  };

  // Compute SHA-256 from a selected file and add it to the blocklist
  const handleHashFileAndBlock = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHashingFile(true);
    try {
      const hash = await computeFileSha256(file);
      onUpdatePolicy((prev) => {
        const exists = prev.sha256Rules.some((r) => r.sha256.toLowerCase() === hash.toLowerCase());
        if (exists) return prev;
        return {
          ...prev,
          sha256Rules: [
            {
              id: `sha-${Date.now()}`,
              sha256: hash,
              label: `${file.name} (${formatBytes(file.size)})`,
              enabled: true,
              createdAt: Date.now(),
            },
            ...prev.sha256Rules,
          ],
        };
      });
    } finally {
      setHashingFile(false);
      e.target.value = '';
    }
  };

  // Toggle Extension Block
  const handleToggleExtension = (ext: string) => {
    const clean = ext.toLowerCase().replace(/^\./, '');
    onUpdatePolicy((prev) => {
      const exists = prev.blockedExtensions.includes(clean);
      return {
        ...prev,
        blockedExtensions: exists
          ? prev.blockedExtensions.filter((e) => e !== clean)
          : [...prev.blockedExtensions, clean],
      };
    });
  };

  const handleAddCustomExt = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customExtInput.trim().toLowerCase().replace(/^\./, '');
    if (!clean) return;
    onUpdatePolicy((prev) => ({
      ...prev,
      blockedExtensions: prev.blockedExtensions.includes(clean)
        ? prev.blockedExtensions
        : [...prev.blockedExtensions, clean],
    }));
    setCustomExtInput('');
  };

  // Toggle Category Block
  const handleToggleCategory = (cat: FormatCategory) => {
    onUpdatePolicy((prev) => {
      const exists = prev.blockedCategories.includes(cat);
      return {
        ...prev,
        blockedCategories: exists
          ? prev.blockedCategories.filter((c) => c !== cat)
          : [...prev.blockedCategories, cat],
      };
    });
  };

  // Add IP Block Rule
  const handleAddIpRule = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newIpPattern.trim();
    if (!clean) return;
    onUpdatePolicy((prev) => ({
      ...prev,
      ipBlocklist: [
        {
          id: `ip-${Date.now()}`,
          ipOrCidr: clean,
          reason: newIpReason.trim() || `Blocked IP / Subnet (${clean})`,
          enabled: true,
          createdAt: Date.now(),
        },
        ...prev.ipBlocklist,
      ],
    }));
    setNewIpPattern('');
    setNewIpReason('');
  };

  // Live Filename Tester Evaluation
  const matchedFilenameRule = policy.filenameRules.find((rule) => {
    if (!rule.enabled || !rule.pattern.trim() || !testFilenameInput.trim()) return false;
    if (rule.mode === 'text') {
      const h = rule.caseSensitive ? testFilenameInput : testFilenameInput.toLowerCase();
      const n = rule.caseSensitive ? rule.pattern : rule.pattern.toLowerCase();
      return h.includes(n);
    }
    try {
      const r = new RegExp(rule.pattern, rule.caseSensitive ? '' : 'i');
      return r.test(testFilenameInput);
    } catch {
      return false;
    }
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Security & Rate Limit Status Banner */}
      <div className="bg-[#1b222c] text-white rounded-2xl p-6 border border-slate-800 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#c83e37]/20 border border-[#c83e37]/40 text-xs font-bold text-rose-300">
            <ShieldAlert className="w-3.5 h-3.5 text-[#e0524a]" />
            <span>Pre-Flight Input File Blocking & IP Access Control</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold">
            Security Firewall, File Blocking & IP Conversion Rate Limiting
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Configure real-time input blocking by <strong>Filename (Text or Regex)</strong>,{' '}
            <strong>SHA-256 Cryptographic File Hash</strong>, <strong>File Type / Category</strong>,{' '}
            <strong>IP / CIDR Subnet Blocklist</strong>, and <strong>Per-IP Conversion Rate Quotas</strong>.
          </p>
        </div>

        {/* One-Click Live Test Triggers */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <ResponsiveActionButton
            icon={<Sparkles className="w-3.5 h-3.5 text-amber-400" />}
            label="Test Blocked Filename"
            tooltipText="Attempt to upload 'secret_draft_2026_payroll.docx' (blocked by regex)"
            breakpoint={640}
            onClick={() => onTestUploadFiles([createBlockedFilenameSampleFile()])}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-600"
          />
          <ResponsiveActionButton
            icon={<Hash className="w-3.5 h-3.5 text-rose-400" />}
            label="Test Blocked SHA-256"
            tooltipText="Attempt to upload 'quarantined_invoice_attachment.pdf' (blocked by SHA-256 hash)"
            breakpoint={640}
            onClick={() => onTestUploadFiles([createBlockedShaSampleFile()])}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-600"
          />
          <ResponsiveActionButton
            icon={<FileX2 className="w-3.5 h-3.5 text-red-400" />}
            label="Test Blocked .EXE"
            tooltipText="Attempt to upload 'installer_setup.exe' (blocked by file type)"
            breakpoint={640}
            onClick={() => onTestUploadFiles([createBlockedExtensionSampleFile()])}
            className="px-3 py-2 rounded-lg bg-[#c83e37] hover:bg-[#b2342d] text-xs font-bold text-white shadow-sm"
          />
        </div>
      </div>

      {/* ==================== SECTION 1: IP BLOCKING & IP CONVERSION LIMITING ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Client IP Simulator & IP Blocklist */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#c83e37]" />
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900">
                  IP Address & CIDR Subnet Blocking
                </h3>
                <p className="text-xs text-slate-500">
                  Block exact IPv4/IPv6 addresses, CIDR subnets (e.g. <code>192.0.2.0/24</code>), or wildcards (<code>10.99.*.*</code>)
                </p>
              </div>
            </div>
            {ipEval.isIpBlocked ? (
              <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-800 border border-red-300 text-xs font-bold flex items-center gap-1">
                <Ban className="w-3.5 h-3.5 text-red-600" />
                <span>IP BLOCKED</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>IP ALLOWED</span>
              </span>
            )}
          </div>

          {/* Active Client IP Simulator */}
          <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                Simulated Client IP Address
              </span>
              <span className="font-mono font-bold text-emerald-400">{policy.currentClientIp}</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={policy.currentClientIp}
                onChange={(e) =>
                  onUpdatePolicy((prev) => ({ ...prev, currentClientIp: e.target.value }))
                }
                placeholder="e.g. 198.51.100.42"
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-[#c83e37]"
              />
              <select
                value={
                  PRESET_CLIENT_IPS.some((p) => p.ip === policy.currentClientIp)
                    ? policy.currentClientIp
                    : ''
                }
                onChange={(e) => {
                  if (e.target.value) {
                    onUpdatePolicy((prev) => ({ ...prev, currentClientIp: e.target.value }));
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-[#c83e37]"
              >
                <option value="" disabled>
                  Quick Switch Test IP...
                </option>
                {PRESET_CLIENT_IPS.map((preset) => (
                  <option key={preset.ip} value={preset.ip}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>

            {ipEval.isIpBlocked && ipEval.matchedIpRule && (
              <div className="p-2.5 rounded-lg bg-red-950/90 border border-red-600 text-red-100 text-xs flex items-center justify-between gap-2">
                <span>
                  Blocked by rule <strong>{ipEval.matchedIpRule.ipOrCidr}</strong>:{' '}
                  {ipEval.matchedIpRule.reason}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdatePolicy((prev) => ({ ...prev, currentClientIp: '198.51.100.42' }))
                  }
                  className="px-2 py-1 rounded bg-white text-slate-900 font-bold text-[11px] shrink-0 cursor-pointer"
                >
                  Switch to Allowed IP
                </button>
              </div>
            )}
          </div>

          {/* Add IP Rule Form */}
          <form onSubmit={handleAddIpRule} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newIpPattern}
              onChange={(e) => setNewIpPattern(e.target.value)}
              placeholder="IP, CIDR or Wildcard (e.g. 203.0.113.5, 192.0.2.0/24)"
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:border-[#c83e37]"
            />
            <input
              type="text"
              value={newIpReason}
              onChange={(e) => setNewIpReason(e.target.value)}
              placeholder="Reason (optional)"
              className="sm:w-44 px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#c83e37]"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-lg bg-[#c83e37] hover:bg-[#b2342d] text-white text-xs font-bold flex items-center justify-center gap-1 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Block IP</span>
            </button>
          </form>

          {/* IP Blocklist Table */}
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {policy.ipBlocklist.map((rule) => (
              <div
                key={rule.id}
                className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                  rule.enabled
                    ? 'bg-slate-50 border-slate-200 text-slate-800'
                    : 'bg-slate-50/40 border-slate-100 text-slate-400'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() =>
                        onUpdatePolicy((prev) => ({
                          ...prev,
                          ipBlocklist: prev.ipBlocklist.map((r) =>
                            r.id === rule.id ? { ...r, enabled: !r.enabled } : r
                          ),
                        }))
                      }
                      className="accent-[#c83e37] rounded cursor-pointer"
                    />
                    <code className="font-mono font-bold text-slate-900">{rule.ipOrCidr}</code>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 pl-5 truncate">{rule.reason}</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdatePolicy((prev) => ({
                      ...prev,
                      ipBlocklist: prev.ipBlocklist.filter((r) => r.id !== rule.id),
                    }))
                  }
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
                  title="Remove IP rule"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Card: IP Conversion Rate Limiting */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900">
                  IP Conversion Rate Limiting & Bandwidth Quota
                </h3>
                <p className="text-xs text-slate-500">
                  Throttle maximum conversions and data volume per IP address within a sliding time window
                </p>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold">
              <input
                type="checkbox"
                checked={policy.ipRateLimit.enabled}
                onChange={(e) =>
                  onUpdatePolicy((prev) => ({
                    ...prev,
                    ipRateLimit: { ...prev.ipRateLimit, enabled: e.target.checked },
                  }))
                }
                className="accent-[#c83e37] rounded"
              />
              <span>{policy.ipRateLimit.enabled ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>

          {/* Live Quota Progress Meter for Current IP */}
          <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Quota Usage for <code className="text-white font-bold">{policy.currentClientIp}</code>
              </span>
              <span
                className={`font-mono font-bold ${
                  ipEval.isRateLimited ? 'text-red-400' : 'text-emerald-400'
                }`}
              >
                {ipEval.conversionsUsedInWindow} / {policy.ipRateLimit.maxConversionsPerWindow}{' '}
                conversions ({ipEval.conversionsRemaining} left)
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-200 rounded-full ${
                  ipEval.isRateLimited
                    ? 'bg-red-500'
                    : ipEval.conversionsUsedInWindow /
                        Math.max(1, policy.ipRateLimit.maxConversionsPerWindow) >
                      0.75
                    ? 'bg-amber-400'
                    : 'bg-emerald-500'
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    (ipEval.conversionsUsedInWindow /
                      Math.max(1, policy.ipRateLimit.maxConversionsPerWindow)) *
                      100
                  )}%`,
                }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
              <span>
                Bandwidth Used: <strong className="text-slate-200">{formatBytes(ipEval.bytesUsedInWindow)}</strong> /{' '}
                {policy.ipRateLimit.maxBytesPerWindowMB} MB
              </span>
              <span>Window resets in: <strong className="text-slate-200">{ipEval.resetInSeconds}s</strong></span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <ResponsiveActionButton
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                label="Reset IP Quota Counter"
                tooltipText="Clear recorded conversion timestamps for current IP"
                breakpoint={640}
                onClick={() => onResetIpQuota(policy.currentClientIp)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700"
              />
              <ResponsiveActionButton
                icon={<Lock className="w-3.5 h-3.5 text-amber-400" />}
                label="Set Strict Limit (2 / min)"
                tooltipText="Set max conversions to 2 per 60s to easily test IP rate limiting"
                breakpoint={640}
                onClick={() =>
                  onUpdatePolicy((prev) => ({
                    ...prev,
                    ipRateLimit: {
                      ...prev.ipRateLimit,
                      enabled: true,
                      maxConversionsPerWindow: 2,
                      windowSeconds: 60,
                    },
                  }))
                }
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-xs font-bold text-amber-300 border border-amber-500/40"
              />
            </div>
          </div>

          {/* Rate Limit Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Max Conversions / Window
              </label>
              <input
                type="number"
                min={1}
                max={1000}
                value={policy.ipRateLimit.maxConversionsPerWindow}
                onChange={(e) =>
                  onUpdatePolicy((prev) => ({
                    ...prev,
                    ipRateLimit: {
                      ...prev.ipRateLimit,
                      maxConversionsPerWindow: Math.max(1, Number(e.target.value) || 1),
                    },
                  }))
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Time Window (Seconds)
              </label>
              <input
                type="number"
                min={5}
                max={86400}
                value={policy.ipRateLimit.windowSeconds}
                onChange={(e) =>
                  onUpdatePolicy((prev) => ({
                    ...prev,
                    ipRateLimit: {
                      ...prev.ipRateLimit,
                      windowSeconds: Math.max(5, Number(e.target.value) || 60),
                    },
                  }))
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Max Volume / Window (MB)
              </label>
              <input
                type="number"
                min={1}
                max={10000}
                value={policy.ipRateLimit.maxBytesPerWindowMB}
                onChange={(e) =>
                  onUpdatePolicy((prev) => ({
                    ...prev,
                    ipRateLimit: {
                      ...prev.ipRateLimit,
                      maxBytesPerWindowMB: Math.max(1, Number(e.target.value) || 100),
                    },
                  }))
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-800"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ==================== SECTION 2: FILENAME FILTERING & SHA-256 HASH BLOCKING ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Filename Text & Regex Filter Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FileCode2 className="w-5 h-5 text-[#c83e37]" />
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900">
                  Filename Blocking (Text Substring & Regex Filter)
                </h3>
                <p className="text-xs text-slate-500">
                  Block files whose name matches a plain-text keyword or regular expression
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
              {policy.filenameRules.filter((r) => r.enabled).length} active
            </span>
          </div>

          {/* Add Filename Filter Form */}
          <form onSubmit={handleAddFilenameRule} className="space-y-2.5 text-xs">
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={newFnMode}
                onChange={(e) => setNewFnMode(e.target.value as 'text' | 'regex')}
                className="px-3 py-2 border border-slate-300 rounded-lg font-bold bg-slate-50 text-slate-800"
              >
                <option value="text">Text Substring</option>
                <option value="regex">Regex Pattern</option>
              </select>
              <input
                type="text"
                value={newFnPattern}
                onChange={(e) => setNewFnPattern(e.target.value)}
                placeholder={
                  newFnMode === 'regex'
                    ? 'Regex e.g. ^draft_\\d+ or \\.(exe|scr)$'
                    : 'Substring e.g. confidential, secret'
                }
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-[#c83e37]"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-lg bg-[#c83e37] hover:bg-[#b2342d] text-white font-bold flex items-center justify-center gap-1 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Filter</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <input
                type="text"
                value={newFnReason}
                onChange={(e) => setNewFnReason(e.target.value)}
                placeholder="Custom block reason (optional)..."
                className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
              />
              <label className="inline-flex items-center gap-1.5 text-slate-600 cursor-pointer px-2">
                <input
                  type="checkbox"
                  checked={newFnCaseSensitive}
                  onChange={(e) => setNewFnCaseSensitive(e.target.checked)}
                  className="accent-[#c83e37] rounded"
                />
                <span>Case-sensitive</span>
              </label>
            </div>
          </form>

          {/* Live Filename Rule Tester */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-600 flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-[#c83e37]" />
                <span>Live Filename Filter Tester:</span>
              </span>
              {matchedFilenameRule ? (
                <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[11px]">
                  BLOCKED ({matchedFilenameRule.mode.toUpperCase()}: {matchedFilenameRule.pattern})
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                  ALLOWED
                </span>
              )}
            </div>
            <input
              type="text"
              value={testFilenameInput}
              onChange={(e) => setTestFilenameInput(e.target.value)}
              placeholder="Type a filename to test against active rules..."
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs"
            />
          </div>

          {/* Rules List */}
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {policy.filenameRules.map((rule) => (
              <div
                key={rule.id}
                className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() =>
                        onUpdatePolicy((prev) => ({
                          ...prev,
                          filenameRules: prev.filenameRules.map((r) =>
                            r.id === rule.id ? { ...r, enabled: !r.enabled } : r
                          ),
                        }))
                      }
                      className="accent-[#c83e37] rounded cursor-pointer"
                    />
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                        rule.mode === 'regex'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {rule.mode}
                    </span>
                    <code className="font-mono font-bold text-slate-900 truncate">
                      {rule.mode === 'regex' ? `/${rule.pattern}/` : `"${rule.pattern}"`}
                    </code>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 pl-5 truncate">{rule.reason}</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdatePolicy((prev) => ({
                      ...prev,
                      filenameRules: prev.filenameRules.filter((r) => r.id !== rule.id),
                    }))
                  }
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* SHA-256 File Hash Blocklist Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-[#c83e37]" />
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900">
                  SHA-256 Cryptographic File Hash Blocklist
                </h3>
                <p className="text-xs text-slate-500">
                  Computes exact SHA-256 digest of every uploaded file before queuing and blocks matching signatures
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
              {policy.sha256Rules.filter((r) => r.enabled).length} hashes
            </span>
          </div>

          {/* Compute SHA-256 from any File to Block */}
          <div className="p-3.5 rounded-xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs">
              <div className="font-bold text-slate-100">
                Block a File by Computing its SHA-256 Hash
              </div>
              <p className="text-[11px] text-slate-400">
                Select any local file to calculate its SHA-256 digest and add it directly to the blocklist
              </p>
            </div>
            <input
              ref={shaFileInputRef}
              type="file"
              onChange={handleHashFileAndBlock}
              className="hidden"
            />
            <ResponsiveActionButton
              icon={<Upload className="w-3.5 h-3.5 text-[#e0524a]" />}
              label={hashingFile ? 'Computing SHA-256...' : 'Select File to Block Hash'}
              tooltipText="Pick any file from disk to compute & block its SHA-256 hash"
              breakpoint={640}
              onClick={() => shaFileInputRef.current?.click()}
              className="px-3 py-2 rounded-lg bg-[#252f3d] hover:bg-slate-800 border border-slate-600 text-xs font-bold text-white"
            />
          </div>

          {/* Manual SHA-256 Input Form */}
          <form onSubmit={handleAddShaRule} className="space-y-2 text-xs">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newShaHash}
                onChange={(e) => setNewShaHash(e.target.value)}
                placeholder="64-character hex SHA-256 hash..."
                pattern="[a-fA-F0-9]{64}"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg font-mono text-[11px] focus:outline-none focus:border-[#c83e37]"
              />
              <input
                type="text"
                value={newShaLabel}
                onChange={(e) => setNewShaLabel(e.target.value)}
                placeholder="Label / Threat Name"
                className="sm:w-40 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#c83e37]"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-lg bg-[#c83e37] hover:bg-[#b2342d] text-white font-bold flex items-center justify-center gap-1 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Hash</span>
              </button>
            </div>
          </form>

          {/* SHA-256 Rules List */}
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {policy.sha256Rules.map((rule) => (
              <div
                key={rule.id}
                className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() =>
                        onUpdatePolicy((prev) => ({
                          ...prev,
                          sha256Rules: prev.sha256Rules.map((r) =>
                            r.id === rule.id ? { ...r, enabled: !r.enabled } : r
                          ),
                        }))
                      }
                      className="accent-[#c83e37] rounded cursor-pointer"
                    />
                    <span className="font-semibold text-slate-800 truncate">{rule.label}</span>
                  </div>
                  <code className="block font-mono text-[10px] text-slate-500 mt-0.5 pl-5 truncate">
                    {rule.sha256}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdatePolicy((prev) => ({
                      ...prev,
                      sha256Rules: prev.sha256Rules.filter((r) => r.id !== rule.id),
                    }))
                  }
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ==================== SECTION 3: FILE TYPE, CATEGORY & SIZE BLOCKING ==================== */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FileX2 className="w-5 h-5 text-[#c83e37]" />
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900">
                File Type (Extension), Format Category & File Size Blocking
              </h3>
              <p className="text-xs text-slate-500">
                Click any extension or category pill to toggle blocking, or add custom blocked extensions
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Blocked Extensions */}
          <div className="lg:col-span-2 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Blocked File Extensions ({policy.blockedExtensions.length} blocked)
            </div>
            <div className="flex flex-wrap gap-1.5">
              { Array.from(new Set([...QUICK_EXT_TOGGLES, ...policy.blockedExtensions])).map(
                (ext) => {
                  const isBlocked = policy.blockedExtensions.includes(ext);
                  return (
                    <button
                      key={ext}
                      type="button"
                      onClick={() => handleToggleExtension(ext)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold uppercase flex items-center gap-1 border transition-all cursor-pointer ${
                        isBlocked
                          ? 'bg-red-600 text-white border-red-700 shadow-2xs'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {isBlocked ? <Ban className="w-3 h-3" /> : <Unlock className="w-3 h-3 text-slate-400" />}
                      <span>.{ext}</span>
                    </button>
                  );
                }
              )}
            </div>

            <form onSubmit={handleAddCustomExt} className="flex gap-2 pt-1 max-w-sm">
              <input
                type="text"
                value={customExtInput}
                onChange={(e) => setCustomExtInput(e.target.value)}
                placeholder="Add extension to block (e.g. iso, dmg, vbs)..."
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer"
              >
                + Block .EXT
              </button>
            </form>
          </div>

          {/* Blocked Categories & Size Limits */}
          <div className="space-y-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Block Entire Format Category
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(CATEGORY_LABELS) as FormatCategory[]).map((cat) => {
                  const isBlocked = policy.blockedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleToggleCategory(cat)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                        isBlocked
                          ? 'bg-red-600 text-white border-red-700'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Max Allowed Input File Size (MB)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={policy.maxFileSizeMB ?? ''}
                  onChange={(e) =>
                    onUpdatePolicy((prev) => ({
                      ...prev,
                      maxFileSizeMB: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                  placeholder="Unlimited"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={policy.blockEmptyFiles}
                  onChange={(e) =>
                    onUpdatePolicy((prev) => ({ ...prev, blockEmptyFiles: e.target.checked }))
                  }
                  className="accent-[#c83e37] rounded"
                />
                <span>Block Empty (0-Byte) Files Automatically</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== SECTION 4: BLOCKED EVENTS AUDIT LOG ==================== */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-red-600" />
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900">
                Blocked File Events Log ({blockedLogs.length})
              </h3>
              <p className="text-xs text-slate-500">
                Log of blocked file events (detection method & block reason are intentionally omitted to prevent circumvention)
              </p>
            </div>
          </div>
          {blockedLogs.length > 0 && (
            <button
              type="button"
              onClick={onClearBlockedLogs}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Clear Log
            </button>
          )}
        </div>

        {blockedLogs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p>No blocked attempts recorded yet. Use the test buttons at the top right to trigger a block event.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                  <th className="py-2 px-3">Time</th>
                  <th className="py-2 px-3">Client IP</th>
                  <th className="py-2 px-3">File Name</th>
                  <th className="py-2 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {blockedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-red-50/40">
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2 px-3 font-mono font-semibold text-slate-800 whitespace-nowrap">
                      {log.clientIp}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900">
                      <div>{log.fileName}</div>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-200 font-bold text-[10px] uppercase">
                        Blocked File &lsquo;{log.fileName}&rsquo;
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
