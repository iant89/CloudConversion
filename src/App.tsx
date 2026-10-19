import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Download,
  Trash2,
  Pause,
  Play,
  ShieldAlert,
  CheckCircle2,
  FolderPlus,
  Sparkles,
  Lock,
  ArrowUpDown,
  Gauge,
  RefreshCw,
  XCircle,
  ShieldCheck,
  Zap,
  Globe,
  FileCheck,
  SlidersHorizontal,
  Ban,
  Settings2,
  History,
} from 'lucide-react';
import {
  BlockedEventLog,
  ConversionQueueItem,
  ConversionOptions,
  ConversionSpeed,
  HistoryActionType,
  HistoryLogEntry,
  IpUsageRecord,
  SecurityPolicyConfig,
  TelemetryPoint,
} from './types/conversion';
import {
  extractFileParts,
  getFormatDefinition,
  getDefaultTargetFormat,
  getDefaultOptionsForTarget,
  formatBytes,
} from './data/formats';
import {
  enforceQueueInvariant,
  getFirstUnfinishedIndex,
  reorderQueueItems,
  isUnfinishedStatus,
} from './utils/queueOrdering';
import { runFileConversion, ConversionError } from './utils/conversionEngine';
import { createDemoQueueBatch, SAMPLE_PRESETS } from './utils/sampleFiles';
import {
  evaluateIpAccess,
  getDefaultSecurityPolicy,
  inspectFileAgainstSecurityPolicy,
  sha256BytesSync,
} from './utils/securityPolicy';
import { Navbar, ActiveAppTab } from './components/Navbar';
import { HeroDropzone } from './components/HeroDropzone';
import { QueueItemRow } from './components/QueueItemRow';
import { ConversionOptionsModal } from './components/ConversionOptionsModal';
import { FilePreviewModal } from './components/FilePreviewModal';
import { FileInfoStatsModal } from './components/FileInfoStatsModal';
import { ConfirmActionModal, ConfirmDialogState } from './components/ConfirmActionModal';
import { SupportedFormatsView } from './components/SupportedFormatsView';
import { SecurityPolicyView } from './components/SecurityPolicyView';
import {
  HistoryModal,
  createInitialHistoryEntries,
  formatHistoryTimestamp,
} from './components/HistoryModal';
import { ResponsiveActionButton } from './components/Tooltip';

let nextIdCounter = 1;
function generateQueueId(): string {
  return `cc-job-${Date.now()}-${nextIdCounter++}`;
}

function generateMockTelemetry(steps = 16, baseMbps = 24.5): TelemetryPoint[] {
  const pts: TelemetryPoint[] = [];
  for (let i = 1; i <= steps; i++) {
    const pct = Math.min(100, Math.round((i / steps) * 100));
    const ramp = Math.sin((i / steps) * Math.PI);
    const mbps = Number((baseMbps * (0.7 + 0.45 * ramp) + Math.sin(i * 1.1) * 3.2).toFixed(2));
    pts.push({
      step: i,
      elapsedMs: i * 180,
      progress: pct,
      mbps,
      stage: pct < 100 ? `Transcoding stream (${pct}%)` : 'Finished',
    });
  }
  return pts;
}

