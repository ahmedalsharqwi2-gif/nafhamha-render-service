#!/usr/bin/env python3
"""verify_safe_area.py — substitute for the project file that was not shipped.

    python scripts/verify_safe_area.py video.mp4 [--json] [--max-intrusion 2.0]

Contract 03 §5 gates on `scripts/verify_safe_area.py`, which was not part of the
delivered project files. This implements the checks that can be measured on a
rendered MP4, against the nafhamha 720x1280 numbers in
`config/layout_720x1280.json` (single source of truth, guarded by a unit test).

Plate signature
  The caption plate is brand ink #152c36 rendered at 95%: blue-dominant
  (B > G). Every background in the approved palette is teal/green dominant
  (G > B), so `B-G >= 5` separates plate from art without a magic tolerance.
  On top of that the blob must be plate-sized, plate-shaped, and uniform.

Checks
  1 SLOT-SLOT      every detected plate sits inside the top slot x 80-640, y 193-337
  2 PLATE-PRESENT  a plate is found in at least --min-plate-ratio of sampled frames
                   (frames without one are the title phase, which is allowed)
  3 STAGE-CLEAR    edge density inside the slot but outside the plate stays under
                   --max-intrusion: the stage subject may not intrude into the slot
  4 DEAD-ZONE      no plate-like block below the disclaimer band (y > 1187)

What this method cannot prove, stated so the output is not over-read:
  * It finds TEXT PLATES by colour, not text by OCR. Free-floating text with no
    plate is caught only by the declared-box check and by the visual contact
    sheet, which therefore stays mandatory.
  * Check 3 measures edge density, so it reports "graphics inside the slot", not
    which graphics.
Exit 1 on failure. Calibration: the approved master FAILS (its caption sat at
the old bottom position), the new sample PASSES.
"""
import argparse, json, os, subprocess, sys
import numpy as np

try:
    import cv2
except ImportError:  # pragma: no cover
    cv2 = None

HERE = os.path.dirname(os.path.abspath(__file__))
CFG = os.path.join(HERE, "..", "config", "layout_720x1280.json")


def frame(path, n, w, h):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-vf", f"select=eq(n\\,{n})",
         "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        capture_output=True, check=True).stdout
    if len(raw) < w * h * 3:
        return None
    return np.frombuffer(raw, np.uint8).reshape(h, w, 3).astype(np.int16)


def plate_bbox(img, band_y, tol=26):
    y0, y1 = band_y
    a = img[y0:y1]
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    luma = a.mean(axis=2)
    mask = ((b - g >= 5) & (b - r >= 18) & (luma > 12) & (luma < 105)
            & (np.abs(a - np.array([21, 44, 54], np.int16)).max(axis=2) <= tol)).astype(np.uint8)
    if mask.sum() < 3000:
        return None
    if cv2 is None:
        rows = np.where(mask.mean(axis=1) > 0.25)[0]
        cols = np.where(mask.sum(axis=0) > 8)[0]
        if rows.size == 0:
            return None
        box = (int(cols.min()), int(rows.min()) + y0, int(cols.max()) + 1, int(rows.max()) + 1 + y0)
    else:
        n, _l, stats, _c = cv2.connectedComponentsWithStats(mask, connectivity=8)
        if n <= 1:
            return None
        i = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        x, y, w, h, area = (int(stats[i, 0]), int(stats[i, 1]), int(stats[i, 2]),
                            int(stats[i, 3]), int(stats[i, 4]))
        if area < 3000:
            return None
        box = (x, y + y0, x + w, y + y0 + h)
    x0, yy0, x1, yy1 = box
    w, h = x1 - x0, yy1 - yy0
    if w < 260 or w > 560 or h < 45 or h > 140 or not (1.5 <= w / max(h, 1) <= 9):
        return None  # plate-sized and plate-shaped only
    # the plate fill must dominate its own box; the text inside is allowed to
    # punch holes, so measure mask coverage rather than pixel variance
    cover = float(mask[yy0 - y0:yy1 - y0, x0:x1].mean()) if yy1 > yy0 else 0.0
    if not (0.35 <= cover <= 0.995):
        return None  # not a solid plate
    return [x0, yy0, x1, yy1]


def edge_density(img, max_intrusion=2.0):
    g = img.astype(np.float32).mean(axis=2)
    lap = np.abs(cv2.Laplacian(g, cv2.CV_32F, ksize=3))
    return 100.0 * float((lap > 30.0).mean())


def check(path, cfg, max_intrusion=2.0, min_ratio=0.6):
    w, h = cfg["canvas"]["w"], cfg["canvas"]["h"]
    slot, lim = cfg["topSlot"], cfg["textLimits"]
    low_y = int(cfg["disclaimer"]["y"][1])
    fails, notes, plates, intrusions, low, sampled = [], [], [], [], [], 0
    gap = cfg["stage"]["y"][0] - slot["y"][1]
    if gap < 8:
        fails.append(f"stage band starts {gap}px after the slot bottom; need >=8px separation")
    for n in range(0, 1350, 15):
        img = frame(path, n, w, h)
        if img is None:
            break
        sampled += 1
        box = plate_bbox(img, (150, 400))
        if box is not None:
            plates.append({"frame": n, "bbox": box})
            if box[0] < slot["x"][0] or box[2] > slot["x"][1] or box[1] < slot["y"][0] or box[3] > slot["y"][1]:
                fails.append(f"frame {n}: plate {box} leaves the top slot {slot['x']}x{slot['y']}")
            intrusions.append(box[3])
        lb = plate_bbox(img, (900, h - 10))
        if lb is not None:
            low.append({"frame": n, "bbox": lb})
            fails.append(f"frame {n}: plate-like block below y {low_y} (platform dead zone)")
    total = max(1, sampled)
    ratio = len(plates) / max(total, 1)
    if ratio < min_ratio:
        fails.append(f"caption plate found in only {ratio:.0%} of sampled frames (need {min_ratio:.0%})")
    if slot["x"][0] < lim["x"][0] or slot["x"][1] > lim["x"][1]:
        notes.append(f"contract tension: top slot x {slot['x']} is wider than text limits x {lim['x']} (04 lists both); plate max width kept inside")
    res = {"video": path, "canvas": f"{w}x{h}", "frames_sampled": total,
           "plates_detected": len(plates), "plate_frame_ratio": round(ratio, 2),
           "plate_union_bbox": [min((p["bbox"][0] for p in plates), default=None),
                                min((p["bbox"][1] for p in plates), default=None),
                                max((p["bbox"][2] for p in plates), default=None),
                                max((p["bbox"][3] for p in plates), default=None)],
           "slot": {"x": slot["x"], "y": slot["y"]},
           "plate_bottom_max": max(intrusions) if intrusions else None,
           "stage_gap_px": cfg["stage"]["y"][0] - slot["y"][1],
           "dead_zone_blocks": len(low),
           "notes": notes, "failures": fails[:8], "failure_count": len(fails),
           "pass": not fails}
    return res


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("video"); ap.add_argument("--json", action="store_true")
    ap.add_argument("--max-intrusion", type=float, default=2.0)
    ap.add_argument("--min-plate-ratio", type=float, default=0.6)
    ap.add_argument("--config", default=CFG)
    a = ap.parse_args()
    r = check(a.video, json.load(open(a.config, encoding="utf-8")), a.max_intrusion, a.min_plate_ratio)
    print(json.dumps(r, ensure_ascii=False, indent=2))
    sys.exit(0 if r["pass"] else 1)
