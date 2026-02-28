'use client';

import { useState } from 'react';
import SlideToApprove from './SlideToApprove';
import EditScriptModal from './EditScriptModal';

interface Props {
  text: string;
  wordCount: number;
  approved: boolean;
  onApprove: () => void;
  onEdit: (instruction: string) => Promise<void>;
  isEditing: boolean;
}

export default function ScriptPanel({ text, wordCount, approved, onApprove, onEdit, isEditing }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [toast, setToast] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  };

  const handleEdit = async (instruction: string) => {
    await onEdit(instruction);
    setShowModal(false);
  };

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <h3 className="font-semibold text-[#e6edf3] text-sm uppercase tracking-wider">Script</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRaw((v) => !v)}
              className={`text-xs px-2.5 py-1 rounded border transition-all ${
                showRaw
                  ? 'border-brand/50 bg-brand/10 text-brand-light'
                  : 'border-[#30363d] text-[#8b949e] hover:border-[#484f58]'
              }`}
            >
              Raw
            </button>
            <button
              onClick={() => !approved && setShowModal(true)}
              disabled={approved || isEditing}
              className="text-xs px-2.5 py-1 rounded border border-[#30363d] text-[#8b949e] hover:border-[#484f58] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isEditing ? 'Editing…' : 'Edit'}
            </button>
            <button
              onClick={handleCopy}
              title="Copy script"
              className="text-[#8b949e] hover:text-[#e6edf3] transition-colors p-1 relative"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"/>
                <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/>
              </svg>
              {toast && (
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs bg-[#21262d] text-[#e6edf3] px-2 py-1 rounded whitespace-nowrap border border-[#30363d]">
                  Script copied
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Script content */}
        <div className="flex-1 min-h-0 rounded-xl border border-[#21262d] bg-[#0d1117] overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-5">
            {showRaw ? (
              <pre className="text-xs text-[#8b949e] font-mono whitespace-pre-wrap break-words leading-relaxed">
                {text}
              </pre>
            ) : (
              <div className="space-y-4">
                {text.split('\n\n').map((para, i) =>
                  para.trim() ? (
                    <p key={i} className="text-sm text-[#e6edf3] leading-relaxed">
                      {para.trim()}
                    </p>
                  ) : null
                )}
              </div>
            )}
          </div>

          {/* Word count bar */}
          <div className="px-5 py-3 border-t border-[#21262d] bg-[#0d1117] flex-shrink-0">
            <span className="text-xs text-[#484f58]">
              Words:{' '}
              <span className="text-[#8b949e] font-medium">
                {wordCount.toLocaleString()}
              </span>
            </span>
          </div>
        </div>

        {/* Approve slider */}
        <div className="mt-4 flex-shrink-0">
          <SlideToApprove
            label="Slide to approve script"
            onApprove={onApprove}
            approved={approved}
          />
        </div>
      </div>

      {showModal && (
        <EditScriptModal
          onClose={() => setShowModal(false)}
          onApply={handleEdit}
          isLoading={isEditing}
        />
      )}
    </>
  );
}
