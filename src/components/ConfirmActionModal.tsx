import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, XCircle, X, Check } from 'lucide-react';
import { ResponsiveActionButton } from './Tooltip';

export interface ConfirmDialogState {
  type: 'cancel' | 'delete' | 'cancel-all';
  itemId?: string;
  fileName: string;
  status?: string;
}

interface ConfirmActionModalProps {
  dialog: ConfirmDialogState;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  dialog,
  onConfirm,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isDelete = dialog.type === 'delete';
  const isCancelAll = dialog.type === 'cancel-all';

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isDelete ? 'Confirm Delete Entry' : 'Confirm Cancel Conversion'}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 flex items-center justify-between text-white ${
            isDelete ? 'bg-[#1b222c]' : 'bg-[#1b222c]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isDelete ? 'bg-red-600' : 'bg-amber-600'
              }`}
            >
              {isDelete ? (
                <Trash2 className="w-4 h-4 text-white" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-white" />
              )}
            </div>
            <h3 className="font-bold text-sm sm:text-base">
              {isDelete
                ? 'Are you sure you want to delete this entry?'
                : isCancelAll
                ? 'Are you sure you want to cancel all active conversions?'
                : 'Are you sure you want to cancel this conversion?'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close confirmation dialog"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
          {isDelete ? (
            <>
              <p>
                You are about to permanently remove{' '}
                <strong className="text-slate-900 font-semibold">"{dialog.fileName}"</strong> from
                the conversion queue.
              </p>
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                Once deleted, this entry and its converted download link will be removed from the
                queue list.
              </div>
            </>
          ) : isCancelAll ? (
            <>
              <p>
                You are about to stop all currently converting and waiting files in the queue (
                <strong className="text-slate-900 font-semibold">{dialog.fileName}</strong>).
              </p>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                Cancelled items will remain in your queue so you can retry or delete them later.
              </div>
            </>
          ) : (
            <>
              <p>
                Are you sure you want to stop and cancel the conversion for{' '}
                <strong className="text-slate-900 font-semibold">"{dialog.fileName}"</strong>?
              </p>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                The conversion will stop immediately and the item will remain in your queue with a{' '}
                <strong>CANCELLED</strong> status until you retry or delete it.
              </div>
            </>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <ResponsiveActionButton
            icon={<X className="w-4 h-4" />}
            label="No, Keep It"
            tooltipText="Dismiss and keep current state"
            breakpoint={640}
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300"
          />

          <ResponsiveActionButton
            icon={
              isDelete ? (
                <Trash2 className="w-4 h-4" />
              ) : isCancelAll ? (
                <XCircle className="w-4 h-4" />
              ) : (
                <Check className="w-4 h-4" />
              )
            }
            label={
              isDelete
                ? 'Yes, Delete Entry'
                : isCancelAll
                ? 'Yes, Cancel All'
                : 'Yes, Cancel Conversion'
            }
            tooltipText={
              isDelete
                ? 'Confirm permanent deletion from queue'
                : 'Confirm cancellation of conversion'
            }
            breakpoint={640}
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-xs font-bold text-white shadow-sm ${
              isDelete
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          />
        </div>
      </div>
    </div>
  );
};
