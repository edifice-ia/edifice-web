from __future__ import annotations

from pathlib import Path
import sys
import types


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


config_module = types.ModuleType("app.config")
config_module.Settings = object
models_module = types.ModuleType("app.models")
models_module.RenderJob = object
supabase_client_module = types.ModuleType("app.supabase_client")
supabase_client_module.RendererSupabase = object
sys.modules.setdefault("app.config", config_module)
sys.modules.setdefault("app.models", models_module)
sys.modules.setdefault("app.supabase_client", supabase_client_module)

from app.renderer import download_storage_file, manifest_asset_ref, normalize_storage_ref
from app import renderer


class MissingStorageClient:
    def download_to_file(self, bucket: str, storage_path: str, destination: Path) -> None:
        raise RuntimeError('{ "statusCode": 400, "error": "not_found", "message": "Object not found" }')


def test_normalize_storage_ref_strips_bucket_prefix_and_slash():
    bucket, storage_path = normalize_storage_ref(
        "content-assets",
        "/content-assets/lignes-interieures/audio/draft-1/voice.mp3",
    )

    assert bucket == "content-assets"
    assert storage_path == "lignes-interieures/audio/draft-1/voice.mp3"


def test_normalize_storage_ref_extracts_public_supabase_url():
    bucket, storage_path = normalize_storage_ref(
        "content-assets",
        "https://example.supabase.co/storage/v1/object/public/content-assets/lignes-interieures/visuels/a.png",
    )

    assert bucket == "content-assets"
    assert storage_path == "lignes-interieures/visuels/a.png"


def test_manifest_asset_ref_uses_storage_path_not_local_file():
    bucket, storage_path = manifest_asset_ref(
        {
            "bucketName": "content-assets",
            "storagePath": "content-assets/lignes-interieures/audio/draft-1/voice.mp3",
            "local_file": "voice.mp3",
        },
        "fallback-bucket",
    )

    assert bucket == "content-assets"
    assert storage_path == "lignes-interieures/audio/draft-1/voice.mp3"


def test_missing_storage_error_names_file_type_bucket_and_path(tmp_path: Path):
    try:
        download_storage_file(
            MissingStorageClient(),
            "audio",
            "content-assets",
            "/content-assets/lignes-interieures/audio/draft-1/voice.mp3",
            tmp_path / "voice.mp3",
            "draft-1",
        )
    except RuntimeError as exc:
        message = str(exc)
    else:
        raise AssertionError("download_storage_file should have raised")

    assert "Audio introuvable" in message
    assert "content-assets" in message
    assert "lignes-interieures/audio/draft-1/voice.mp3" in message


def test_ffmpeg_error_message_keeps_useful_tail_only():
    stderr = "\n".join([f"startup line {index}" for index in range(10)] + ["real failure: invalid filter"])
    message = renderer.ffmpeg_error_message(
        "Montage visuels",
        ["ffmpeg", "-hide_banner", "-nostdin", "-i", "input.png", "out.mp4"],
        "",
        stderr,
        return_code=1,
    )

    assert "Montage visuels a echoue avec le code retour 1" in message
    assert "Commande: ffmpeg -hide_banner -nostdin -i input.png out.mp4" in message
    assert "real failure: invalid filter" in message


def test_slideshow_png_inputs_are_looped_with_explicit_duration(tmp_path: Path):
    tmp_path.mkdir(parents=True, exist_ok=True)
    image = tmp_path / "001.png"
    image.write_bytes(b"fake")
    captured: dict[str, object] = {}
    original_run_command = renderer.run_command

    try:
        renderer.run_command = lambda command, **kwargs: captured.update({"command": command, "kwargs": kwargs})
        renderer.create_slideshow_video(
            types.SimpleNamespace(ffmpeg_path="ffmpeg"),
            [image],
            [2.5],
            tmp_path / "out.mp4",
        )
    finally:
        renderer.run_command = original_run_command

    command = captured["command"]
    assert command[:4] == ["ffmpeg", "-hide_banner", "-nostdin", "-y"]
    assert "-loop" in command
    assert command[command.index("-loop") + 1] == "1"
    assert "-t" in command
    assert command[command.index("-t") + 1] == "2.500"
    assert captured["kwargs"] == {"label": "Montage visuels"}


if __name__ == "__main__":
    test_normalize_storage_ref_strips_bucket_prefix_and_slash()
    test_normalize_storage_ref_extracts_public_supabase_url()
    test_manifest_asset_ref_uses_storage_path_not_local_file()
    test_missing_storage_error_names_file_type_bucket_and_path(ROOT / ".tmp-test")
    test_ffmpeg_error_message_keeps_useful_tail_only()
    test_slideshow_png_inputs_are_looped_with_explicit_duration(ROOT / ".tmp-test")
    print("storage refs ok")
