import json
import subprocess
import sys
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("calc_duration.py")


class CalcDurationCliTest(unittest.TestCase):
    def run_cli(self, *args):
        result = subprocess.run(
            [sys.executable, str(SCRIPT), *args],
            check=True,
            capture_output=True,
            text=True,
        )
        return json.loads(result.stdout)

    def test_formats_active_and_post_close_return(self):
        result = self.run_cli(
            "--start", "2026-07-09",
            "--close", "2026-07-17",
            "--last-data", "2026-07-24",
        )
        self.assertEqual(result["label"], "8.5d + 7d")

    def test_first_day_counts_as_half_day(self):
        result = self.run_cli(
            "--start", "2026-07-16",
            "--last-data", "2026-07-27",
        )
        self.assertEqual(result["label"], "11.5d")


if __name__ == "__main__":
    unittest.main()