function buildQueueItemFromFile(
  file: File,
  overrideTargetExt?: string,
  sha256?: string,
  clientIp?: string
): ConversionQueueItem {
  const { baseName, ext } = extractFileParts(file.name);
  const sourceDef = getFormatDefinition(ext);
  const targetDef = overrideTargetExt
    ? getFormatDefinition(overrideTargetExt)
    : getDefaultTargetFormat(ext);

  const isZeroByteCorrupted = file.size === 0;
  const computedSha =
    sha256 || sha256BytesSync(new TextEncoder().encode(`${file.name}:${file.size}`));

  return {
    id: generateQueueId(),
    file,
    fileName: file.name,
    baseName,
    sourceExt: sourceDef.ext,
    sourceCategory: sourceDef.category,
    fileSize: file.size,
    targetExt: targetDef.ext,
    targetCategory: targetDef.category,
    status: 'queued',
    progress: 0,
    stageLabel: 'Waiting in conversion queue...',
    options: getDefaultOptionsForTarget(targetDef.category),
    createdAt: Date.now(),
    isCorrupted: isZeroByteCorrupted,
    telemetry: [],
    sha256: computedSha,
    clientIp: clientIp || '198.51.100.42',
  };
}

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveAppTab>('converter');
  const [securityPolicy, setSecurityPolicy] = useState<SecurityPolicyConfig>(() =>
    getDefaultSecurityPolicy()
  );
  const [ipUsageMap, setIpUsageMap] = useState<Record<string, IpUsageRecord>>({});
  const [blockedLogs, setBlockedLogs] = useState<BlockedEventLog[]>([]);
  const [latestBlockAlert, setLatestBlockAlert] = useState<BlockedEventLog | null>(null);

  // Action & Conversion History Log state
  const [historyEntries, setHistoryEntries] = useState<HistoryLogEntry[]>(() =>
    createInitialHistoryEntries()
  );
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  const [queue, setQueue] = useState<ConversionQueueItem[]>(() => {
    const starterFiles = SAMPLE_PRESETS.slice(0, 3).map((p) => p.createFile());
    return enforceQueueInvariant(starterFiles.map((f) => buildQueueItemFromFile(f)));
  });
  const [autoConvert, setAutoConvert] = useState<boolean>(true);
  const [speed, setSpeed] = useState<ConversionSpeed>('normal');

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [orderNotice, setOrderNotice] = useState<string | null>(null);

  // Modals & Popovers state
  const [optionsModalItemId, setOptionsModalItemId] = useState<string | null>(null);
  const [previewModalItemId, setPreviewModalItemId] = useState<string | null>(null);
  const [infoModalItemId, setInfoModalItemId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [openDropdownCount, setOpenDropdownCount] = useState<number>(0);

  // Periodic tick so rate-limit countdown updates smoothly
  const [, setClockTick] = useState(0);
  useEffect(() => {
    const interval = window.setInterval(() => setClockTick((t) => t + 1), 1000);
    return () => window.clearInterval(interval);
  }, []);

  // Track active AbortControllers by item ID
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const activeConvertingIdRef = useRef<string | null>(null);
  const bottomFileInputRef = useRef<HTMLInputElement>(null);

  // Append an entry to the History Modal log
  const appendHistoryLog = useCallback(
    (
      actionType: HistoryActionType,
      message: string,
      opts?: {
        fileName?: string;
        targetFileName?: string;
        details?: string;
        clientIp?: string;
      }
    ) => {
      const now = Date.now();
      const entry: HistoryLogEntry = {
        id: `hist-${now}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: now,
        formattedDate: formatHistoryTimestamp(now),
        actionType,
        message,
        fileName: opts?.fileName,
        targetFileName: opts?.targetFileName,
        details: opts?.details,
        clientIp: opts?.clientIp || securityPolicy.currentClientIp,
      };
      setHistoryEntries((prev) => [entry, ...prev]);
    },
    [securityPolicy.currentClientIp]
  );

  const showNotice = useCallback((msg: string) => {
    setOrderNotice(msg);
  }, []);

  useEffect(() => {
    if (!orderNotice) return;
    const t = window.setTimeout(() => setOrderNotice(null), 5500);
    return () => window.clearTimeout(t);
  }, [orderNotice]);

  // Record IP conversion usage for rate limiting
  const recordIpConversionUsage = useCallback((ip: string, fileSize: number) => {
    const now = Date.now();
    setIpUsageMap((prev) => {
      const existing = prev[ip] || {
        ip,
        conversionTimestamps: [],
        bytesRecords: [],
      };
      return {
        ...prev,
        [ip]: {
          ip,
          conversionTimestamps: [...existing.conversionTimestamps, now],
          bytesRecords: [...existing.bytesRecords, { timestamp: now, bytes: fileSize }],
        },
      };
    });
  }, []);

  const handleResetIpQuota = useCallback(
    (ip?: string) => {
      if (!ip) {
        setIpUsageMap({});
      } else {
        setIpUsageMap((prev) => {
          const next = { ...prev };
          delete next[ip];
          return next;
        });
      }
      appendHistoryLog(
        'security-updated',
        `Reset IP conversion rate-limit quota for '${ip || 'all IPs'}'`,
        { details: 'Rate limit counter cleared manually' }
      );
      showNotice(`Reset conversion rate-limit quota for IP ${ip || 'all IPs'}.`);
    },
    [appendHistoryLog, showNotice]
  );

  // Inspect & Add Uploaded Files (enforcing Filename, Regex, SHA-256, File Type, IP Block & IP Rate Limit!)
  const handleFilesAdded = useCallback(
    async (files: File[], overrideTargetExt?: string) => {
      if (!files || files.length === 0) return;

      const allowedItems: ConversionQueueItem[] = [];
      const newBlockedEvents: BlockedEventLog[] = [];
      let simulatedIpUsage = { ...ipUsageMap };

      for (const file of files) {
        const now = Date.now();
        const inspection = await inspectFileAgainstSecurityPolicy(
          file,
          securityPolicy,
          simulatedIpUsage,
          now
        );

        if (!inspection.allowed && inspection.blockedEvent) {
          newBlockedEvents.push(inspection.blockedEvent);
          appendHistoryLog('blocked', `Blocked File '${file.name}'`, {
            fileName: file.name,
            clientIp: inspection.blockedEvent.clientIp,
          });
        } else {
          const clientIp = securityPolicy.currentClientIp.trim() || '127.0.0.1';
          const existing = simulatedIpUsage[clientIp] || {
            ip: clientIp,
            conversionTimestamps: [],
            bytesRecords: [],
          };
          simulatedIpUsage = {
            ...simulatedIpUsage,
            [clientIp]: {
              ip: clientIp,
              conversionTimestamps: [...existing.conversionTimestamps, now],
              bytesRecords: [
                ...existing.bytesRecords,
                { timestamp: now, bytes: file.size },
              ],
            },
          };

          const built = buildQueueItemFromFile(
            file,
            overrideTargetExt,
            inspection.sha256,
            clientIp
          );
          allowedItems.push(built);
          appendHistoryLog(
            'queued',
            `Queued '${built.fileName}' for conversion to '${built.baseName}.${built.targetExt}'`,
            {
              fileName: built.fileName,
              targetFileName: `${built.baseName}.${built.targetExt}`,
              details: `Source size: ${formatBytes(built.fileSize)} • SHA-256: ${built.sha256?.slice(
                0,
                14
              )}...`,
              clientIp,
            }
          );
        }
      }

      if (newBlockedEvents.length > 0) {
        setBlockedLogs((prev) => [...newBlockedEvents, ...prev]);
        setLatestBlockAlert(newBlockedEvents[0]);
      }

      if (allowedItems.length > 0) {
        setQueue((prev) => enforceQueueInvariant([...prev, ...allowedItems]));
      }

      setActiveTab('converter');
    },
    [securityPolicy, ipUsageMap, appendHistoryLog]
  );

  const handleLoadDemoBatch = useCallback(() => {
    const demoFiles = createDemoQueueBatch();
    handleFilesAdded(demoFiles);
  }, [handleFilesAdded]);

  // Block a file's SHA-256 hash directly from the File Info Modal
  const handleBlockFileSha256 = useCallback(
    (sha256: string, fileName: string) => {
      setSecurityPolicy((prev) => {
        if (prev.sha256Rules.some((r) => r.sha256.toLowerCase() === sha256.toLowerCase())) {
          return prev;
        }
        return {
          ...prev,
          sha256Rules: [
            {
              id: `sha-${Date.now()}`,
              sha256: sha256.toLowerCase(),
              label: `${fileName} (Blocked from Queue Info)`,
              enabled: true,
              createdAt: Date.now(),
            },
            ...prev.sha256Rules,
          ],
        };
      });
      appendHistoryLog(
        'security-updated',
        `Added SHA-256 hash block rule for '${fileName}'`,
        {
          fileName,
          details: `Blocked SHA-256: ${sha256}`,
        }
      );
      showNotice(
        `Added SHA-256 hash (${sha256.slice(0, 12)}...) for "${fileName}" to the SHA-256 Blocklist!`
      );
    },
    [appendHistoryLog, showNotice]
  );

  // Helper to stage a mixed queue with Finished, Cancelled, Failed (Intact/Retryable), Failed (Corrupted), Converting, and Waiting items
  const handleStageReorderDemo = useCallback(() => {
    const files = createDemoQueueBatch();
    const aviItem = buildQueueItemFromFile(files[0], 'mp4');
    const finishedBlob = new Blob(['MP4_DEMO_CONTAINER_PAYLOAD'.repeat(1200)], {
      type: 'video/mp4',
    });
    const mockPts = generateMockTelemetry(18, 28.4);
    aviItem.status = 'finished';
    aviItem.progress = 100;
    aviItem.stageLabel = 'Finished';
    aviItem.startedAt = Date.now() - 3400;
    aviItem.completedAt = Date.now();
    aviItem.convertedBlob = finishedBlob;
    aviItem.convertedUrl = URL.createObjectURL(finishedBlob);
    aviItem.convertedFileName = `${aviItem.baseName}.mp4`;
    aviItem.convertedSize = 148200;
    aviItem.telemetry = mockPts;
    aviItem.avgMbps = 27.6;
    aviItem.peakMbps = 36.2;

    const cancelledItem = buildQueueItemFromFile(
      new File(['CANCELLED_SAMPLE'.repeat(800)], 'archived_recording.mkv'),
      'mp4'
    );
    cancelledItem.status = 'cancelled';
    cancelledItem.progress = 44;
    cancelledItem.stageLabel = 'Cancelled by user at 44%';
    cancelledItem.telemetry = generateMockTelemetry(8, 21.0).map((t, i) => ({
      ...t,
      progress: (i + 1) * 5,
    }));
    cancelledItem.avgMbps = 20.4;
    cancelledItem.peakMbps = 25.8;

    const failedRetryableItem = buildQueueItemFromFile(
      new File(['VALID_SOURCE_STREAM_PAYLOAD'.repeat(600)], 'interview_take_2.mov'),
      'mp4'
    );
    failedRetryableItem.status = 'failed';
    failedRetryableItem.progress = 52;
    failedRetryableItem.isCorrupted = false;
    failedRetryableItem.stageLabel = 'Conversion failed';
    failedRetryableItem.errorMessage =
      'Transient encoder buffer timeout at 52%. Source document is intact and ready to retry.';
    failedRetryableItem.telemetry = generateMockTelemetry(10, 19.5).map((t, i) => ({
      ...t,
      progress: (i + 1) * 5,
    }));
    failedRetryableItem.avgMbps = 19.2;
    failedRetryableItem.peakMbps = 24.7;

    const failedCorruptedItem = buildQueueItemFromFile(
      new File([''], 'corrupted_zero_byte_scan.pdf'),
      'docx'
    );
    failedCorruptedItem.status = 'failed';
    failedCorruptedItem.progress = 8;
    failedCorruptedItem.isCorrupted = true;
    failedCorruptedItem.stageLabel = 'Corrupted document';
    failedCorruptedItem.errorMessage =
      'Source document header is corrupted (0-byte payload) and cannot be decoded or retried.';
    failedCorruptedItem.telemetry = [
      { step: 1, elapsedMs: 180, progress: 8, mbps: 4.2, stage: 'Header validation failed' },
    ];
    failedCorruptedItem.avgMbps = 4.2;
    failedCorruptedItem.peakMbps = 4.2;

    const queued1 = buildQueueItemFromFile(files[1], 'pdf');
    const queued2 = buildQueueItemFromFile(files[2], 'mp3');
    const queued3 = buildQueueItemFromFile(files[3], 'webp');

    abortControllersRef.current.forEach((ctrl) => ctrl.abort());
    abortControllersRef.current.clear();
    activeConvertingIdRef.current = null;

    setSpeed('realistic');
    setAutoConvert(true);
    setQueue(
      enforceQueueInvariant([
        aviItem,
        cancelledItem,
        failedRetryableItem,
        failedCorruptedItem,
        queued1,
        queued2,
        queued3,
      ])
    );
    appendHistoryLog(
      'queued',
      `Loaded diagnostic mixed queue (Finished, Cancelled, Failed, Converting, and Waiting items)`,
      { details: '7 test items staged in queue' }
    );
    showNotice(
      'Loaded mixed queue with Finished, Cancelled, Failed (Retryable & Corrupted), Converting, and Waiting items!'
    );
  }, [appendHistoryLog, showNotice]);

  // Start converting a specific item (checking IP access & rate limit first)
  const startItemConversion = useCallback(
    (itemToConvert: ConversionQueueItem) => {
      if (activeConvertingIdRef.current === itemToConvert.id) return;

      const ipCheck = evaluateIpAccess(
        securityPolicy,
        ipUsageMap,
        Date.now(),
        1,
        itemToConvert.fileSize
      );
      if (!ipCheck.allowed) {
        const blockEvt: BlockedEventLog = {
          id: `blk-${Date.now()}`,
          timestamp: Date.now(),
          fileName: itemToConvert.fileName,
          fileSize: itemToConvert.fileSize,
          sha256: itemToConvert.sha256,
          clientIp: ipCheck.clientIp,
          blockCategory: ipCheck.isIpBlocked ? 'ip-blocked' : 'ip-rate-limit',
          matchedRule: ipCheck.matchedIpRule
            ? `IP Block: ${ipCheck.matchedIpRule.ipOrCidr}`
            : `IP Quota: ${securityPolicy.ipRateLimit.maxConversionsPerWindow}/${securityPolicy.ipRateLimit.windowSeconds}s`,
          reason: ipCheck.reason || 'Conversion blocked by IP policy',
        };
        setBlockedLogs((prev) => [blockEvt, ...prev]);
        setLatestBlockAlert(blockEvt);
        appendHistoryLog('blocked', `Blocked File '${itemToConvert.fileName}'`, {
          fileName: itemToConvert.fileName,
          clientIp: ipCheck.clientIp,
        });
        setAutoConvert(false);
        return;
      }

      recordIpConversionUsage(ipCheck.clientIp, itemToConvert.fileSize);

      const controller = new AbortController();
      abortControllersRef.current.set(itemToConvert.id, controller);
      activeConvertingIdRef.current = itemToConvert.id;

      setQueue((prev) =>
        enforceQueueInvariant(
          prev.map((it) =>
            it.id === itemToConvert.id
              ? {
                  ...it,
                  status: 'converting',
                  progress: 2,
                  stageLabel: `Initializing .${it.sourceExt.toUpperCase()} → .${it.targetExt.toUpperCase()} transcoder...`,
                  startedAt: Date.now(),
                  completedAt: undefined,
                  errorMessage: undefined,
                  telemetry: [],
                }
              : it
          )
        )
      );

      runFileConversion(
        itemToConvert,
        speed,
        (progress, stageLabel, telemetryPoint) => {
          setQueue((prev) =>
            prev.map((it) => {
              if (it.id !== itemToConvert.id || it.status !== 'converting') return it;
              const nextTelemetry = [...it.telemetry, telemetryPoint];
              const mbpsArr = nextTelemetry.map((p) => p.mbps);
              const avgMbps = Number(
                (mbpsArr.reduce((a, b) => a + b, 0) / mbpsArr.length).toFixed(2)
              );
              const peakMbps = Number(Math.max(...mbpsArr).toFixed(2));
              return {
                ...it,
                progress,
                stageLabel,
                telemetry: nextTelemetry,
                avgMbps,
                peakMbps,
              };
            })
          );
        },
        controller.signal
      )
        .then((result) => {
          abortControllersRef.current.delete(itemToConvert.id);
          if (activeConvertingIdRef.current === itemToConvert.id) {
            activeConvertingIdRef.current = null;
          }
          const blobUrl = URL.createObjectURL(result.blob);
          setQueue((prev) =>
            enforceQueueInvariant(
              prev.map((it) => {
                if (it.id !== itemToConvert.id) return it;
                if (it.convertedUrl) URL.revokeObjectURL(it.convertedUrl);
                return {
                  ...it,
                  status: 'finished',
                  progress: 100,
                  stageLabel: 'Finished',
                  completedAt: Date.now(),
                  convertedBlob: result.blob,
                  convertedUrl: blobUrl,
                  convertedFileName: result.fileName,
                  convertedSize: result.size,
                  avgMbps: result.avgMbps,
                  peakMbps: result.peakMbps,
                };
              })
            )
          );

          appendHistoryLog(
            'converted',
            `Successfully Converted '${itemToConvert.fileName}' to '${result.fileName}'`,
            {
              fileName: itemToConvert.fileName,
              targetFileName: result.fileName,
              details: `Output size: ${formatBytes(result.size)} • Avg rate: ${result.avgMbps.toFixed(
                1
              )} Mbps (Peak: ${result.peakMbps.toFixed(1)} Mbps)`,
              clientIp: ipCheck.clientIp,
            }
          );
        })
        .catch((err: unknown) => {
          abortControllersRef.current.delete(itemToConvert.id);
          if (activeConvertingIdRef.current === itemToConvert.id) {
            activeConvertingIdRef.current = null;
          }
          const isAbort =
            err instanceof DOMException && err.name === 'AbortError';
          if (isAbort) {
            return;
          }
          const errMsg =
            err instanceof Error ? err.message : 'Unexpected conversion error';
          const isCorruptedErr =
            err instanceof ConversionError ? err.isCorrupted : false;

          setQueue((prev) =>
            enforceQueueInvariant(
              prev.map((it) =>
                it.id === itemToConvert.id
                  ? {
                      ...it,
                      status: 'failed',
                      stageLabel: isCorruptedErr ? 'Corrupted document' : 'Conversion failed',
                      errorMessage: errMsg,
                      isCorrupted: isCorruptedErr || it.isCorrupted,
                    }
                  : it
              )
            )
          );

          appendHistoryLog(
            'failed',
            `Failed to Convert '${itemToConvert.fileName}' to '${itemToConvert.baseName}.${itemToConvert.targetExt}'`,
            {
              fileName: itemToConvert.fileName,
              targetFileName: `${itemToConvert.baseName}.${itemToConvert.targetExt}`,
              details: errMsg,
              clientIp: ipCheck.clientIp,
            }
          );
        });
    },
    [speed, securityPolicy, ipUsageMap, recordIpConversionUsage, appendHistoryLog]
  );

  // Automatic Queue Scheduler Effect
  useEffect(() => {
    if (!autoConvert) return;
    if (draggedIndex !== null || openDropdownCount > 0 || confirmDialog !== null) return;

    const currentlyConverting = queue.some((item) => item.status === 'converting');
    if (currentlyConverting) return;

    const nextQueuedItem = queue.find((item) => item.status === 'queued');
    if (!nextQueuedItem) return;

    const timer = window.setTimeout(() => {
      startItemConversion(nextQueuedItem);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [queue, autoConvert, draggedIndex, openDropdownCount, confirmDialog, startItemConversion]);

  // Execute Cancel after User Confirms in Modal
  const executeCancelItem = useCallback(
    (itemId: string) => {
      const controller = abortControllersRef.current.get(itemId);
      if (controller) {
        controller.abort();
        abortControllersRef.current.delete(itemId);
      }
      if (activeConvertingIdRef.current === itemId) {
        activeConvertingIdRef.current = null;
      }

      const target = queue.find((it) => it.id === itemId);
      if (target) {
        appendHistoryLog(
          'cancelled',
          `Cancelled conversion of '${target.fileName}' to '${target.baseName}.${target.targetExt}'${
            target.status === 'converting' ? ` at ${target.progress}%` : ' while waiting in queue'
          }`,
          {
            fileName: target.fileName,
            targetFileName: `${target.baseName}.${target.targetExt}`,
            details: 'Cancelled by user confirmation • Entry retained in queue',
          }
        );
      }

      setQueue((prev) =>
        enforceQueueInvariant(
          prev.map((it) =>
            it.id === itemId
              ? {
                  ...it,
                  status: 'cancelled',
                  stageLabel:
                    it.status === 'converting'
                      ? `Cancelled by user at ${it.progress}%`
                      : 'Cancelled while waiting in queue',
                }
              : it
          )
        )
      );
    },
    [queue, appendHistoryLog]
  );

  // Execute Delete after User Confirms in Modal
  const executeDeleteItem = useCallback(
    (itemId: string) => {
      const controller = abortControllersRef.current.get(itemId);
      if (controller) {
        controller.abort();
        abortControllersRef.current.delete(itemId);
      }
      if (activeConvertingIdRef.current === itemId) {
        activeConvertingIdRef.current = null;
      }

      const target = queue.find((it) => it.id === itemId);
      if (target) {
        appendHistoryLog(
          'deleted',
          `Deleted '${target.fileName}' (status: ${target.status.toUpperCase()}) from conversion queue`,
          {
            fileName: target.fileName,
            targetFileName: `${target.baseName}.${target.targetExt}`,
            details: `File size: ${formatBytes(target.fileSize)} • Permanently removed by user confirmation`,
          }
        );
      }

      setQueue((prev) => {
        const found = prev.find((it) => it.id === itemId);
        if (found?.convertedUrl) {
          URL.revokeObjectURL(found.convertedUrl);
        }
        return enforceQueueInvariant(prev.filter((it) => it.id !== itemId));
      });
    },
    [queue, appendHistoryLog]
  );

  // Handle Confirmation Modal Submit
  const handleConfirmDialogAction = useCallback(() => {
    if (!confirmDialog) return;
    if (confirmDialog.type === 'cancel' && confirmDialog.itemId) {
      executeCancelItem(confirmDialog.itemId);
    } else if (confirmDialog.type === 'delete' && confirmDialog.itemId) {
      executeDeleteItem(confirmDialog.itemId);
    } else if (confirmDialog.type === 'cancel-all') {
      queue.forEach((it) => {
        if (isUnfinishedStatus(it.status) || it.status === 'converting') {
          executeCancelItem(it.id);
        }
      });
    }
    setConfirmDialog(null);
  }, [confirmDialog, executeCancelItem, executeDeleteItem, queue]);

  // Retry a cancelled or non-corrupted failed item
  const handleRetryItem = useCallback(
    (itemId: string) => {
      const target = queue.find((it) => it.id === itemId);
      if (target?.isCorrupted) {
        showNotice(
          `Cannot retry "${target.fileName}": Source document is corrupted.`
        );
        return;
      }

      if (target) {
        appendHistoryLog(
          'retried',
          `Retried conversion of '${target.fileName}' to '${target.baseName}.${target.targetExt}'`,
          {
            fileName: target.fileName,
            targetFileName: `${target.baseName}.${target.targetExt}`,
            details: `Re-queued from ${target.status} state`,
          }
        );
      }

      setAutoConvert(true);
      setQueue((prev) =>
        enforceQueueInvariant(
          prev.map((it) =>
            it.id === itemId
              ? {
                  ...it,
                  status: 'queued',
                  progress: 0,
                  stageLabel: 'Re-queued for conversion...',
                  errorMessage: undefined,
                  options: { ...it.options, simulateFailure: false },
                }
              : it
          )
        )
      );
    },
    [queue, showNotice, appendHistoryLog]
  );

  // Manually trigger immediate conversion for a specific queued item
  const handleStartNowItem = useCallback(
    (itemId: string) => {
      const target = queue.find((it) => it.id === itemId && it.status === 'queued');
      if (!target) return;

      const currentlyConverting = queue.some((it) => it.status === 'converting');
      if (!currentlyConverting) {
        startItemConversion(target);
      } else {
        const fromIdx = queue.findIndex((it) => it.id === itemId);
        const firstUnfinished = getFirstUnfinishedIndex(queue);
        if (fromIdx > firstUnfinished) {
          const res = reorderQueueItems(queue, fromIdx, firstUnfinished);
          setQueue(res.items);
          appendHistoryLog(
            'reordered',
            `Prioritized '${target.fileName}' to #1 in waiting queue`,
            { fileName: target.fileName }
          );
          showNotice(`Moved "${target.fileName}" to #1 in the waiting queue.`);
        }
      }
    },
    [queue, startItemConversion, showNotice, appendHistoryLog]
  );

  // Change target format from dropdown
  const handleChangeTargetFormat = useCallback(
    (itemId: string, newExt: string) => {
      const targetDef = getFormatDefinition(newExt);
      const existingController = abortControllersRef.current.get(itemId);
      if (existingController) {
        existingController.abort();
        abortControllersRef.current.delete(itemId);
      }
      if (activeConvertingIdRef.current === itemId) {
        activeConvertingIdRef.current = null;
      }

      const item = queue.find((it) => it.id === itemId);
      if (item) {
        appendHistoryLog(
          'format-changed',
          `Changed target format for '${item.fileName}' from '${item.baseName}.${item.targetExt}' to '${item.baseName}.${targetDef.ext}'`,
          {
            fileName: item.fileName,
            targetFileName: `${item.baseName}.${targetDef.ext}`,
          }
        );
      }

      setQueue((prev) =>
        enforceQueueInvariant(
          prev.map((it) => {
            if (it.id !== itemId) return it;
            if (it.convertedUrl) URL.revokeObjectURL(it.convertedUrl);
            return {
              ...it,
              targetExt: targetDef.ext,
              targetCategory: targetDef.category,
              status: 'queued',
              progress: 0,
              stageLabel: `Queued to convert to .${targetDef.ext.toUpperCase()}...`,
              convertedBlob: undefined,
              convertedUrl: undefined,
              convertedFileName: undefined,
              convertedSize: undefined,
              errorMessage: undefined,
            };
          })
        )
      );
    },
    [queue, appendHistoryLog]
  );

  // Save per-item conversion options
  const handleSaveOptions = useCallback(
    (itemId: string, updatedOptions: ConversionOptions) => {
      setQueue((prev) =>
        enforceQueueInvariant(
          prev.map((it) => {
            if (it.id !== itemId) return it;
            const shouldRequeue =
              it.status === 'finished' || it.status === 'cancelled' || it.status === 'failed';
            return {
              ...it,
              options: updatedOptions,
              isCorrupted: Boolean(updatedOptions.simulateCorrupted) || it.fileSize === 0,
              status: shouldRequeue ? 'queued' : it.status,
              progress: shouldRequeue ? 0 : it.progress,
              stageLabel: shouldRequeue
                ? 'Re-queued with updated conversion options...'
                : it.stageLabel,
            };
          })
        )
      );
    },
    []
  );

  // Download a finished file
  const handleDownloadItem = useCallback(
    (item: ConversionQueueItem) => {
      if (!item.convertedBlob) return;
      const outName = item.convertedFileName || `${item.baseName}.${item.targetExt}`;
      const url = item.convertedUrl || URL.createObjectURL(item.convertedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = outName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      appendHistoryLog(
        'downloaded',
        `Downloaded converted file '${outName}' (converted from '${item.fileName}')`,
        {
          fileName: item.fileName,
          targetFileName: outName,
          details: `Downloaded size: ${formatBytes(item.convertedSize || item.convertedBlob.size)}`,
        }
      );
    },
    [appendHistoryLog]
  );

  // Download all finished files
  const handleDownloadAllFinished = useCallback(() => {
    const finished = queue.filter((it) => it.status === 'finished' && it.convertedBlob);
    finished.forEach((it, idx) => {
      window.setTimeout(() => handleDownloadItem(it), idx * 180);
    });
  }, [queue, handleDownloadItem]);

  // Drag & Drop Handlers with strict ordering validation
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
    setDragOverIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null) return;
    const movingItem = queue[draggedIndex];
    const result = reorderQueueItems(queue, draggedIndex, targetIndex);
    setQueue(result.items);
    if (result.violationReason) {
      showNotice(result.violationReason);
    } else if (movingItem && draggedIndex !== targetIndex) {
      appendHistoryLog(
        'reordered',
        `Reordered '${movingItem.fileName}' in conversion queue (#${draggedIndex + 1} → #${
          targetIndex + 1
        })`,
        { fileName: movingItem.fileName }
      );
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleMoveItem = (fromIndex: number, toIndex: number) => {
    const movingItem = queue[fromIndex];
    const result = reorderQueueItems(queue, fromIndex, toIndex);
    setQueue(result.items);
    if (result.violationReason) {
      showNotice(result.violationReason);
    } else if (movingItem && fromIndex !== toIndex) {
      appendHistoryLog(
        'reordered',
        `Reordered '${movingItem.fileName}' in conversion queue (#${fromIndex + 1} → #${
          toIndex + 1
        })`,
        { fileName: movingItem.fileName }
      );
    }
  };

  // Counts & Derived Telemetry
  const firstUnfinishedIndex = getFirstUnfinishedIndex(queue);
  const convertingCount = queue.filter((it) => it.status === 'converting').length;
  const queuedCount = queue.filter((it) => it.status === 'queued').length;
  const finishedCount = queue.filter((it) => it.status === 'finished').length;
  const cancelledOrFailedCount = queue.filter(
    (it) => it.status === 'cancelled' || it.status === 'failed'
  ).length;
  const retryableCount = queue.filter(
    (it) =>
      it.status === 'cancelled' || (it.status === 'failed' && !it.isCorrupted)
  ).length;

  const ipEval = evaluateIpAccess(securityPolicy, ipUsageMap);

  const activePairItem =
    queue.find((it) => it.status === 'converting') ||
    queue.find((it) => it.status === 'queued') ||
    queue[0];

  const activeConversionPair = activePairItem
    ? { source: activePairItem.sourceExt, target: activePairItem.targetExt }
    : null;

  const handleDropdownOpenChange = useCallback((isOpen: boolean) => {
    setOpenDropdownCount((c) => Math.max(0, c + (isOpen ? 1 : -1)));
  }, []);

  const handleTestFormatConversion = useCallback(
    (sourceExt: string, targetExt: string) => {
      const content = `Sample .${sourceExt.toUpperCase()} document created for conversion to .${targetExt.toUpperCase()} via CloudConversion.`;
      const file = new File([content], `sample_${sourceExt}_file.${sourceExt}`, {
        type: 'application/octet-stream',
      });
      handleFilesAdded([file], targetExt);
    },
    [handleFilesAdded]
  );

  const optionsModalItem = optionsModalItemId
    ? queue.find((it) => it.id === optionsModalItemId) || null
    : null;
  const previewModalItem = previewModalItemId
    ? queue.find((it) => it.id === previewModalItemId) || null
    : null;
  const infoModalItem = infoModalItemId
    ? queue.find((it) => it.id === infoModalItemId) || null
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f6f9] text-slate-800">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenHistory={() => setShowHistoryModal(true)}
        totalCount={queue.length}
        convertingCount={convertingCount}
        queuedCount={queuedCount}
        finishedCount={finishedCount}
        blockedCount={blockedLogs.length}
        historyCount={historyEntries.length}
        clientIp={securityPolicy.currentClientIp}
        isIpBlocked={ipEval.isIpBlocked}
        conversionsRemaining={ipEval.conversionsRemaining}
        maxConversionsPerWindow={securityPolicy.ipRateLimit.maxConversionsPerWindow}
      />

      {activeTab === 'security' && (
        <SecurityPolicyView
          policy={securityPolicy}
          onUpdatePolicy={setSecurityPolicy}
          ipUsageMap={ipUsageMap}
          onResetIpQuota={handleResetIpQuota}
          blockedLogs={blockedLogs}
          onClearBlockedLogs={() => setBlockedLogs([])}
          onTestUploadFiles={(files) => handleFilesAdded(files)}
        />
      )}

      {activeTab === 'formats' && (
        <SupportedFormatsView onTestFormatConversion={handleTestFormatConversion} />
      )}

      {activeTab === 'rules' && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-[#c83e37]" />
              <span>Conversion Queue Ordering, Security & Lifecycle Rules</span>
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              CloudConversion implements a deterministic priority queue with strict ordering invariants and pre-flight security inspection:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-sm text-slate-900 flex items-center gap-2 mb-1.5">
                  <Lock className="w-4 h-4 text-[#c83e37]" />
                  <span>1. Locked Upper Zone Invariant</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  An <strong>unfinished (queued)</strong> file can never be placed above a{' '}
                  <strong>finished</strong>, <strong>cancelled</strong>, <strong>failed</strong>, or{' '}
                  <strong>currently converting</strong> file in the list. Attempting to drag an unfinished file above any of these items triggers a boundary warning and clamps it to the top of the waiting queue.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-sm text-slate-900 flex items-center gap-2 mb-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>2. Input File Blocking & IP Rate Limiting</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Every uploaded file is inspected against <strong>Filename (Text & Regex) filters</strong>,{' '}
                  <strong>SHA-256 cryptographic file hashes</strong>, <strong>File Type/Category blocklists</strong>,{' '}
                  <strong>IP / CIDR blocklists</strong>, and <strong>per-IP conversion rate quotas</strong>.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-sm text-slate-900 flex items-center gap-2 mb-1.5">
                  <Trash2 className="w-4 h-4 text-emerald-600" />
                  <span>3. Confirmation & Persistent Queue History</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Both <strong>Cancel</strong> and <strong>Delete</strong> ask for confirmation before acting. Items remain in the queue when finished, cancelled, or failed until explicitly deleted, and all actions are logged in the <strong>History</strong> modal.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-sm text-slate-900 flex items-center gap-2 mb-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>4. Error Diagnostics & Mbps Telemetry</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Every file has an <strong>Info</strong> modal with before/after statistics, SHA-256 hash, and a live <strong>Mbps conversion rate graph</strong>. Failed entries display a tooltip-style error pointing at the entry and allow retrying if the document is not corrupted.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'converter' && (
        <>
          {/* CloudConvert Hero & File Upload Dropzone */}
          <HeroDropzone
            onFilesAdded={handleFilesAdded}
            onLoadDemoBatch={handleLoadDemoBatch}
            activeConversionPair={activeConversionPair}
          />

          {/* Main Conversion Queue Workspace */}
          <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex-1">
            {/* Security / IP Block / File Rejected Alert Banner */}
            {latestBlockAlert && (
              <div
                role="alert"
                className="mb-4 p-4 rounded-xl bg-[#2a1215] text-red-50 border-2 border-red-500 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                <div className="flex items-start gap-3 text-xs sm:text-sm">
                  <Ban className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-red-600 text-white font-extrabold text-[10px] uppercase tracking-wider">
                        BLOCKED
                      </span>
                      <strong className="text-white">
                        Blocked File &lsquo;{latestBlockAlert.fileName}&rsquo;
                      </strong>
                      <span className="text-xs text-red-300 font-mono">
                        (IP: {latestBlockAlert.clientIp})
                      </span>
                    </div>
                    <p className="text-xs text-red-100/95">
                      This file was blocked from conversion.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <ResponsiveActionButton
                    icon={<History className="w-3.5 h-3.5" />}
                    label="View in History"
                    tooltipText="Open History modal to inspect blocked events"
                    breakpoint={640}
                    onClick={() => setShowHistoryModal(true)}
                    className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/20"
                  />
                  <ResponsiveActionButton
                    icon={<Settings2 className="w-3.5 h-3.5" />}
                    label="Manage Security Rules"
                    tooltipText="Open Security, File Blocking & IP Rate Limit settings"
                    breakpoint={640}
                    onClick={() => setActiveTab('security')}
                    className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/20"
                  />
                  <button
                    type="button"
                    onClick={() => setLatestBlockAlert(null)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-200 hover:text-white hover:bg-white/10 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Ordering Rule Violation Alert Toast */}
            {orderNotice && (
              <div
                role="alert"
                className="mb-4 px-4 py-3 rounded-xl bg-amber-950 text-amber-100 border border-amber-700 shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
                  <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>{orderNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOrderNotice(null)}
                  className="text-xs text-amber-300 hover:text-white px-2 py-1 rounded"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Queue Control Toolbar */}
            <div className="bg-white rounded-t-xl border border-slate-200 px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h2 className="font-bold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                  <span>Conversion Queue</span>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold">
                    {queue.length} {queue.length === 1 ? 'file' : 'files'}
                  </span>
                </h2>

                {/* IP Rate Limit & Security Status Pill */}
                <button
                  type="button"
                  onClick={() => setActiveTab('security')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-colors cursor-pointer ${
                    !ipEval.allowed
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                  title="Click to configure Input File Blocking, SHA-256 Hashes, IP Blocklist & Conversion Rate Limits"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-[#c83e37]" />
                  <span>
                    IP {securityPolicy.currentClientIp}: {ipEval.conversionsUsedInWindow}/
                    {securityPolicy.ipRateLimit.maxConversionsPerWindow} conversions (
                    {ipEval.resetInSeconds}s window)
                  </span>
                </button>
              </div>

              {/* Right Queue Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Speed Selector */}
                <div className="inline-flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs">
                  <span className="px-2 py-1 text-slate-500 font-medium hidden sm:inline-flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5" />
                    Speed:
                  </span>
                  {(['fast', 'normal', 'realistic'] as ConversionSpeed[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSpeed(s)}
                      className={`px-2.5 py-1 rounded-md font-semibold capitalize transition-colors cursor-pointer ${
                        speed === s
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {/* Open History Modal Button */}
                <ResponsiveActionButton
                  icon={<History className="w-3.5 h-3.5 text-[#c83e37]" />}
                  label={`History (${historyEntries.length})`}
                  tooltipText="Open Conversion & Activity History Log Modal"
                  breakpoint={1100}
                  onClick={() => setShowHistoryModal(true)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                />

                {/* Security & Blocking Quick Button */}
                <ResponsiveActionButton
                  icon={<ShieldAlert className="w-3.5 h-3.5 text-[#c83e37]" />}
                  label="Security & Blocking"
                  tooltipText="Configure Filename/Regex/SHA-256/File-Type Blocking & IP Rate Limits"
                  breakpoint={1200}
                  onClick={() => setActiveTab('security')}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                />

                {/* Stage Mixed Queue Button */}
                <ResponsiveActionButton
                  icon={<SlidersHorizontal className="w-3.5 h-3.5 text-[#c83e37]" />}
                  label="Test Drag, Errors & Ordering"
                  tooltipText="Populate queue with Finished, Cancelled, Failed (Intact & Corrupted), Converting, and Waiting items"
                  breakpoint={1280}
                  onClick={handleStageReorderDemo}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                />

                {/* Auto-Convert Queue Toggle */}
                <ResponsiveActionButton
                  icon={
                    autoConvert ? (
                      <Pause className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Play className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                    )
                  }
                  label={autoConvert ? 'Auto-Convert: ON' : 'Queue Paused (Resume)'}
                  tooltipText={
                    autoConvert
                      ? 'Pause automatic conversion so you can stage & reorder files'
                      : 'Resume automatic queue conversion'
                  }
                  breakpoint={950}
                  onClick={() => setAutoConvert((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                    autoConvert
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                  }`}
                />

                {/* Download All Finished */}
                {finishedCount > 1 && (
                  <ResponsiveActionButton
                    icon={<Download className="w-3.5 h-3.5" />}
                    label={`Download All (${finishedCount})`}
                    tooltipText={`Download all ${finishedCount} finished files`}
                    breakpoint={950}
                    onClick={handleDownloadAllFinished}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#28a745] hover:bg-[#218838] text-white shadow-2xs"
                  />
                )}
              </div>
            </div>

            {/* Queue Items List */}
            {queue.length === 0 ? (
              <div className="bg-white rounded-b-xl border border-t-0 border-slate-200 p-10 text-center shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 mx-auto flex items-center justify-center mb-3">
                  <FolderPlus className="w-7 h-7 text-[#c83e37]" />
                </div>
                <h3 className="text-base font-bold text-slate-800">
                  Your conversion queue is currently empty
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1">
                  Upload any file using the red <strong>Select File</strong> button above, drag and drop files onto the page, or load a sample batch below to test the conversion queue.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleLoadDemoBatch}
                    className="px-4 py-2.5 rounded-lg bg-[#c83e37] hover:bg-[#b2342d] text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Load 5-File Demo Queue (.AVI, .DOCX, .WAV, .PNG, .CSV)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-b-xl border border-t-0 border-slate-200 shadow-xs overflow-visible">
                {queue.map((item, idx) => {
                  const showZoneDivider =
                    idx === firstUnfinishedIndex &&
                    firstUnfinishedIndex > 0 &&
                    firstUnfinishedIndex < queue.length;

                  return (
                    <React.Fragment key={item.id}>
                      {showZoneDivider && (
                        <div className="bg-slate-100/90 border-y border-slate-200 px-4 py-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                          <div className="flex items-center gap-2">
                            <ArrowUpDown className="w-3.5 h-3.5 text-[#c83e37]" />
                            <span>
                              Waiting Queue (Unfinished Files) — Drag to reorder priority below locked items
                            </span>
                          </div>
                          <span className="text-slate-400 hidden sm:inline">
                            Cannot be placed above finished, cancelled, failed, or converting items ↑
                          </span>
                        </div>
                      )}

                      <QueueItemRow
                        item={item}
                        index={idx}
                        totalCount={queue.length}
                        firstUnfinishedIndex={firstUnfinishedIndex}
                        isDragging={draggedIndex === idx}
                        draggedItem={draggedIndex !== null ? queue[draggedIndex] : null}
                        dragOverIndex={dragOverIndex}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onDragEnd={handleDragEnd}
                        onMoveItem={handleMoveItem}
                        onChangeTargetFormat={handleChangeTargetFormat}
                        onOpenOptions={(it) => setOptionsModalItemId(it.id)}
                        onOpenInfo={(it) => setInfoModalItemId(it.id)}
                        onRequestCancelItem={(it) =>
                          setConfirmDialog({
                            type: 'cancel',
                            itemId: it.id,
                            fileName: it.fileName,
                            status: it.status,
                          })
                        }
                        onRetryItem={handleRetryItem}
                        onStartNowItem={handleStartNowItem}
                        onRequestDeleteItem={(it) =>
                          setConfirmDialog({
                            type: 'delete',
                            itemId: it.id,
                            fileName: it.fileName,
                            status: it.status,
                          })
                        }
                        onDownloadItem={handleDownloadItem}
                        onPreviewItem={(it) => setPreviewModalItemId(it.id)}
                        onDropdownOpenChange={handleDropdownOpenChange}
                      />
                    </React.Fragment>
                  );
                })}

                {/* CloudConvert Bottom Footer Bar inside Queue Card */}
                <div className="bg-slate-50/90 border-t border-slate-200 px-4 sm:px-5 py-3.5 rounded-b-xl flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      ref={bottomFileInputRef}
                      type="file"
                      multiple
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleFilesAdded(Array.from(e.target.files));
                          e.target.value = '';
                        }
                      }}
                      className="hidden"
                    />
                    <ResponsiveActionButton
                      icon={<FolderPlus className="w-4 h-4 text-[#e0524a]" />}
                      label="+ Add more Files"
                      tooltipText="Upload additional files from your computer"
                      breakpoint={768}
                      onClick={() => bottomFileInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-lg bg-[#232b38] hover:bg-[#1b222c] text-white text-xs font-bold shadow-2xs"
                    />

                    <ResponsiveActionButton
                      icon={<Sparkles className="w-3.5 h-3.5 text-[#c83e37]" />}
                      label="+ Add Sample Batch"
                      tooltipText="Add 5 sample files to the conversion queue"
                      breakpoint={768}
                      onClick={handleLoadDemoBatch}
                      className="px-3 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold"
                    />
                  </div>

                  {/* Status Summary & Optional Bulk Actions */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>
                      Finished: <strong className="text-emerald-700">{finishedCount}</strong> •
                      Converting: <strong className="text-blue-700">{convertingCount}</strong> •
                      Queued: <strong className="text-slate-800">{queuedCount}</strong>
                      {cancelledOrFailedCount > 0 && (
                        <>
                          {' '}
                          • Cancelled/Failed:{' '}
                          <strong className="text-amber-700">{cancelledOrFailedCount}</strong>
                        </>
                      )}
                    </span>

                    {(convertingCount > 0 || queuedCount > 0) && (
                      <ResponsiveActionButton
                        icon={<XCircle className="w-3.5 h-3.5 text-amber-600" />}
                        label="Cancel All Active"
                        tooltipText="Cancel all converting & queued files (asks for confirmation)"
                        breakpoint={900}
                        onClick={() =>
                          setConfirmDialog({
                            type: 'cancel-all',
                            fileName: `${convertingCount + queuedCount} active/queued files`,
                          })
                        }
                        className="px-2.5 py-1.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold"
                      />
                    )}

                    {retryableCount > 0 && (
                      <ResponsiveActionButton
                        icon={<RefreshCw className="w-3.5 h-3.5" />}
                        label="Retry Cancelled/Failed"
                        tooltipText="Retry all cancelled and non-corrupted failed files"
                        breakpoint={900}
                        onClick={() => {
                          queue.forEach((it) => {
                            if (
                              it.status === 'cancelled' ||
                              (it.status === 'failed' && !it.isCorrupted)
                            ) {
                              handleRetryItem(it.id);
                            }
                          });
                        }}
                        className="px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-semibold"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* CloudConvert Signature Information Grid */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
              <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-2xs">
                <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center mb-3">
                  <FileCheck className="w-5 h-5 text-[#c83e37]" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">200+ Format Conversions</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Supports video (<code className="text-slate-800">.AVI → .MP4</code>,{' '}
                  <code className="text-slate-800">.MKV → .WEBM</code>), audio (
                  <code className="text-slate-800">.WAV → .MP3</code>), documents (
                  <code className="text-slate-800">.DOCX → .PDF</code>), images (
                  <code className="text-slate-800">.PNG → .WEBP</code>), spreadsheets, archives, and custom extensions.
                </p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-2xs">
                <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center mb-3">
                  <ShieldAlert className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">
                  Input File Blocking & IP Rate Limiting
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Filter uploads by <strong>Filename (Text or Regex)</strong>,{' '}
                  <strong>SHA-256 Cryptographic File Hash</strong>, <strong>File Type/Category</strong>,{' '}
                  <strong>IP / CIDR Blocklists</strong>, and <strong>IP Conversion Rate Limits</strong>.
                </p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-2xs">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-3">
                  <Globe className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">
                  Live Telemetry & Full Action History
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Click <strong>Info</strong> on any file for before/after statistics and <strong>Mbps conversion rate graphs</strong>, click <strong>Preview</strong> before downloading, or open <strong>History</strong> to search every past conversion, deletion, and block event.
                </p>
              </div>
            </section>
          </main>
        </>
      )}

      {/* Modals */}
      {optionsModalItem && (
        <ConversionOptionsModal
          item={optionsModalItem}
          onClose={() => setOptionsModalItemId(null)}
          onSave={handleSaveOptions}
        />
      )}

      {previewModalItem && (
        <FilePreviewModal
          item={previewModalItem}
          onClose={() => setPreviewModalItemId(null)}
          onDownload={handleDownloadItem}
        />
      )}

      {infoModalItem && (
        <FileInfoStatsModal
          item={infoModalItem}
          onClose={() => setInfoModalItemId(null)}
          onPreview={(it) => setPreviewModalItemId(it.id)}
          onDownload={handleDownloadItem}
          onRetry={handleRetryItem}
          onBlockSha256={handleBlockFileSha256}
        />
      )}

      {confirmDialog && (
        <ConfirmActionModal
          dialog={confirmDialog}
          onConfirm={handleConfirmDialogAction}
          onClose={() => setConfirmDialog(null)}
        />
      )}

      {showHistoryModal && (
        <HistoryModal
          entries={historyEntries}
          onClose={() => setShowHistoryModal(false)}
          onClearHistory={() => setHistoryEntries([])}
        />
      )}

      {/* Footer */}
      <footer className="bg-[#151b23] text-slate-400 border-t border-slate-800 py-5 mt-12 text-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#e0524a]" />
            <span className="font-semibold text-slate-200">CloudConversion</span>
            <span>— High-Precision Universal File Converter & Queue Manager</span>
          </div>
          <div>
            <span>Supports Video, Audio, Document, Image, Vector, Spreadsheet & Archive Formats</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
