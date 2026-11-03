'use client';

import React, { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'primary';
  confirmTestId?: string;
  cancelTestId?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  variant = 'warning',
  confirmTestId = 'modal-confirm-btn',
  cancelTestId = 'modal-cancel-btn',
}) => {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      cancelBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length > 0) {
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const iconBg =
    variant === 'danger'
      ? 'bg-red-50 text-red-600 border border-red-200'
      : 'bg-amber-50 text-amber-600 border border-amber-200';

  const confirmBtnCls =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-400 shadow-red-600/20'
      : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-400 shadow-emerald-600/20';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
        aria-describedby="confirmation-modal-description"
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${iconBg}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div className="space-y-1.5 flex-1">
            <h3
              id="confirmation-modal-title"
              className="text-lg font-bold text-slate-900 tracking-tight"
            >
              {title}
            </h3>
            <p
              id="confirmation-modal-description"
              className="text-xs text-slate-600 leading-relaxed"
            >
              {message}
            </p>
          </div>
        </div>

        <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
          <button
            ref={cancelBtnRef}
            type="button"
            data-testid={cancelTestId}
            onClick={onCancel}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            data-testid={confirmTestId}
            onClick={onConfirm}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-sm focus:outline-none focus:ring-2 ${confirmBtnCls}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};