'use client';
import { ReactNode } from 'react';

type ModalSize = 'small' | 'medium' | 'large';

const sizeClasses: Record<ModalSize, { width: string; height: string }> = {
  small: { width: 'max-w-md', height: 'h-[50vh]' },
  medium: { width: 'max-w-2xl', height: 'h-[65vh]' },
  large: { width: 'max-w-5xl', height: 'h-[80vh]' },
};

export default function CenterModal({
  open,
  onClose,
  children,
  title,
  maxWidth,
  hideClose = false,
  size = 'medium',
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  maxWidth?: string; // legacy support - will be overridden by size if provided
  hideClose?: boolean;
  size?: ModalSize;
}) {
  if (!open) return null;

  // Use size-based classes if size is provided, otherwise fall back to maxWidth
  const widthClass = maxWidth || sizeClasses[size].width;
  const heightClass = sizeClasses[size].height;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full ${widthClass} ${heightClass} bg-white rounded-3xl shadow-xl border border-black/10 overflow-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Optional header (when title provided and not hidden) */}
        {title && !hideClose && (
          <div className="px-6 py-4 border-b border-black/10 flex items-center justify-between flex-shrink-0">
            <h3 className="text-lg font-semibold text-[#2e2e2e]">{title}</h3>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-zinc-200 hover:bg-zinc-50 text-sm font-medium text-[#2e2e2e] transition-colors"
              aria-label="Close"
            >
              Close
            </button>
          </div>
        )}

        {/* Content rendered by caller - will scroll if needed, centered vertically */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}
