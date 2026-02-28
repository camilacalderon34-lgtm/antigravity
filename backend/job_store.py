import uuid
from datetime import datetime
from typing import Dict, Optional, Any
from models import Job, PipelineStep, StepStatus, JobStatus, JobResult

PIPELINE_STEPS = [
    (1, "Prompt Analysis",     "Extracting topic, talking points, tone, and visual elements"),
    (2, "Script Generation",   "Writing full narration script segmented by scenes"),
    (3, "Voice Generation",    "Converting script to speech with selected voice"),
    (4, "Footage Sourcing",    "Finding and downloading visual assets per scene"),
    (5, "Edit Blueprint",      "Planning the timeline and clip assignments"),
    (6, "Video Assembly",      "Assembling footage, voice, and music into final video"),
    (7, "Export & Delivery",   "Organizing all deliverables"),
]


class JobStore:
    def __init__(self):
        self._jobs: Dict[str, Job] = {}
        self._pipeline_data: Dict[str, Dict[str, Any]] = {}  # job_id → {script, analysis, ...}

    def create_job(self, config: dict) -> Job:
        job_id = str(uuid.uuid4())
        steps = [
            PipelineStep(step=n, name=name, description=desc)
            for n, name, desc in PIPELINE_STEPS
        ]
        job = Job(
            job_id=job_id,
            config=config,
            steps=steps,
            created_at=datetime.utcnow(),
        )
        self._jobs[job_id] = job
        return job

    def get(self, job_id: str) -> Optional[Job]:
        return self._jobs.get(job_id)

    def all(self):
        return list(self._jobs.values())

    # ── Pipeline data storage ──────────────────────────────────────────────────

    def set_pipeline_data(self, job_id: str, key: str, value: Any):
        if job_id not in self._pipeline_data:
            self._pipeline_data[job_id] = {}
        self._pipeline_data[job_id][key] = value

    def get_pipeline_data(self, job_id: str, key: str) -> Optional[Any]:
        return self._pipeline_data.get(job_id, {}).get(key)

    def reset_steps_from(self, job_id: str, from_step: int):
        """Reset steps from given step onwards back to pending."""
        job = self._jobs.get(job_id)
        if not job:
            return
        job.status = JobStatus.RUNNING
        job.error = None
        for s in job.steps:
            if s.step >= from_step:
                s.status = StepStatus.PENDING
                s.message = ""
                s.started_at = None
                s.completed_at = None

    # ── Step lifecycle ─────────────────────────────────────────────────────────

    def start_step(self, job_id: str, step: int, message: str = ""):
        job = self._jobs[job_id]
        job.status = JobStatus.RUNNING
        job.current_step = step
        for s in job.steps:
            if s.step == step:
                s.status = StepStatus.RUNNING
                s.message = message
                s.started_at = datetime.utcnow()
                break

    def complete_step(self, job_id: str, step: int, message: str = ""):
        job = self._jobs[job_id]
        for s in job.steps:
            if s.step == step:
                s.status = StepStatus.COMPLETED
                s.message = message
                s.completed_at = datetime.utcnow()
                break

    def fail_step(self, job_id: str, step: int, error: str):
        job = self._jobs[job_id]
        job.status = JobStatus.FAILED
        job.error = error
        for s in job.steps:
            if s.step == step:
                s.status = StepStatus.FAILED
                s.message = error
                s.completed_at = datetime.utcnow()
                break

    def complete_job(self, job_id: str, result: JobResult):
        job = self._jobs[job_id]
        job.status = JobStatus.COMPLETED
        job.result = result
        job.completed_at = datetime.utcnow()

    def fail_job(self, job_id: str, error: str, step: Optional[int] = None):
        job = self._jobs[job_id]
        job.status = JobStatus.FAILED
        job.error = error
        job.completed_at = datetime.utcnow()
        if step is not None:
            self.fail_step(job_id, step, error)


# Global singleton
store = JobStore()
