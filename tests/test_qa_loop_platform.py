import re
import subprocess
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SYNC = (REPO / 'scripts/sync.sh').read_text()
PULL = (REPO / 'scripts/pull.sh').read_text()


def function(script, name):
    return re.search(rf'(?ms)^{name}\(\) \{{.*?^\}}', script).group()


class QaLoopPlatformTests(unittest.TestCase):
    def test_native_skill_is_not_shared_in_either_sync_mode(self):
        check = function(SYNC, 'should_sync_skill')
        for target in ('claude', 'cursor', 'trae', 'codex'):
            for mirror in (0, 1):
                with self.subTest(target=target, mirror=mirror):
                    result = subprocess.run(
                        ['bash', '-c', check + '\nMIRROR=$1; should_sync_skill qa-loop "$2"',
                         'test', str(mirror), target], capture_output=True, text=True,
                    )
                    self.assertEqual(result.returncode, 1, result.stderr)

    def test_mirror_preserves_native_skill_while_pruning_shared_skills(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / 'source'
            target = Path(tmp) / 'target'
            source.mkdir()
            for name in ('qa-loop', 'ordinary'):
                (target / name).mkdir(parents=True)
                (target / name / 'SKILL.md').write_text(name)
            program = '\n'.join((
                function(SYNC, 'should_sync_skill'),
                function(SYNC, 'prune_skill_dir'),
                re.search(r'(?m)^run\(\).*$', SYNC).group(),
                'MIRROR=1; DO_BACKUP=0; DRY_RUN=0; TGT=codex',
                'prune_skill_dir "$1" "$2" skills',
            ))
            subprocess.run(['bash', '-c', program, 'test', str(source), str(target)],
                           check=True, capture_output=True, text=True)
            self.assertTrue((target / 'qa-loop/SKILL.md').exists())
            self.assertEqual((target / 'qa-loop/SKILL.md').read_text(), 'qa-loop')
            self.assertFalse((target / 'ordinary').exists())

    def test_pull_keeps_native_skill_out_of_common_snapshot(self):
        block = re.search(
            r'(?ms)^if \[ -d "\$SRC_BASE/skills" \]; then.*?^fi', PULL,
        ).group()
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / 'source'
            config = Path(tmp) / 'config'
            (config / 'skills').mkdir(parents=True)
            for name in ('qa-loop', 'ordinary'):
                (source / 'skills' / name).mkdir(parents=True)
                (source / 'skills' / name / 'SKILL.md').write_text(name)
            program = '\n'.join((
                function(PULL, 'rsync_pull'),
                'SRC_BASE=$1; CONFIG=$2; DRY_RUN=0; RSYNC_EXCLUDE=()', block,
            ))
            subprocess.run(['bash', '-c', program, 'test', str(source), str(config)],
                           check=True, capture_output=True, text=True)
            self.assertFalse((config / 'skills/qa-loop').exists())
            self.assertEqual((config / 'skills/ordinary/SKILL.md').read_text(), 'ordinary')


if __name__ == '__main__':
    unittest.main()
