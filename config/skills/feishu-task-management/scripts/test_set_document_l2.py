import importlib.util
import json
import pathlib
import unittest
from unittest import mock


SCRIPT = pathlib.Path(__file__).with_name("set_document_l2.py")
SPEC = importlib.util.spec_from_file_location("set_document_l2", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


class SetDocumentL2Test(unittest.TestCase):
    def test_extracts_docx_token_from_url(self):
        token, doc_type = MODULE.parse_document_ref(
            "https://bytedance.larkoffice.com/docx/FNVgdGi7Io9zXIxDbJsuQp4NsDe"
        )
        self.assertEqual(token, "FNVgdGi7Io9zXIxDbJsuQp4NsDe")
        self.assertEqual(doc_type, "docx")

    def test_l2_requires_tenant_readable_and_no_external_access(self):
        self.assertTrue(
            MODULE.is_l2(
                {
                    "link_share_entity": "tenant_readable",
                    "external_access": False,
                    "invite_external": False,
                }
            )
        )
        self.assertFalse(
            MODULE.is_l2(
                {
                    "link_share_entity": "closed",
                    "external_access": False,
                    "invite_external": False,
                }
            )
        )

    def test_patch_changes_only_l2_fields_and_verifies_readback(self):
        responses = [
            {"data": {"permission_public": {"link_share_entity": "closed", "external_access": False, "invite_external": False}}},
            {"data": {}},
            {"data": {"permission_public": {"link_share_entity": "tenant_readable", "external_access": False, "invite_external": False, "comment_entity": "anyone_can_view"}}},
        ]

        with mock.patch.object(MODULE, "run_json", side_effect=responses) as run_json:
            result = MODULE.ensure_l2("FNVgdGi7Io9zXIxDbJsuQp4NsDe", "docx")

        self.assertEqual(result["status"], "updated")
        patch_call = run_json.call_args_list[1].args[0]
        payload = json.loads(patch_call[patch_call.index("--data") + 1])
        self.assertEqual(
            payload,
            {
                "external_access": False,
                "invite_external": False,
                "link_share_entity": "tenant_readable",
            },
        )
        self.assertIn("--yes", patch_call)

    def test_already_l2_is_idempotent(self):
        response = {
            "data": {
                "permission_public": {
                    "link_share_entity": "tenant_readable",
                    "external_access": False,
                    "invite_external": False,
                }
            }
        }
        with mock.patch.object(MODULE, "run_json", return_value=response) as run_json:
            result = MODULE.ensure_l2("FNVgdGi7Io9zXIxDbJsuQp4NsDe", "docx")
        self.assertEqual(result["status"], "unchanged")
        self.assertEqual(run_json.call_count, 1)


if __name__ == "__main__":
    unittest.main()
