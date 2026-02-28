from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class VideoFormat(str, Enum):
    LANDSCAPE = "16:9"
    PORTRAIT = "9:16"


class VideoType(str, Enum):
    DOCUMENTARY = "documentary"
    TOP10 = "top10"
    MYSTERY = "mystery"
    NEWS = "news"
    EDUCATIONAL = "educational"


class StepStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


# ── Request / Response models ────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    prompt: str = Field(..., min_length=10)
    voice_id: str = Field(default="21m00Tcm4TlvDq8ikWAM")
    target_duration: Optional[int] = Field(default=None, ge=1, le=60, description="Minutes")
    video_format: VideoFormat = VideoFormat.LANDSCAPE
    video_type: VideoType = VideoType.DOCUMENTARY
    language: str = Field(default="en")
    add_background_music: bool = True
    add_captions: bool = False


class GenerateResponse(BaseModel):
    job_id: str


class PipelineStep(BaseModel):
    step: int
    name: str
    description: str
    status: StepStatus = StepStatus.PENDING
    message: str = ""
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class JobResult(BaseModel):
    final_video: Optional[str] = None
    script_file: Optional[str] = None
    voiceover_file: Optional[str] = None
    asset_list_file: Optional[str] = None
    timeline_file: Optional[str] = None
    subtitles_file: Optional[str] = None
    duration_seconds: Optional[float] = None


class Job(BaseModel):
    job_id: str
    status: JobStatus = JobStatus.PENDING
    config: Dict[str, Any]
    steps: List[PipelineStep]
    current_step: int = 0
    result: Optional[JobResult] = None
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None


# ── Internal pipeline data models ────────────────────────────────────────────

class TalkingPoint(BaseModel):
    index: int
    title: str
    content: str
    visual_keywords: List[str] = []


class PromptAnalysis(BaseModel):
    topic: str
    talking_points: List[TalkingPoint]
    tone: str
    style: str
    estimated_duration_minutes: float
    visual_elements: List[str]
    language: str = "en"


class Scene(BaseModel):
    scene_id: str
    name: str
    narration: str
    word_count: int
    estimated_duration_seconds: float
    visual_keywords: List[str]


class Script(BaseModel):
    full_text: str
    scenes: List[Scene]
    total_word_count: int
    estimated_duration_minutes: float


class TTSResult(BaseModel):
    audio_path: str
    total_duration_seconds: float
    scenes: List[Dict[str, Any]]  # {scene_id, start_time, end_time, duration}


class AssetItem(BaseModel):
    asset_type: str  # "video" | "image"
    url: str
    local_path: str
    duration: Optional[float] = None
    width: int = 0
    height: int = 0
    source: str = "pexels"
    license: str = "Pexels License"
    pexels_id: Optional[int] = None
    keywords_matched: List[str] = []


class SceneAssets(BaseModel):
    scene_id: str
    scene_name: str
    duration: float
    primary_asset: Optional[AssetItem] = None
    secondary_assets: List[AssetItem] = []


class FootageResult(BaseModel):
    scenes: List[SceneAssets]


class BlueprintScene(BaseModel):
    scene_id: str
    scene_name: str
    start_time: float
    end_time: float
    duration: float
    narration_excerpt: str
    primary_asset: Optional[AssetItem] = None
    secondary_assets: List[AssetItem] = []
    montage_type: str = "b-roll"  # b-roll | zoom-image | sequence | map | text-overlay
    pace: str = "medium"          # slow | medium | fast
    transition: str = "cut"       # cut | dissolve | fade


class EditBlueprint(BaseModel):
    total_duration: float
    video_format: str
    resolution: tuple
    fps: int
    scenes: List[BlueprintScene]


class EditResult(BaseModel):
    video_path: str
    duration_seconds: float


class ExportResult(BaseModel):
    final_video: str
    script_file: str
    voiceover_file: str
    asset_list_file: str
    timeline_file: str
    duration_seconds: float
