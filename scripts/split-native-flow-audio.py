import json
import math
import re
import shutil
import subprocess
from collections import OrderedDict
from pathlib import Path

import numpy as np


SAMPLE_RATE = 16000
FRAME_SECONDS = 0.035
HOP_SECONDS = 0.01
EDGE_PAD_SECONDS = 0.12
OUTPUT_BITRATE = "96k"

ROOT = Path(__file__).resolve().parents[1]
COURSE_DATA = ROOT / "data" / "nativeFlow" / "courseData.ts"
SOURCE_AUDIO_ROOT = ROOT / "public" / "images 2" / "地道语感训练"
OUTPUT_ROOT = ROOT / "public" / "native-flow-audio"


def get_ffmpeg() -> str:
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        discovered = shutil.which("ffmpeg")
        if discovered:
            return discovered
    known_paths = [
        Path(r"C:\Program Files (x86)\By Click Downloader\ffmpeg.exe"),
        Path(r"C:\Program Files (x86)\FormatFactory\ffmpeg.exe"),
        Path(r"C:\Program Files (x86)\pyTranscriber\ffmpeg.exe"),
        Path(r"C:\Users\Public\AppData\Roaming\Flixmate\ffmpeg.exe"),
    ]
    for candidate in known_paths:
        if candidate.exists():
            return str(candidate)
    raise RuntimeError("ffmpeg was not found. Install ffmpeg or imageio_ffmpeg first.")


FFMPEG = get_ffmpeg()


def load_course_data() -> dict:
    source = COURSE_DATA.read_text(encoding="utf-8")
    match = re.search(
        r"const nativeFlowSentencesByLevel: Record<NativeFlowLevelId, NativeFlowSentence\[]> = ([\s\S]*?);\n\nexport const nativeFlowProgressRows",
        source,
    )
    if not match:
        raise RuntimeError("Could not find nativeFlowSentencesByLevel in courseData.ts")
    return json.loads(match.group(1))


def sentence_output_path(level_id: str, sentence: dict) -> Path:
    return (
        OUTPUT_ROOT
        / level_id
        / f"day-{int(sentence['day']):02d}"
        / f"sentence-{int(sentence['daySentence']):02d}.mp3"
    )


def source_path(sentence: dict) -> Path:
    source_audio = sentence["sourceAudio"].replace("/", "\\")
    return SOURCE_AUDIO_ROOT / source_audio


def load_audio(path: Path) -> tuple[np.ndarray, int]:
    command = [
        FFMPEG,
        "-v",
        "error",
        "-i",
        str(path),
        "-ac",
        "1",
        "-ar",
        str(SAMPLE_RATE),
        "-f",
        "s16le",
        "-",
    ]
    raw = subprocess.check_output(command)
    samples = np.frombuffer(raw, dtype=np.int16).astype(np.float32)
    return samples, SAMPLE_RATE


def smooth(values: np.ndarray, size: int = 21) -> np.ndarray:
    if len(values) < size:
        return values
    kernel = np.ones(size) / size
    return np.convolve(values, kernel, mode="same")


def word_weight(sentence: str) -> float:
    words = re.findall(r"[A-Za-z']+", sentence)
    return max(1, len(words)) + 1.3


