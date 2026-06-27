from __future__ import annotations

import json
import logging
import re
import shlex
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

from app.config import Settings
from app.models import RenderJob
from app.supabase_client import RendererSupabase

logger = logging.getLogger(__name__)

VIDEO_SIZE = "1080x1920"
WIDTH = 1080
HEIGHT = 1920
FPS = 30
TRANSITION_SECONDS = 0.3
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
VIDEO_EXTENSIONS = {".mp4", ".mov"}
VISUAL_EXTENSIONS = IMAGE_EXTENSIONS | VIDEO_EXTENSIONS
DEFAULT_SUBTITLE_FONT_SIZE = 11
DEFAULT_SUBTITLE_STROKE_WIDTH = 2
DEFAULT_SUBTITLE_BOTTOM_MARGIN = 110
DEFAULT_SUBTITLE_MAX_WIDTH_RATIO = 0.78
DEFAULT_SUBTITLE_MAX_LINES = 2
DEFAULT_SUBTITLE_FONT_SCALE = 0.85
DEFAULT_SUBTITLE_SHADOW = 0
DEFAULT_KARAOKE_TIMING_OFFSET_MS = 250
DEFAULT_KARAOKE_ACTIVE_COLOR = "&H0000D7FF"
DEFAULT_KARAOKE_INACTIVE_COLOR = "&H00FFFFFF"
MIN_KARAOKE_EVENT_DURATION = 0.05
FFMPEG_TIMEOUT_SECONDS = 600
FFMPEG_ERROR_TAIL_LINES = 35
SUPABASE_PUBLIC_OBJECT_MARKERS = (
    "/storage/v1/object/public/",
    "/object/public/",
)


class FfmpegCommandError(RuntimeError):
    pass


@dataclass(frozen=True)
class SubtitleStyle:
    mode: str
    font_size: int = DEFAULT_SUBTITLE_FONT_SIZE
    stroke_width: int = DEFAULT_SUBTITLE_STROKE_WIDTH
    bottom_margin: int = DEFAULT_SUBTITLE_BOTTOM_MARGIN
    max_width_ratio: float = DEFAULT_SUBTITLE_MAX_WIDTH_RATIO
    max_lines: int = DEFAULT_SUBTITLE_MAX_LINES
    font_scale: float = DEFAULT_SUBTITLE_FONT_SCALE
    shadow: int = DEFAULT_SUBTITLE_SHADOW

    @property
    def scaled_font_size(self) -> int:
        ass_base_size = self.font_size / 3 if self.font_size > 30 else self.font_size
        return max(10, int(round(ass_base_size * self.font_scale)))

    @property
    def side_margin(self) -> int:
        side_margin = int(round(WIDTH * (1.0 - self.max_width_ratio) / 2.0))
        return max(40, side_margin)


def command_for_log(command: list[str]) -> str:
    return shlex.join(str(part) for part in command)


def useful_log_tail(stdout: str, stderr: str, max_lines: int = FFMPEG_ERROR_TAIL_LINES) -> str:
    combined = "\n".join(part for part in [stdout.strip(), stderr.strip()] if part)
    lines = [line for line in combined.splitlines() if line.strip()]
    return "\n".join(lines[-max_lines:])


def ffmpeg_error_message(
    label: str,
    command: list[str],
    stdout: str,
    stderr: str,
    *,
    return_code: int | None = None,
    timeout_seconds: int | None = None,
) -> str:
    command_text = command_for_log(command)
    tail = useful_log_tail(stdout, stderr)
    if timeout_seconds is not None:
        title = f"Rendu FFmpeg interrompu apres {timeout_seconds} secondes."
    else:
        title = f"{label} a echoue avec le code retour {return_code}."

    details = f"\nDernieres lignes FFmpeg:\n{tail}" if tail else ""
    return f"{title}\nCommande: {command_text}{details}"


