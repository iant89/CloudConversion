import { ConversionQueueItem, QueueItemStatus } from '../types/conversion';

/**
 * Returns true if the item is an "unfinished" file waiting in the queue.
 */
export function isUnfinishedStatus(status: QueueItemStatus): boolean {
  return status === 'queued';
}

/**
 * Returns true if the item is finished, cancelled, failed, or currently converting.
 * Unfinished files can NEVER be placed above any item with one of these statuses.
 */
export function isLockedAboveUnfinishedStatus(status: QueueItemStatus): boolean {
  return (
    status === 'finished' ||
    status === 'cancelled' ||
    status === 'failed' ||
    status === 'converting'
  );
}

/**
 * Enforces the strict queue ordering invariant:
 * - No unfinished ('queued') file can ever appear above a
 *   'finished', 'cancelled', 'failed', or 'converting' file.
 * - Within the upper locked zone, completed/terminated items ('finished' | 'cancelled' | 'failed')
 *   appear first in their relative order, followed by 'converting' items,
 *   and finally all 'queued' (unfinished) items in their user-arranged order.
 */
export function enforceQueueInvariant(items: ConversionQueueItem[]): ConversionQueueItem[] {
  const terminated: ConversionQueueItem[] = [];
  const converting: ConversionQueueItem[] = [];
  const unfinished: ConversionQueueItem[] = [];

  for (const item of items) {
    if (item.status === 'finished' || item.status === 'cancelled' || item.status === 'failed') {
      terminated.push(item);
    } else if (item.status === 'converting') {
      converting.push(item);
    } else {
      unfinished.push(item);
    }
  }

  return [...terminated, ...converting, ...unfinished];
}

/**
 * Returns the index of the first unfinished ('queued') item in the list,
 * or items.length if there are no unfinished items.
 * All indices < this boundary belong to finished/cancelled/failed/converting items.
 */
export function getFirstUnfinishedIndex(items: ConversionQueueItem[]): number {
  const idx = items.findIndex((item) => isUnfinishedStatus(item.status));
  return idx === -1 ? items.length : idx;
}

export interface ReorderResult {
  items: ConversionQueueItem[];
  allowed: boolean;
  clamped: boolean;
  violationReason?: string;
}

/**
 * Reorders an item from `fromIndex` to `toIndex` while strictly enforcing:
 * "An unfinished file cannot be placed above a finished/cancelled/failed/currently converting file in the list."
 */
export function reorderQueueItems(
  currentItems: ConversionQueueItem[],
  fromIndex: number,
  toIndex: number
): ReorderResult {
  const normalized = enforceQueueInvariant(currentItems);
  if (
    fromIndex < 0 ||
    fromIndex >= normalized.length ||
    toIndex < 0 ||
    toIndex >= normalized.length ||
    fromIndex === toIndex
  ) {
    return { items: normalized, allowed: true, clamped: false };
  }

  const movingItem = normalized[fromIndex];
  const boundaryIndex = getFirstUnfinishedIndex(normalized);

  // Case 1: Dragging an unfinished ('queued') item
  if (isUnfinishedStatus(movingItem.status)) {
    if (toIndex < boundaryIndex) {
      // User attempted to place an unfinished file above a finished/cancelled/failed/converting item.
      const blocker = normalized[toIndex];
      const statusLabel =
        blocker.status === 'converting' ? 'currently converting' : blocker.status;

      // If the item is not already at the top of the unfinished queue, clamp it to boundaryIndex;
      // if it is already at boundaryIndex, keep it at boundaryIndex and report the violation.
      const safeTargetIndex = boundaryIndex;
      if (fromIndex === safeTargetIndex) {
        return {
          items: normalized,
          allowed: false,
          clamped: false,
          violationReason: `Cannot place unfinished file "${movingItem.fileName}" above ${statusLabel} file "${blocker.fileName}".`,
        };
      }

      const next = [...normalized];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(safeTargetIndex, 0, removed);

      return {
        items: enforceQueueInvariant(next),
        allowed: false,
        clamped: true,
        violationReason: `Unfinished files cannot be placed above ${statusLabel} files. Placed at the top of the waiting queue instead.`,
      };
    }

    // Valid reorder within the unfinished section
    const next = [...normalized];
    const [removed] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, removed);
    return {
      items: enforceQueueInvariant(next),
      allowed: true,
      clamped: false,
    };
  }

  // Case 2: Dragging a finished/cancelled/failed/converting item
  // It can never be placed at or below any unfinished item (because that would put an unfinished item above it!)
  if (toIndex >= boundaryIndex && boundaryIndex < normalized.length) {
    return {
      items: normalized,
      allowed: false,
      clamped: false,
      violationReason: `Cannot move a ${movingItem.status === 'converting' ? 'currently converting' : movingItem.status} file below unfinished queued files.`,
    };
  }

  // Also ensure 'converting' stays right above 'queued' or reorders within its sub-group
  const next = [...normalized];
  const [removed] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, removed);
  return {
    items: enforceQueueInvariant(next),
    allowed: true,
    clamped: false,
  };
}
