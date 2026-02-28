'use client';

import { Voice } from '@/types';

interface Props {
  voices: Voice[];
  value: string;
  onChange: (id: string) => void;
}

export default function VoiceSelector({ voices, value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {voices.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => onChange(v.id)}
          className={`text-left px-3 py-2 rounded-lg border transition-all text-sm ${
            value === v.id
              ? 'border-brand bg-brand/10 text-brand-light'
              : 'border-[#30363d] bg-[#161b22] hover:border-[#484f58] text-[#8b949e]'
          }`}
        >
          <div className="font-medium text-[#e6edf3]">{v.name}</div>
          <div className="text-xs mt-0.5 opacity-70">{v.description}</div>
        </button>
      ))}
    </div>
  );
}
