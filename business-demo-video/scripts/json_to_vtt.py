#!/usr/bin/env python3
"""
Converts journey.json Business Requirements (BDD) captions and Playwright Compositor timeline offsets into a WebVTT (.vtt) subtitle track.
Usage: python3 json_to_vtt.py public/clips/journey.json out/demo.vtt
"""
import json
import sys


def format_timestamp(seconds: float) -> str:
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = seconds % 60
    return f"{hrs:02d}:{mins:02d}:{secs:06.3f}"


def main():
    if len(sys.argv) < 3:
        print("Usage: python3 json_to_vtt.py <journey.json> <output.vtt>")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    captions = data.get("captions", [])
    lines = ["WEBVTT", ""]

    for idx, cap in enumerate(captions, start=1):
        start_sec = float(cap.get("startSec", 0.0))
        end_sec = float(cap.get("endSec", start_sec + 4.0))
        text = cap.get("text", "").strip()
        if not text:
            continue
        lines.append(str(idx))
        lines.append(f"{format_timestamp(start_sec)} --> {format_timestamp(end_sec)}")
        lines.append(text)
        lines.append("")

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"Generated WebVTT subtitle file: {output_path} ({len(captions)} cues)")


if __name__ == "__main__":
    main()
