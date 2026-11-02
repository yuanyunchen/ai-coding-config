import importlib.util,json,os,subprocess,tempfile,tomllib,unittest
from pathlib import Path
REPO=Path(__file__).resolve().parents[1]
SCRIPT=REPO/'scripts/codex-skill-isolation.py'
class IsolationTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.home=Path(self.temp.name).resolve()
  self.config=self.home/'.codex/config.toml';self.config.parent.mkdir()
  self.original={'model':'keep-model','plugins':{'sample':{'enabled':True}},'skills':{'config':[{'path':'/unrelated/SKILL.md','enabled':True}]}}
  self.config.write_text('model="keep-model"\n[plugins.sample]\nenabled=true\n[[skills.config]]\npath="/unrelated/SKILL.md"\nenabled=true\n')
  self.entry=self.add('.codex/skills/feishu-task-management/SKILL.md')
  self.child=self.add('.codex/skills/feishu-task-management/subskills/lark-doc/SKILL.md')
  self.upstream=self.add('.agents/skills/lark-doc/SKILL.md')
  self.generic=self.add('.agents/skills/ordinary/SKILL.md')
 def add(self,relative):
  p=self.home/relative;p.parent.mkdir(parents=True,exist_ok=True);p.write_text('---\nname: example\ndescription: example\n---\n');return p
 def run_script(self,*args):
  subprocess.run(['python3',str(SCRIPT),*args],env={**os.environ,'HOME':str(self.home)},check=True,capture_output=True,text=True)
 def data(self):return tomllib.loads(self.config.read_text())
 def test_isolation_and_preservation(self):
  self.run_script();data=self.data();entries={e['path']:e['enabled'] for e in data.pop('skills')['config']}
  self.assertEqual(data,{k:v for k,v in self.original.items() if k!='skills'})
  self.assertFalse(entries[str(self.child)]);self.assertFalse(entries[str(self.upstream)])
  self.assertTrue(entries['/unrelated/SKILL.md']);self.assertNotIn(str(self.entry),entries);self.assertNotIn(str(self.generic),entries)
  self.assertTrue(all(p.exists() for p in [self.entry,self.child,self.upstream,self.generic]))
 def test_idempotence(self):
  self.run_script();first=self.config.read_bytes();self.run_script();self.assertEqual(first,self.config.read_bytes())
 def test_new_child_on_next_sync(self):
  self.run_script();new=self.add('.codex/skills/feishu-task-management/subskills-local/new-domain/SKILL.md');self.run_script()
  self.assertIn({'path':str(new),'enabled':False},self.data()['skills']['config'])
 def test_dry_run_does_not_write(self):
  before=self.config.read_bytes();self.run_script('--dry-run');self.assertEqual(before,self.config.read_bytes())
 def test_reenabled_child_is_disabled_again(self):
  with self.config.open('a') as f:f.write('\n[[skills.config]]\npath='+json.dumps(str(self.child))+'\nenabled=true\n')
  self.run_script();entries=[e for e in self.data()['skills']['config'] if e['path']==str(self.child)]
  self.assertEqual(entries,[{'path':str(self.child),'enabled':False}])
 def test_personal_deploy_preserves_skill_rules(self):
  self.run_script();personal=self.home/'personal.toml';personal.write_text('model="new-model"\n');before=self.data()['skills']
  subprocess.run(['python3',str(REPO/'scripts/codex-personal.py'),'deploy',str(personal),str(self.config)],check=True,capture_output=True)
  self.assertEqual(self.data()['skills'],before);self.assertEqual(self.data()['model'],'new-model')
if __name__=='__main__':unittest.main()
