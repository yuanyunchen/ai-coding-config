"""Local, version-addressable extracts for Slack attachments. No network URLs are accepted."""
import json
import os
import re
import sys
import zipfile
import posixpath
from xml.etree import ElementTree as ET

mode, path = sys.argv[1:3]

def office():
    with zipfile.ZipFile(path) as z:
        # A Slack file is untrusted compressed input; reject oversized archives explicitly.
        if sum(i.file_size for i in z.infolist()) > 128 * 1024 * 1024:
            raise ValueError("expanded Office document exceeds 128 MiB")
        def xml(name):
            data = z.read(name)
            if re.search(br'<!\s*(?:DOCTYPE|ENTITY)', data, re.I):
                raise ValueError("DTD or entity declarations are unsupported")
            return ET.fromstring(data)
        def content(root):
            return ''.join(n.text or '' for n in root.iterfind('.//{*}t'))
        if mode == 'docx':
            for i,p in enumerate(xml('word/document.xml').findall('.//{*}p'),1):
                if value := content(p): print(f'[paragraph {i}] {value}')
        elif mode == 'pptx':
            refs = {rel.attrib['Id']:rel.attrib['Target'] for rel in xml('ppt/_rels/presentation.xml.rels')}
            slides = []
            for slide in xml('ppt/presentation.xml').findall('.//{*}sldId'):
                rid = next(value for key,value in slide.attrib.items() if key.endswith('}id'))
                target = refs[rid]
                slides.append(posixpath.normpath(target.lstrip('/') if target.startswith('/') else posixpath.join('ppt',target)))
            for i,s in enumerate(slides,1):
                print(f'[slide {i}]')
                for p in xml(s).findall('.//{*}p'):print(content(p))
        else:
            shared=[content(x) for x in xml('xl/sharedStrings.xml')] if 'xl/sharedStrings.xml' in z.namelist() else []
            refs={x.attrib['Id']:x.attrib['Target'] for x in xml('xl/_rels/workbook.xml.rels')}
            for sheet in xml('xl/workbook.xml').findall('.//{*}sheet'):
                rid=next(v for k,v in sheet.attrib.items() if k.endswith('}id'))
                target=refs[rid]
                name=posixpath.normpath(target.lstrip('/') if target.startswith('/') else posixpath.join('xl',target))
                print('[worksheet '+sheet.attrib['name']+']')
                for cell in xml(name).findall('.//{*}c'):
                    v=cell.findtext('{*}v','');fmt=cell.attrib.get('t')
                    if fmt=='s':v=shared[int(v)]
                    if fmt=='inlineStr':v=content(cell)
                    if not v:v=cell.findtext('{*}f','')
                    if v: print(cell.attrib.get('r','?'), v)

try:
    if mode=='audio':
        transcript=os.fdopen(os.dup(1),'w', encoding='utf-8')
        os.dup2(2,1)  # native BLAS banners must not appear in the transcript
        try: from faster_whisper import WhisperModel
        except ImportError:
            raise ValueError('local speech model unavailable; install faster-whisper in MEDIA_PYTHON')
        # Local-only model selection prevents a clip triggering model downloads.
        model=WhisperModel(os.getenv('WHISPER_MODEL','tiny'),device='cpu',compute_type='int8',local_files_only=True)
        segments,_=model.transcribe(path,vad_filter=True)
        count=0
        for seg in segments:
            print(f'[{seg.start:.1f}s–{seg.end:.1f}s] {seg.text}',file=transcript);count+=1
        if not count:raise ValueError('no speech recognized')
    elif mode=='pdf':
        from pypdf import PdfReader
        pdf=PdfReader(path)
        print(json.dumps([p.extract_text() or "" for p in pdf.pages],ensure_ascii=False))
    else: office()
except Exception as error:
    sys.exit(str(error))
