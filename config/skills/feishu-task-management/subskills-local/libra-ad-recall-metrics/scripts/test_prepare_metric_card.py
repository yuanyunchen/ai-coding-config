#!/usr/bin/env python3
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw


SCRIPT = Path(__file__).with_name("prepare_metric_card.py")


class PrepareMetricCardTest(unittest.TestCase):
    def test_trims_all_sides_and_reports_pass(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            raw = root / "raw.png"
            final = root / "final.png"
            image = Image.new("RGB", (2000, 180), "white")
            draw = ImageDraw.Draw(image)
            draw.rectangle((55, 35, 1945, 145), fill=(40, 40, 40))
            image.save(raw)
            completed = subprocess.run(
                [sys.executable, str(SCRIPT), "--input", str(raw), "--output", str(final)],
                check=True,
                capture_output=True,
                text=True,
            )
            result = json.loads(completed.stdout)
            self.assertEqual(result["status"], "pass")
            self.assertTrue(result["visual_review_required"])
            self.assertLessEqual(result["right_gap_px"], 10)
            self.assertLess(final.stat().st_size, raw.stat().st_size)

    def test_blank_input_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            raw = root / "raw.png"
            final = root / "final.png"
            Image.new("RGB", (100, 100), "white").save(raw)
            completed = subprocess.run(
                [sys.executable, str(SCRIPT), "--input", str(raw), "--output", str(final)],
                capture_output=True,
                text=True,
            )
            self.assertNotEqual(completed.returncode, 0)
            self.assertFalse(final.exists())


if __name__ == "__main__":
    unittest.main()
