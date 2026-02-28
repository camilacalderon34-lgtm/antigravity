'use client';

import { useState } from 'react';

interface Props {
  onClose: () => void;
  onApply: (instruction: string) => void;
  isLoading: boolean;
}

export default function EditScriptModal({ onClose, onApply, isLoading }: Props) {
  const [instruction, setInstruction] = useState('');

  const handleApply = () => {
    if (!instruction.trim() || isLoading) return;
    onApply(instruction.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 rounded-2xl border border-[#30363d] bg-[#161b22] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262d]">
          <h3 className="font-semibold text-[#e6edf3]">Edit Script</h3>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-[#484f58] hover:text-[#e6edf3] transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-[#8b949e]">
            Describe how you want the script modified. Claude will rewrite it based on your instruction.
          </p>
          <div>
            <label className="label">Modification instruction</label>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder='e.g. "Make the script exactly 1,800 words" or "Add more detail about the economic impact"'
              rows={4}
              className="input resize-none text-sm"
              autoFocus
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-5">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-lg border border-[#30363d] text-sm text-[#8b949e] hover:border-[#484f58] hover:text-[#e6edf3] transition-all disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!instruction.trim() || isLoading}
            className="flex-1 py-2.5 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Regenerating…
              </>
            ) : (
              'Apply & Regenerate'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
