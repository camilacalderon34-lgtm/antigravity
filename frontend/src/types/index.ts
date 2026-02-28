export type VideoFormat = '16:9' | '9:16';
export type VideoType = 'documentary' | 'top10' | 'mystery' | 'news' | 'educational';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface Voice {
  id: string;
  name: string;
  category: string;
  gender: string;
  accent: string;
  age: string;
  description: string;
  use_case: string;
  preview_url: string;
}

export interface PipelineStep {
  step: number;
  name: string;
  description: string;
  status: StepStatus;
  message: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface JobResult {
  final_video: string | null;
  script_file: string | null;
  voiceover_file: string | null;
  asset_list_file: string | null;
  timeline_file: string | null;
  subtitles_file: string | null;
  duration_seconds: number | null;
}

export interface Job {
  job_id: string;
  status: JobStatus;
  config: Record<string, unknown>;
  steps: PipelineStep[];
  current_step: number;
  result: JobResult | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface GenerateRequest {
  title: string;
  prompt: string;
  voice_id: string;
  target_duration: number;
  video_format: VideoFormat;
  video_type: VideoType;
  language: string;
  add_background_music: boolean;
  add_captions: boolean;
}
