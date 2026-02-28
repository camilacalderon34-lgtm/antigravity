'use client';

import { useRef, useState, useCallback } from 'react';

interface Props {
  label: string;
  onApprove: () => void;
  approved?: boolean;
}

export default function SlideToApprove({ label, onApprove, approved = false }: Props) {
  const [pct, setPct] = useState(0);
  const isDragging = useRef(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const getPct = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    const THUMB = 44;
    const PAD = 4;
    const travel = rect.width - THUMB - PAD * 2;
    const x = clientX - rect.left - PAD - THUMB / 2;
    return Math.max(0, Math.min(100, (x / travel) * 100));
  }, []);

  const onMove = useCallback((clientX: number) => {
    if (!isDragging.current) return;
    const p = getPct(clientX);
    setPct(p);
    if (p >= 88) {
      isDragging.current = false;
      setPct(100);
      setTimeout(onApprove, 150);
    }
  }, [getPct, onApprove]);

  const onEnd = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false;
      setPct(0);
    }
  }, []);

  if (approved) {
    return (
      <div className="flex items-center justify-center gap-2 h-12 rounded-full bg-green-400/10 border border-green-400/30 text-green-300 text-sm font-medium">
        <span>✓</span> Approved
      </div>
    );
  }

  // thumb left = PAD + pct/100 * (100% - THUMB - 2*PAD)
  const thumbLeft = `calc(4px + ${pct / 100} * (100% - 52px))`;

  return (
    <div
      ref={trackRef}
      className="relative h-12 rounded-full bg-[#0d1117] border border-[#30363d] select-none"
      onMouseMove={(e) => onMove(e.clientX)}
      onMouseUp={onEnd}
      onMouseLeave={onEnd}
      onTouchMove={(e) => onMove(e.touches[0].clientX)}
      onTouchEnd={onEnd}
    >
      {/* Fill */}
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-brand/20"
        style={{ width: `calc(4px + ${pct / 100} * (100% - 52px) + 22px)` }}
      />
      {/* Label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-sm text-[#484f58]">{label}</span>
      </div>
      {/* Thumb */}
      <div
        className="absolute top-1 h-10 w-10 rounded-full bg-brand flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg z-10"
        style={{ left: thumbLeft }}
        onMouseDown={(e) => { e.preventDefault(); isDragging.current = true; onMove(e.clientX); }}
        onTouchStart={(e) => { e.preventDefault(); isDragging.current = true; onMove(e.touches[0].clientX); }}
      >
        <span className="text-white text-base">›</span>
      </div>
    </div>
  );
}
