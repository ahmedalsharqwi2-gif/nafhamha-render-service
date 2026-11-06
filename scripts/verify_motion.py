#!/usr/bin/env python3
"""Objective 'is anything moving?' gate for a rendered review MP4.

    python verify_motion.py video.mp4 [--max-static 0.10] [--max-run 0.75] [--min-mean 1.8]

Samples 4 frames/s at 135x240 grey, measures the mean absolute change between neighbours.
An interval with change < 0.3 is 'static'. Exits 1 when the film is too still.
Thresholds are the defaults are the numbers MEASURED on the owner reference render (static 29.9 pct, longest still stretch 1.5 s, mean change 1.93). That is the FLOOR: anything stiller than the reference fails. Tighten with the flags once a better sample is approved.
"""
import argparse, json, subprocess, sys
import numpy as np

def intervals(path, fps=4):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vf", f"fps={fps},scale=135:240,format=gray",
                          "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
    frames = np.frombuffer(raw, np.uint8).reshape(-1, 240, 135).astype(float)
    return np.abs(np.diff(frames, axis=0)).mean(axis=(1, 2)), fps

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("video")
    ap.add_argument("--max-static", type=float, default=0.30)
    ap.add_argument("--max-run", type=float, default=1.5)
    ap.add_argument("--min-mean", type=float, default=1.9)
    a = ap.parse_args()
    d, fps = intervals(a.video)
    static = d < 0.3
    run = best = 0
    for s in static:
        run = run + 1 if s else 0; best = max(best, run)
    res = {"video": a.video, "seconds": round(len(d) / fps, 1), "mean_change": round(float(d.mean()), 2),
           "static_ratio": round(float(static.mean()), 3), "longest_static_run_s": best / fps}
    res["pass"] = (res["static_ratio"] <= a.max_static and res["longest_static_run_s"] <= a.max_run and res["mean_change"] >= a.min_mean)
    print(json.dumps(res, ensure_ascii=False)); sys.exit(0 if res["pass"] else 1)

if __name__ == "__main__":
    main()
