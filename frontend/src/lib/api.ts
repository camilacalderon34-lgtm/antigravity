import { GenerateRequest, Job, Voice } from '@/types';

const BASE = '/api';

export async function generateVideo(req: GenerateRequest): Promise<{ job_id: string }> {
  const res = await fetch(`${BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Generation failed');
  }
  return res.json();
}

export async function getJob(jobId: string): Promise<Job> {
  const res = await fetch(`${BASE}/jobs/${jobId}`);
  if (!res.ok) throw new Error('Job not found');
  return res.json();
}

export async function getVoices(): Promise<Voice[]> {
  const res = await fetch(`${BASE}/voices`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.voices ?? [];
}

export async function getScript(
  jobId: string,
): Promise<{ text: string; total_word_count: number; scenes: number } | null> {
  const res = await fetch(`${BASE}/jobs/${jobId}/script`);
  if (!res.ok) return null;
  return res.json();
}

export async function editScript(jobId: string, instruction: string): Promise<void> {
  const res = await fetch(`${BASE}/jobs/${jobId}/script/edit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instruction }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Edit failed');
  }
}

export async function regenerateVoice(jobId: string): Promise<void> {
  const res = await fetch(`${BASE}/jobs/${jobId}/voice/regenerate`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Regeneration failed');
  }
}

export async function approveScript(jobId: string): Promise<void> {
  const res = await fetch(`${BASE}/jobs/${jobId}/approve-script`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Approval failed');
  }
}

export async function approveVoice(jobId: string): Promise<void> {
  const res = await fetch(`${BASE}/jobs/${jobId}/approve-voice`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Approval failed');
  }
}