def choose_boundaries(sentences: list[dict], audio_path: Path) -> tuple[float, list[float]]:
    samples, sample_rate = load_audio(audio_path)
    duration = len(samples) / sample_rate
    frame_len = max(1, int(sample_rate * FRAME_SECONDS))
    hop_len = max(1, int(sample_rate * HOP_SECONDS))

    db_values = []
    times = []
    for start in range(0, max(1, len(samples) - frame_len), hop_len):
        frame = samples[start : start + frame_len]
        rms = math.sqrt(float(np.mean(frame * frame)) + 1e-9) / 32768
        db_values.append(20 * math.log10(rms + 1e-9))
        times.append((start + frame_len / 2) / sample_rate)

    db = smooth(np.array(db_values))
    times = np.array(times)
    quiet_floor, speaking_level = np.percentile(db, [2, 70])
    energy = np.clip((db - quiet_floor) / max(1e-6, speaking_level - quiet_floor), 0, 1)

    sentence_count = len(sentences)
    weights = [word_weight(sentence["english"]) for sentence in sentences]
    expected_segments = [weight / sum(weights) * duration for weight in weights]
    expected_boundaries = []
    elapsed = 0.0
    for expected_segment in expected_segments[:-1]:
        elapsed += expected_segment
        expected_boundaries.append(elapsed)

    local_minima = [
        index
        for index in range(2, len(db) - 2)
        if db[index] <= db[index - 1]
        and db[index] <= db[index + 1]
        and db[index] <= db[index - 2]
        and db[index] <= db[index + 2]
    ]

    candidates_by_boundary: list[list[int]] = []
    for boundary_index, expected in enumerate(expected_boundaries):
        previous_expected = expected_boundaries[boundary_index - 1] if boundary_index else 0.0
        next_expected = (
            expected_boundaries[boundary_index + 1]
            if boundary_index + 1 < len(expected_boundaries)
            else duration
        )
        lower = max(
            0.2,
            (previous_expected + expected) / 2 if boundary_index else 0.2,
            expected - max(2.5, expected_segments[boundary_index] * 0.9),
        )
        upper = min(
            duration - 0.2,
            (expected + next_expected) / 2
            if boundary_index + 1 < len(expected_boundaries)
            else duration - 0.2,
            expected + max(2.5, expected_segments[boundary_index + 1] * 0.9),
        )

        candidates = [index for index in local_minima if lower <= times[index] <= upper]
        window_indices = np.where((times >= lower) & (times <= upper))[0]
        if len(window_indices):
            candidates.append(int(window_indices[np.argmin(np.abs(times[window_indices] - expected))]))
            for index in window_indices[np.argsort(energy[window_indices])[:8]]:
                candidates.append(int(index))
        if not candidates:
            candidates.append(int(np.argmin(np.abs(times - expected))))

        width = max(0.5, upper - lower)
        candidates = sorted(
            set(candidates),
            key=lambda index: energy[index] + 0.25 * ((times[index] - expected) / width) ** 2,
        )[:45]
        candidates_by_boundary.append(candidates)

    layers: list[list[tuple[float, int, int, float]]] = []
    for boundary_index, candidates in enumerate(candidates_by_boundary):
        layer = []
        for candidate in candidates:
            boundary_time = float(times[candidate])
            expected = expected_boundaries[boundary_index]
            boundary_score = 0.6 * float(energy[candidate]) + 0.18 * (
                (boundary_time - expected) / max(0.5, expected_segments[boundary_index])
            ) ** 2

            if boundary_index == 0:
                segment_duration = boundary_time
                segment_score = (
                    (segment_duration - expected_segments[0])
                    / max(0.55, expected_segments[0] * 0.45)
                ) ** 2
                layer.append((segment_score + boundary_score, -1, candidate, boundary_time))
                continue

            best_score = math.inf
            best_previous = -1
            for previous_index, previous_state in enumerate(layers[-1]):
                previous_time = previous_state[3]
                segment_duration = boundary_time - previous_time
                if segment_duration < max(0.45, expected_segments[boundary_index] * 0.25):
                    continue
                if segment_duration > expected_segments[boundary_index] * 2.2 + 2:
                    continue
                segment_score = (
                    (segment_duration - expected_segments[boundary_index])
                    / max(0.55, expected_segments[boundary_index] * 0.45)
                ) ** 2
                score = previous_state[0] + segment_score + boundary_score
                if score < best_score:
                    best_score = score
                    best_previous = previous_index

            if best_previous >= 0:
                layer.append((best_score, best_previous, candidate, boundary_time))

        if not layer:
            raise RuntimeError(
                f"Could not choose audio boundary {boundary_index + 1} for {audio_path}"
            )
        layers.append(layer)

    best_score = math.inf
    best_index = -1
    for index, state in enumerate(layers[-1]):
        final_segment_duration = duration - state[3]
        final_score = (
            (final_segment_duration - expected_segments[-1])
            / max(0.55, expected_segments[-1] * 0.45)
        ) ** 2
        score = state[0] + final_score
        if score < best_score:
            best_score = score
            best_index = index

    selected_indices = []
    layer_index = best_index
    for boundary_index in range(len(layers) - 1, -1, -1):
        state = layers[boundary_index][layer_index]
        selected_indices.append(state[2])
        layer_index = state[1]
    selected_indices.reverse()
    return duration, [float(times[index]) for index in selected_indices]


def split_group(level_id: str, source_audio: str, sentences: list[dict]) -> list[dict]:
    audio_path = source_path(sentences[0])
    if not audio_path.exists():
        raise FileNotFoundError(audio_path)

    duration, boundaries = choose_boundaries(sentences, audio_path)
    cuts = [0.0, *boundaries, duration]
    generated = []
    for index, sentence in enumerate(sentences):
        output_path = sentence_output_path(level_id, sentence)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        start = max(0.0, cuts[index] - (EDGE_PAD_SECONDS if index else 0.0))
        end = min(duration, cuts[index + 1] + EDGE_PAD_SECONDS)
        command = [
            FFMPEG,
            "-y",
            "-v",
            "error",
            "-ss",
            f"{start:.3f}",
            "-to",
            f"{end:.3f}",
            "-i",
            str(audio_path),
            "-vn",
            "-ac",
            "1",
            "-codec:a",
            "libmp3lame",
            "-b:a",
            OUTPUT_BITRATE,
            str(output_path),
        ]
        subprocess.run(command, check=True)
        generated.append(
            {
                "output": str(output_path.relative_to(ROOT)),
                "source": source_audio,
                "start": round(start, 3),
                "end": round(end, 3),
                "duration": round(end - start, 3),
                "english": sentence["english"],
            }
        )
    return generated


def main() -> None:
    data = load_course_data()
    report = {}
    total = 0

    for level_id, sentences in data.items():
        groups: OrderedDict[str, list[dict]] = OrderedDict()
        for sentence in sentences:
            groups.setdefault(sentence["sourceAudio"], []).append(sentence)

        level_report = []
        for source_audio, group in groups.items():
            generated = split_group(level_id, source_audio, group)
            level_report.extend(generated)
            total += len(generated)
            print(f"{level_id} {source_audio}: {len(generated)} clips")
        report[level_id] = level_report

    report_path = ROOT / ".data" / "native-flow-audio-segments-report.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generated {total} sentence audio clips")
    print(f"Wrote {report_path}")


if __name__ == "__main__":
    main()
