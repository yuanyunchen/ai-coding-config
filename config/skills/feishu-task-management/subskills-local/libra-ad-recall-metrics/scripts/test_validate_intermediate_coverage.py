import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("validate_intermediate_coverage.py")


class ValidateIntermediateCoverageTest(unittest.TestCase):
    def run_validator(self, payload: dict) -> dict:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for flight in payload["flights"]:
                for path in flight.get("screenshots", {}).values():
                    target = root / path
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(b"png")
            manifest = root / "manifest.json"
            manifest.write_text(json.dumps(payload), encoding="utf-8")
            completed = subprocess.run(
                [sys.executable, str(SCRIPT), "--manifest", str(manifest)],
                check=True,
                capture_output=True,
                text=True,
            )
            return json.loads(completed.stdout)

    def test_reports_missing_required_branch_without_blocking(self):
        result = self.run_validator(
            {
                "flights": [
                    {
                        "flight_id": "72218092",
                        "show_intermediate": True,
                        "metric_family": "product_recall",
                        "template": "pid商品召回",
                        "group_by": "dpa_direct_id",
                        "required_branches": ["0", "77", "79"],
                        "screenshots": {"0": "0.png", "79": "79.png"},
                        "branch_identity": {
                            branch: {
                                "observed_card_title": f"[dpa_direct_id = {branch}]",
                                "observed_columns": ["广告消耗", "计费比"],
                            }
                            for branch in ("0", "79")
                        },
                    }
                ]
            }
        )
        self.assertEqual(result["status"], "partial")
        self.assertEqual(result["expected_screenshot_count"], 3)
        self.assertEqual(result["captured_screenshot_count"], 2)
        self.assertEqual(
            result["missing"], [{"flight_id": "72218092", "branch": "77"}]
        )

    def test_reports_complete_when_every_required_branch_exists(self):
        result = self.run_validator(
            {
                "flights": [
                    {
                        "flight_id": "72218092",
                        "show_intermediate": True,
                        "metric_family": "product_recall",
                        "template": "pid商品召回",
                        "group_by": "dpa_direct_id",
                        "required_branches": ["0", "77", "79"],
                        "screenshots": {
                            "0": "0.png",
                            "77": "77.png",
                            "79": "79.png",
                        },
                        "branch_identity": {
                            branch: {
                                "observed_card_title": f"[dpa_direct_id = {branch}]",
                                "observed_columns": ["广告消耗", "计费比"],
                            }
                            for branch in ("0", "77", "79")
                        },
                    }
                ]
            }
        )
        self.assertEqual(result["status"], "complete")
        self.assertEqual(result["missing"], [])

    def test_rejects_one_long_image_reused_for_two_branches(self):
        result = self.run_validator(
            {
                "flights": [
                    {
                        "flight_id": "72213590",
                        "show_intermediate": True,
                        "metric_family": "ad_recall",
                        "template": "Travel Recall",
                        "group_by": "queue_id",
                        "required_branches": ["24", "713"],
                        "screenshots": {
                            "24": "24-and-713.png",
                            "713": "24-and-713.png",
                        },
                        "branch_identity": {
                            branch: {
                                "observed_card_title": f"[queue_id = {branch}]",
                                "observed_columns": [
                                    "实际通过召回的cid*req数量",
                                    "支路独占消耗",
                                    "支路总消耗",
                                ],
                            }
                            for branch in ("24", "713")
                        },
                    }
                ]
            }
        )
        self.assertEqual(result["status"], "partial")
        self.assertEqual(result["captured_screenshot_count"], 1)
        self.assertEqual(result["reused"][0]["branch"], "713")
        self.assertEqual(result["reused"][0]["reused_from_branch"], "24")

    def test_rejects_product_metric_family_for_ad_recall_flight(self):
        result = self.run_validator(
            {
                "flights": [
                    {
                        "flight_id": "72213590",
                        "show_intermediate": True,
                        "metric_family": "ad_recall",
                        "template": "pid商品召回",
                        "group_by": "dpa_direct_id",
                        "required_branches": ["24"],
                        "screenshots": {"24": "24.png"},
                        "branch_identity": {
                            "24": {
                                "observed_card_title": "[dpa_direct_id = 24]",
                                "observed_columns": ["广告消耗", "计费比"],
                            }
                        },
                    }
                ]
            }
        )
        self.assertEqual(result["status"], "partial")
        self.assertEqual(result["identity_errors"][0]["flight_id"], "72213590")
        self.assertIn("template", result["identity_errors"][0]["reasons"])
        self.assertIn("group_by", result["identity_errors"][0]["reasons"])

    def test_rejects_manifest_without_metric_family(self):
        result = self.run_validator(
            {
                "flights": [
                    {
                        "flight_id": "72213584",
                        "show_intermediate": True,
                        "required_branches": ["24"],
                        "screenshots": {"24": "24.png"},
                    }
                ]
            }
        )
        self.assertEqual(result["status"], "partial")
        self.assertIn("metric_family", result["identity_errors"][0]["reasons"])

    def test_rejects_aggregate_card_for_required_ad_recall_branch(self):
        result = self.run_validator(
            {
                "flights": [
                    {
                        "flight_id": "72213584",
                        "show_intermediate": True,
                        "metric_family": "ad_recall",
                        "template": "Travel Recall",
                        "group_by": "queue_id",
                        "required_branches": ["24"],
                        "screenshots": {"24": "24.png"},
                        "branch_identity": {
                            "24": {
                                "observed_card_title": "召回",
                                "observed_columns": [
                                    "实际通过召回的cid*req数量",
                                    "支路独占消耗",
                                    "支路总消耗",
                                ],
                            }
                        },
                    }
                ]
            }
        )
        self.assertEqual(result["status"], "partial")
        self.assertIn("branch_title", result["identity_errors"][0]["reasons"])

    def test_accepts_ad_recall_branch_identity(self):
        result = self.run_validator(
            {
                "flights": [
                    {
                        "flight_id": "72213590",
                        "show_intermediate": True,
                        "metric_family": "ad_recall",
                        "template": "Travel Recall",
                        "group_by": "queue_id",
                        "required_branches": ["24", "713"],
                        "screenshots": {"24": "24.png", "713": "713.png"},
                        "branch_identity": {
                            branch: {
                                "observed_card_title": f"[queue_id = {branch}]",
                                "observed_columns": [
                                    "实际通过召回的cid*req数量",
                                    "支路独占消耗",
                                    "支路总消耗",
                                ],
                            }
                            for branch in ("24", "713")
                        },
                    }
                ]
            }
        )
        self.assertEqual(result["status"], "complete")
        self.assertEqual(result["identity_errors"], [])

    def test_rejects_ad_recall_columns_for_product_recall_flight(self):
        result = self.run_validator(
            {
                "flights": [
                    {
                        "flight_id": "72201669",
                        "show_intermediate": True,
                        "metric_family": "product_recall",
                        "template": "Travel Recall",
                        "group_by": "queue_id",
                        "required_branches": ["0"],
                        "screenshots": {"0": "0.png"},
                        "branch_identity": {
                            "0": {
                                "observed_card_title": "[queue_id = 0]",
                                "observed_columns": [
                                    "实际通过召回的cid*req数量",
                                    "支路独占消耗",
                                    "支路总消耗",
                                ],
                            }
                        },
                    }
                ]
            }
        )
        self.assertEqual(result["status"], "partial")
        self.assertIn("template", result["identity_errors"][0]["reasons"])
        self.assertIn("group_by", result["identity_errors"][0]["reasons"])

    def test_accepts_product_recall_branch_identity(self):
        result = self.run_validator(
            {
                "flights": [
                    {
                        "flight_id": "72201669",
                        "show_intermediate": True,
                        "metric_family": "product_recall",
                        "template": "pid商品召回",
                        "group_by": "dpa_direct_id",
                        "required_branches": ["0", "79"],
                        "screenshots": {"0": "0.png", "79": "79.png"},
                        "branch_identity": {
                            branch: {
                                "observed_card_title": f"[dpa_direct_id = {branch}]",
                                "observed_columns": ["广告消耗", "计费比"],
                            }
                            for branch in ("0", "79")
                        },
                    }
                ]
            }
        )
        self.assertEqual(result["status"], "complete")
        self.assertEqual(result["identity_errors"], [])


if __name__ == "__main__":
    unittest.main()