def run_command(
    command: list[str],
    cwd: Path | None = None,
    *,
    label: str = "Commande FFmpeg",
    timeout_seconds: int = FFMPEG_TIMEOUT_SECONDS,
) -> None:
    command_text = command_for_log(command)
    logger.info("[ffmpeg] start label=%s timeout_seconds=%s cwd=%s command=%s", label, timeout_seconds, cwd, command_text)
    process = subprocess.Popen(
        command,
        cwd=cwd,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    try:
        stdout, stderr = process.communicate(timeout=timeout_seconds)
    except subprocess.TimeoutExpired:
        process.terminate()
        try:
            stdout, stderr = process.communicate(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            stdout, stderr = process.communicate()
        logger.error(
            "[ffmpeg] timeout label=%s timeout_seconds=%s command=%s\n%s",
            label,
            timeout_seconds,
            command_text,
            useful_log_tail(stdout, stderr, max_lines=80),
        )
        raise FfmpegCommandError(
            ffmpeg_error_message(label, command, stdout, stderr, timeout_seconds=timeout_seconds)
        )

    logger.info(
        "[ffmpeg] finished label=%s return_code=%s command=%s\n%s",
        label,
        process.returncode,
        command_text,
        useful_log_tail(stdout, stderr, max_lines=80),
    )
    if process.returncode != 0:
        raise FfmpegCommandError(
            ffmpeg_error_message(label, command, stdout, stderr, return_code=process.returncode)
        )


def command_output(command: list[str]) -> str:
    process = subprocess.run(command, capture_output=True, text=True)
    if process.returncode != 0:
        details = (process.stderr or process.stdout or "").strip()
        raise RuntimeError(details or f"Command failed: {' '.join(command)}")
    return process.stdout.strip()


def audio_duration(settings: Settings, audio_path: Path) -> float:
    output = command_output(
        [
            settings.ffprobe_path,
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "json",
            str(audio_path),
        ]
    )
    data = json.loads(output)
    return float(data["format"]["duration"])


def visual_durations(total_duration: float, visual_count: int) -> list[float]:
    if visual_count <= 0:
        return []
    if total_duration <= 0:
        raise RuntimeError(f"Audio duration must be positive, got {total_duration:.3f}s.")
    base_duration = total_duration / visual_count
    durations = [base_duration for _ in range(visual_count)]
    durations[-1] = max(0.1, total_duration - sum(durations[:-1]))
    return durations


def create_slideshow_video(settings: Settings, visuals: list[Path], durations: list[float], destination: Path) -> None:
    if len(visuals) != len(durations):
        raise RuntimeError(f"Visual count and duration count mismatch: {len(visuals)} visuals, {len(durations)} durations.")
    if not visuals:
        raise RuntimeError("Cannot create slideshow without visuals.")
    for visual, duration in zip(visuals, durations):
        if duration <= 0:
            raise RuntimeError(f"Invalid visual duration for {visual.name}: {duration:.3f}s.")

    command = [settings.ffmpeg_path, "-hide_banner", "-nostdin", "-y"]
    for visual, duration in zip(visuals, durations):
        if visual.suffix.lower() in IMAGE_EXTENSIONS:
            command.extend(["-loop", "1", "-t", f"{duration:.3f}", "-i", str(visual)])
        else:
            command.extend(["-stream_loop", "-1", "-t", f"{duration:.3f}", "-i", str(visual)])

    filter_parts = []
    concat_inputs = []
    for index, duration in enumerate(durations):
        fade_in_duration = min(TRANSITION_SECONDS, duration / 4)
        fade_out_duration = min(TRANSITION_SECONDS, duration / 4)
        fade_out_start = max(0.0, duration - fade_out_duration)
        filter_parts.append(
            f"[{index}:v]"
            f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=increase,"
            f"crop={WIDTH}:{HEIGHT},"
            "setsar=1,"
            f"fps={FPS},"
            "eq=contrast=1.06:brightness=-0.025,"
            f"trim=duration={duration:.3f},"
            "setpts=PTS-STARTPTS,"
            f"fade=t=in:st=0:d={fade_in_duration:.3f},"
            f"fade=t=out:st={fade_out_start:.3f}:d={fade_out_duration:.3f},"
            "format=yuv420p"
            f"[v{index}]"
        )
        concat_inputs.append(f"[v{index}]")

    filter_parts.append(f"{''.join(concat_inputs)}concat=n={len(visuals)}:v=1:a=0[vout]")
    logger.info(
        "[render montage] visual_count=%s durations=%s output=%s filter=%s",
        len(visuals),
        [round(duration, 3) for duration in durations],
        destination,
        ";".join(filter_parts),
    )
    command.extend(
        [
            "-filter_complex",
            ";".join(filter_parts),
            "-map",
            "[vout]",
            "-t",
            f"{sum(durations):.3f}",
            "-r",
            str(FPS),
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            str(destination),
        ]
    )
    run_command(command, label="Montage visuels")


def add_audio(settings: Settings, video_path: Path, audio_path: Path, destination: Path, duration: float) -> None:
    logger.info("[render audio] duration_seconds=%.3f source_video=%s audio=%s output=%s", duration, video_path, audio_path, destination)
    run_command(
        [
            settings.ffmpeg_path,
            "-hide_banner",
            "-nostdin",
            "-y",
            "-i",
            str(video_path),
            "-i",
            str(audio_path),
            "-t",
            f"{duration:.3f}",
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "18",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-movflags",
            "+faststart",
            str(destination),
        ],
        label="Ajout audio",
    )


def ass_color_env(value: str | None, default: str) -> str:
    color = (value or default).strip().upper().rstrip("&")
    if not color.startswith("&H"):
        color = f"&H{color}"
    return color if re.fullmatch(r"&H[0-9A-F]{8}", color) else default


def subtitle_style(mode: str, manifest: dict[str, Any]) -> SubtitleStyle:
    style = manifest.get("subtitle_style") if isinstance(manifest.get("subtitle_style"), dict) else {}
    return SubtitleStyle(
        mode=mode,
        font_size=int(style.get("font_size", DEFAULT_SUBTITLE_FONT_SIZE)),
        stroke_width=int(style.get("stroke_width", DEFAULT_SUBTITLE_STROKE_WIDTH)),
        bottom_margin=int(style.get("bottom_margin", DEFAULT_SUBTITLE_BOTTOM_MARGIN)),
        max_width_ratio=min(0.95, max(0.5, float(style.get("max_width_ratio", DEFAULT_SUBTITLE_MAX_WIDTH_RATIO)))),
        max_lines=max(1, min(3, int(style.get("max_lines", DEFAULT_SUBTITLE_MAX_LINES)))),
        font_scale=min(1.5, max(0.5, float(style.get("font_scale", DEFAULT_SUBTITLE_FONT_SCALE)))),
        shadow=max(0, int(style.get("shadow", DEFAULT_SUBTITLE_SHADOW))),
    )


def burn_subtitles(settings: Settings, source: Path, subtitles_path: Path, destination: Path, cwd: Path, manifest: dict[str, Any]) -> None:
    style_config = subtitle_style("srt", manifest)
    style = (
        "FontName=Arial,"
        f"FontSize={style_config.scaled_font_size},"
        "PrimaryColour=&H00FFFFFF,"
        "OutlineColour=&H00000000,"
        "BorderStyle=1,"
        f"Outline={style_config.stroke_width},"
        f"Shadow={style_config.shadow},"
        "Alignment=2,"
        f"MarginV={style_config.bottom_margin},"
        f"MarginL={style_config.side_margin},"
        f"MarginR={style_config.side_margin}"
    )
    subtitles_filter = f"subtitles={subtitles_path.name}:force_style='{style}':wrap_unicode=1"
    logger.info("[render subtitles] mode=classic source=%s subtitles=%s output=%s", source, subtitles_path, destination)
    run_command(
        [
            settings.ffmpeg_path,
            "-hide_banner",
            "-nostdin",
            "-y",
            "-i",
            str(source),
            "-vf",
            subtitles_filter,
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "18",
            "-c:a",
            "copy",
            "-movflags",
            "+faststart",
            str(destination),
        ],
        cwd=cwd,
        label="Sous-titres SRT",
    )


def normalize_word_items(data: object) -> list[dict[str, object]]:
    if isinstance(data, dict):
        if isinstance(data.get("words"), list):
            raw_words = data["words"]
        elif isinstance(data.get("alignment"), dict) and isinstance(data["alignment"].get("words"), list):
            raw_words = data["alignment"]["words"]
        else:
            raw_words = []
    elif isinstance(data, list):
        raw_words = data
    else:
        raw_words = []

    words: list[dict[str, object]] = []
    for item in raw_words:
        if not isinstance(item, dict):
            continue
        text = str(item.get("text") or item.get("word") or "").strip()
        start = item.get("start") if item.get("start") is not None else item.get("start_time")
        end = item.get("end") if item.get("end") is not None else item.get("end_time")
        try:
            start_float = float(start)
            end_float = float(end)
        except (TypeError, ValueError):
            continue
        if text and end_float > start_float:
            words.append({"text": text, "start": start_float, "end": end_float})
    return words


def apply_karaoke_timing_offset(words: list[dict[str, object]], offset_ms: int) -> list[dict[str, object]]:
    offset_seconds = offset_ms / 1000.0
    shifted_words = []
    for word in words:
        start = max(0.0, float(word["start"]) + offset_seconds)
        end = max(start + 0.05, float(word["end"]) + offset_seconds)
        shifted_words.append({"text": word["text"], "start": start, "end": end})
    return shifted_words


def ass_timestamp(seconds: float) -> str:
    centiseconds = int(round(max(0.0, seconds) * 100))
    hours = centiseconds // 360000
    centiseconds %= 360000
    minutes = centiseconds // 6000
    centiseconds %= 6000
    secs = centiseconds // 100
    cs = centiseconds % 100
    return f"{hours}:{minutes:02d}:{secs:02d}.{cs:02d}"


def escape_ass_text(text: str) -> str:
    return text.replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}").replace("\n", " ")


def build_karaoke_lines(words: list[dict[str, object]], max_words: int = 7, max_duration: float = 3.2) -> list[list[dict[str, object]]]:
    lines: list[list[dict[str, object]]] = []
    current: list[dict[str, object]] = []
    line_start: float | None = None
    for word in words:
        start = float(word["start"])
        end = float(word["end"])
        if line_start is None:
            line_start = start
        if current and (len(current) >= max_words or end - line_start > max_duration):
            lines.append(current)
            current = []
            line_start = start
        current.append(word)
    if current:
        lines.append(current)
    return lines


def karaoke_event_ranges(group: list[dict[str, object]]) -> list[tuple[float, float]]:
    if not group:
        return []
    boundaries = [float(group[0]["start"])]
    for word in group[1:]:
        boundaries.append(max(float(word["start"]), boundaries[-1] + MIN_KARAOKE_EVENT_DURATION))
    group_end = max(float(group[-1]["end"]), boundaries[-1] + MIN_KARAOKE_EVENT_DURATION)
    return [
        (start, max(boundaries[index + 1] if index + 1 < len(boundaries) else group_end, start + MIN_KARAOKE_EVENT_DURATION))
        for index, start in enumerate(boundaries)
    ]


def write_karaoke_ass(words: list[dict[str, object]], destination: Path, manifest: dict[str, Any]) -> None:
    style_config = subtitle_style("karaoke", manifest)
    style_source = manifest.get("subtitle_style") if isinstance(manifest.get("subtitle_style"), dict) else {}
    active_color = ass_color_env(style_source.get("active_color"), DEFAULT_KARAOKE_ACTIVE_COLOR)
    inactive_color = ass_color_env(style_source.get("inactive_color"), DEFAULT_KARAOKE_INACTIVE_COLOR)
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {WIDTH}
PlayResY: {HEIGHT}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,{style_config.scaled_font_size},{inactive_color},{active_color},&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,{style_config.stroke_width},{style_config.shadow},2,{style_config.side_margin},{style_config.side_margin},{style_config.bottom_margin},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    events = []
    max_words = 5 if style_config.max_lines <= 1 else 7
    for group in build_karaoke_lines(words, max_words=max_words):
        for active_index, (start, end) in enumerate(karaoke_event_ranges(group)):
            parts = []
            for index, word in enumerate(group):
                color = active_color if index == active_index else inactive_color
                parts.append(f"{{\\c{color}&}}{escape_ass_text(str(word['text']))}")
            events.append(f"Dialogue: 0,{ass_timestamp(start)},{ass_timestamp(end)},Default,,0,0,0,,{' '.join(parts)}")
    destination.write_text(header + "\n".join(events) + "\n", encoding="utf-8")


def ass_path_filter(path: Path) -> str:
    return path.resolve().as_posix().replace("\\", "/").replace(":", "\\:").replace("'", "\\'")


def burn_ass_subtitles(settings: Settings, source: Path, ass_path: Path, destination: Path) -> None:
    logger.info("[render subtitles] mode=karaoke source=%s ass=%s output=%s", source, ass_path, destination)
    run_command(
        [
            settings.ffmpeg_path,
            "-hide_banner",
            "-nostdin",
            "-y",
            "-i",
            str(source),
            "-vf",
            f"ass='{ass_path_filter(ass_path)}'",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "18",
            "-c:a",
            "copy",
            "-movflags",
            "+faststart",
            str(destination),
        ],
        label="Sous-titres karaoke ASS",
    )


def apply_subtitles(
    settings: Settings,
    source: Path,
    subtitles_path: Path | None,
    word_timestamps_path: Path | None,
    output_path: Path,
    work_dir: Path,
    manifest: dict[str, Any],
) -> None:
    subtitles = manifest.get("subtitles") if isinstance(manifest.get("subtitles"), dict) else {}
    mode = str(
        manifest.get("local_subtitle_mode")
        or subtitles.get("local_mode")
        or manifest.get("subtitle_mode")
        or subtitles.get("mode")
        or "srt"
    ).lower()
    if mode == "classic":
        mode = "srt"
    logger.info("[render subtitles] selected_mode=%s srt=%s words=%s output=%s", mode, bool(subtitles_path), bool(word_timestamps_path), output_path)

    if mode == "karaoke" and word_timestamps_path:
        try:
            words = normalize_word_items(json.loads(word_timestamps_path.read_text(encoding="utf-8")))
            if not words:
                raise RuntimeError("word timestamp file is empty or invalid")
            style_source = manifest.get("subtitle_style") if isinstance(manifest.get("subtitle_style"), dict) else {}
            offset_ms = int(style_source.get("karaoke_timing_offset_ms", DEFAULT_KARAOKE_TIMING_OFFSET_MS))
            ass_path = work_dir / "subtitles_karaoke.ass"
            write_karaoke_ass(apply_karaoke_timing_offset(words, offset_ms), ass_path, manifest)
            burn_ass_subtitles(settings, source, ass_path, output_path)
            return
        except Exception:
            logger.exception("Karaoke subtitles failed; falling back to SRT if available.")

    if subtitles_path:
        burn_subtitles(settings, source, subtitles_path, output_path, work_dir, manifest)
    else:
        shutil.copy2(source, output_path)


def manifest_asset_ref(asset: dict[str, Any], fallback_bucket: str) -> tuple[str, str]:
    bucket = asset.get("bucket_name") or asset.get("bucketName") or fallback_bucket
    path = asset.get("storage_path") or asset.get("storagePath")
    if not isinstance(path, str) or not path:
        raise RuntimeError(f"Missing storage_path in manifest asset: {asset}")
    return normalize_storage_ref(str(bucket), path)


def normalize_storage_ref(bucket: str, storage_path: str) -> tuple[str, str]:
    normalized_bucket = bucket.strip().strip("/")
    normalized_path = storage_path.strip()

    if not normalized_bucket:
        raise RuntimeError(f"Bucket Supabase Storage manquant pour le chemin {storage_path!r}.")
    if not normalized_path:
        raise RuntimeError(f"Chemin Supabase Storage manquant dans le bucket {normalized_bucket}.")

    parsed = urlparse(normalized_path)
    if parsed.scheme and parsed.netloc:
        public_path = unquote(parsed.path)
        for marker in SUPABASE_PUBLIC_OBJECT_MARKERS:
            marker_index = public_path.find(marker)
            if marker_index >= 0:
                object_ref = public_path[marker_index + len(marker):].lstrip("/")
                object_bucket, _, object_path = object_ref.partition("/")
                if object_bucket:
                    normalized_bucket = object_bucket
                normalized_path = object_path
                break
        else:
            raise RuntimeError(
                f"URL publique Supabase non convertible en chemin Storage: {storage_path!r}."
            )

    normalized_path = normalized_path.replace("\\", "/").lstrip("/")
    bucket_prefix = f"{normalized_bucket}/"
    if normalized_path.startswith(bucket_prefix):
        normalized_path = normalized_path[len(bucket_prefix):]

    if not normalized_path:
        raise RuntimeError(f"Chemin Supabase Storage vide apres normalisation dans {normalized_bucket}.")
    if normalized_path.startswith("http://") or normalized_path.startswith("https://"):
        raise RuntimeError(
            f"URL publique refusee comme chemin Storage dans {normalized_bucket}: {storage_path!r}."
        )

    return normalized_bucket, normalized_path


def log_storage_download(kind: str, bucket: str, storage_path: str, draft_id: str) -> None:
    logger.info(
        "[storage download] type=%s draft_id=%s bucket=%s path=%s",
        kind,
        draft_id,
        bucket,
        storage_path,
    )


def storage_missing_message(kind: str, bucket: str, storage_path: str, error: Exception) -> str:
    label_by_kind = {
        "manifest": "Manifest",
        "visual": "Visuel",
        "audio": "Audio",
        "srt": "SRT",
        "json": "JSON sous-titres",
    }
    label = label_by_kind.get(kind, kind)
    details = str(error).strip()
    suffix = f" Detail Supabase: {details}" if details else ""
    return f"{label} introuvable dans {bucket} a {storage_path}.{suffix}"


def download_storage_file(
    client: RendererSupabase,
    kind: str,
    bucket: str,
    storage_path: str,
    destination: Path,
    draft_id: str,
) -> None:
    bucket, storage_path = normalize_storage_ref(bucket, storage_path)
    log_storage_download(kind, bucket, storage_path, draft_id)
    try:
        client.download_to_file(bucket, storage_path, destination)
    except Exception as exc:
        raise RuntimeError(storage_missing_message(kind, bucket, storage_path, exc)) from exc


def download_storage_json(
    client: RendererSupabase,
    kind: str,
    bucket: str,
    storage_path: str,
    draft_id: str,
) -> dict[str, Any]:
    bucket, storage_path = normalize_storage_ref(bucket, storage_path)
    log_storage_download(kind, bucket, storage_path, draft_id)
    try:
        raw = client.download_bytes(bucket, storage_path)
    except Exception as exc:
        raise RuntimeError(storage_missing_message(kind, bucket, storage_path, exc)) from exc
    return json.loads(raw.decode("utf-8"))


def load_manifest_assets(
    client: RendererSupabase,
    manifest: dict[str, Any],
    work_dir: Path,
    draft_id: str,
) -> tuple[list[Path], Path, Path | None, Path | None]:
    visuals_dir = work_dir / "visuals"
    visuals: list[Path] = []
    for index, visual in enumerate(manifest.get("visuals") or [], start=1):
        if not isinstance(visual, dict):
            continue
        bucket, storage_path = manifest_asset_ref(visual, client.settings.video_output_bucket)
        local_file = visual.get("local_file")
        destination = work_dir / str(local_file) if isinstance(local_file, str) else visuals_dir / f"{index:03d}{Path(storage_path).suffix or '.jpg'}"
        download_storage_file(client, "visual", bucket, storage_path, destination, draft_id)
        if destination.suffix.lower() not in VISUAL_EXTENSIONS:
            raise RuntimeError(f"Unsupported visual extension: {destination.name}")
        visuals.append(destination)

    audio = manifest.get("audio")
    if not isinstance(audio, dict):
        raise RuntimeError("Manifest missing audio object.")
    audio_bucket, audio_path = manifest_asset_ref(audio, client.settings.video_output_bucket)
    audio_destination = work_dir / str(audio.get("local_file") or "voice.mp3")
    download_storage_file(client, "audio", audio_bucket, audio_path, audio_destination, draft_id)

    subtitles = manifest.get("subtitles") if isinstance(manifest.get("subtitles"), dict) else {}
    srt_path = None
    if isinstance(subtitles.get("srt"), dict):
        bucket, storage_path = manifest_asset_ref(subtitles["srt"], client.settings.video_output_bucket)
        srt_path = work_dir / "subtitles.srt"
        download_storage_file(client, "srt", bucket, storage_path, srt_path, draft_id)

    words_path = None
    if isinstance(subtitles.get("json"), dict):
        bucket, storage_path = manifest_asset_ref(subtitles["json"], client.settings.video_output_bucket)
        words_path = work_dir / "word_timestamps.json"
        download_storage_file(client, "json", bucket, storage_path, words_path, draft_id)

    if not visuals:
        raise RuntimeError("Manifest contains no usable visuals.")
    return visuals, audio_destination, srt_path, words_path


def render_job(settings: Settings, client: RendererSupabase, job: RenderJob) -> tuple[str, str]:
    manifest_bucket, manifest_path = client.read_manifest_reference(job)
    manifest = download_storage_json(client, "manifest", manifest_bucket, manifest_path, job.draft_id)
    draft_id = str(manifest.get("draft_id") or job.draft_id)

    with tempfile.TemporaryDirectory(prefix="shorts-render-") as temp_name:
        work_dir = Path(temp_name)
        logger.info("Rendering job=%s draft=%s work_dir=%s manifest=%s", job.id, draft_id, work_dir, manifest_path)
        visuals, audio_path, subtitles_path, words_path = load_manifest_assets(client, manifest, work_dir, draft_id)
        duration = audio_duration(settings, audio_path)
        durations = visual_durations(duration, len(visuals))
        silent_video = work_dir / "slideshow.mp4"
        audio_video = work_dir / "with_audio.mp4"
        final_video = work_dir / "final.mp4"
        logger.info(
            "[render plan] job=%s draft=%s visual_count=%s audio_duration_seconds=%.3f visual_durations=%s subtitles_srt=%s subtitles_json=%s final_output=%s",
            job.id,
            draft_id,
            len(visuals),
            duration,
            [round(value, 3) for value in durations],
            bool(subtitles_path),
            bool(words_path),
            final_video,
        )
        create_slideshow_video(settings, visuals, durations, silent_video)
        add_audio(settings, silent_video, audio_path, audio_video, duration)
        apply_subtitles(settings, audio_video, subtitles_path, words_path, final_video, work_dir, manifest)

        if not final_video.exists() or final_video.stat().st_size <= 0:
            raise RuntimeError("Renderer produced an empty final video.")
        logger.info("[render output] final_video=%s size_bytes=%s", final_video, final_video.stat().st_size)

        timestamp = job.id.replace("-", "")
        file_name = f"{draft_id}-{timestamp}.mp4"
        output_path = f"lignes-interieures/videos/{draft_id}/{file_name}"
        tmp_output_path = f"{output_path}.uploading"
        output_url = client.upload_file(settings.video_output_bucket, tmp_output_path, final_video, "video/mp4", upsert=True)
        tmp_copy = work_dir / "uploaded-copy.mp4"
        client.download_to_file(settings.video_output_bucket, tmp_output_path, tmp_copy)
        output_url = client.upload_file(settings.video_output_bucket, output_path, tmp_copy, "video/mp4")
        client.remove_file(settings.video_output_bucket, tmp_output_path)
        client.upsert_rendered_asset(
            draft_id=draft_id,
            file_name=file_name,
            output_path=output_path,
            output_url=output_url,
            metadata={
                "asset_role": "short_video_final_render",
                "content_type": "video/mp4",
                "duration_seconds": duration,
                "manifest_path": manifest_path,
                "render_job_id": job.id,
                "renderer": "services/shorts-renderer",
                "visual_count": len(visuals),
            },
        )
        return output_path, output_url
