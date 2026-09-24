#!/usr/bin/env python3
"""Sync field Monster Illustrations + Item Codex entries from Official La Tale Wiki.

Field and Dungeon data are intentionally separate. This script writes only locations
explicitly labelled (Field) or (Fields) by the wiki. If parsing fails, the existing
snapshot is preserved.
"""
from __future__ import annotations
from html.parser import HTMLParser
from pathlib import Path
from datetime import date
import json,re,urllib.parse,urllib.request
ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'assets'/'field-data.js'
API='https://latale.wiki.gg/api.php'
PAGES={'monsters':('Monster_Illustrations','https://latale.wiki.gg/wiki/Monster_Illustrations'),'codex':('Item_Codex','https://latale.wiki.gg/wiki/Item_Codex')}
def clean(v): return re.sub(r'\s+',' ',re.sub(r'\[[^\]]+\]','',v or '')).strip()

MONSTER_NAME_FIXES={
  'FootprElemental Intensity Cat':'Footprint Cat',
  'Brown FootprElemental Intensity Cat':'Brown Footprint Cat',
  'Grey FootprElemental Intensity Cat':'Grey Footprint Intensity Cat',
  'Niez':'Nez',
  'Shadow Tief':'Shadow Thief',
  'SaElemental Intensity Valkyrie Ranger':'Saint Valkyrie Ranger',
  'SaElemental Intensity Steed':'Saint Steed',
}

MONSTER_FIELD_NAME_FIXES={
  ('Dark Forest','Gargoyle'):'Gargoyle (Dark Forest)',
  ('Undercity Construction','Gargoyle'):'Gargoyle (Undercity Construction)',
}
MONSTER_LEVEL_FIXES={
  ('Tiger Temple','Red Max'):'Lv. 161 ~ 180',
  ('Scrap Valley Entrance','Cordless'):'Lv. 161 ~ 180',
  ('Scrap Valey Entrance','Cordless'):'Lv. 161 ~ 180',
}

MONSTER_TOWER_ILLUSTRATIONS=[
  ('Tower Mountain Kong (Lv. 110)','Lv. 101 ~ 120'),
  ('Tower Calamity Jane (Lv. 120)','Lv. 101 ~ 120'),
  ('Tower Lavi Kong (Lv. 130)','Lv. 121 ~ 140'),
  ('Tower PPPPriring (Lv. 140)','Lv. 121 ~ 140'),
  ('Tower Mermech (Lv. 150)','Lv. 141 ~ 160'),
  ('Tower Rabana (Lv. 160)','Lv. 141 ~ 160'),
  ('Tower Undertaker (Lv. 170)','Lv. 161 ~ 180'),
  ('Tower King Asura (Lv. 180)','Lv. 161 ~ 180'),
  ('Tower Cerberus (Lv. 190)','Lv. 181 ~ 200'),
  ('Tower Siam (Lv. 200)','Lv. 181 ~ 200'),
]
def monster_name(v):
  n=clean(v)
  return MONSTER_NAME_FIXES.get(n,n)

def pint(v,d=1):
  try:return max(1,int(v or d))
  except:return d
class P(HTMLParser):
  def __init__(self):
    super().__init__();self.tables=[];self.depth=0;self.rows=None;self.row=None;self.parts=None;self.attrs={};self.heading_parts=None;self.current_heading='';self.current_level='';self.recent_text=[]

  def _capture_level(self,text):
    if not text:return
    self.recent_text.append(text)
    self.recent_text=self.recent_text[-12:]
    probe=clean(' '.join(self.recent_text))
    m=re.search(r'((?:S?Lv\.?\s*)?\d+\s*[~\-–—]\s*\d+)\s*(?:Monsters?)?',probe,re.I)
    if m:
      label=clean(m.group(1))
      label=re.sub(r'^Lv\s+','Lv. ',label,flags=re.I)
      label=re.sub(r'^SLv\s+','SLv. ',label,flags=re.I)
      self.current_level=label
  def handle_starttag(self,t,a):
    t=t.lower();a=dict(a)
    if t in ('h1','h2','h3','h4','h5','h6') and self.depth==0:
      self.heading_parts=[]
    elif t=='table':
      self.depth+=1
      if self.depth==1:self.rows=[]
    elif self.depth==1 and t=='tr':self.row=[]
    elif self.depth==1 and t in ('td','th') and self.row is not None:self.parts=[];self.attrs=a
    elif self.parts is not None and t in ('br','p','div','li'):self.parts.append(' ')
  def handle_data(self,d):
    self._capture_level(d)
    if self.parts is not None:self.parts.append(d)
    elif self.heading_parts is not None:self.heading_parts.append(d)
  def handle_endtag(self,t):
    t=t.lower()
    if self.depth==1 and t in ('td','th') and self.parts is not None:
      self.row.append({'text':clean(''.join(self.parts)),'rowspan':pint(self.attrs.get('rowspan')),'colspan':pint(self.attrs.get('colspan'))});self.parts=None;self.attrs={}
    elif self.depth==1 and t=='tr' and self.row is not None:
      if self.row:self.rows.append(self.row)
      self.row=None
    elif t=='table' and self.depth:
      if self.depth==1 and self.rows is not None:
        self.tables.append((self.current_heading,self.current_level,self.rows));self.rows=None
      self.depth-=1
    elif t in ('h1','h2','h3','h4','h5','h6') and self.heading_parts is not None:
      heading=clean(''.join(self.heading_parts))
      if heading:self.current_heading=heading
      self.heading_parts=None
def expand(raw):
  active={};out=[]
  for rr in raw:
    row={}
    for c,(remaining,text) in list(active.items()):
      row[c]=text
      if remaining<=1:del active[c]
      else:active[c]=(remaining-1,text)
    col=0
    for cell in rr:
      while col in row:col+=1
      text=clean(cell['text']);rs=pint(cell.get('rowspan'));cs=pint(cell.get('colspan'))
      for off in range(cs):
        row[col+off]=text
        if rs>1:active[col+off]=(rs-1,text)
      col+=cs
    w=max(row.keys(),default=-1)+1;out.append([row.get(i,'') for i in range(w)])
  w=max(map(len,out),default=0);return [r+['']*(w-len(r)) for r in out]
def fetch(page):
  q=urllib.parse.urlencode({'action':'parse','page':page,'prop':'text','format':'json','formatversion':'2'})
  req=urllib.request.Request(API+'?'+q,headers={'User-Agent':'LtDungeonTracker/1.0 (GitHub Pages sync)','Accept':'application/json'})
  with urllib.request.urlopen(req,timeout=60) as r:data=json.loads(r.read().decode())
  html=data.get('parse',{}).get('text','')
  if not html:raise RuntimeError(f'No HTML returned for {page}')
  return html
def field_name(location):
  s=clean(location)
  # Both wiki pages use labels such as "Forest Area (Field)". Item Codex
  # calls the column Source and a few rows have casing/closing-paren quirks.
  # Only accept rows whose source resolves to a field; dungeon/crafting sources
  # remain excluded.
  m=re.match(r'^(.*?)\s*\(\s*Fields?\s*\)?\s*$',s,re.I)
  if not m:return None
  name=clean(m.group(1))
  return name or None
def normalize_category(v):
  s=clean(v).lower()
  if 'equip' in s:return 'Equipment'
  if 'event' in s:return 'Event'
  if s=='etc' or 'etc' in s:return 'ETC'
  return 'Other'
def level_section(text):
  """Return a wiki level section label from a heading OR table separator row.

  The Monster Illustrations page has used both real section headings and
  in-table separator rows over time, so only reading the nearest <h*> is not
  reliable enough for the generated static data.
  """
  h=clean(text)
  # Examples: "Lv. 1 ~ 20 Monsters", "Lv 21-40", "SLv. 1 ~ 10 Monsters".
  m=re.search(r'((?:S?Lv\.?\s*)?\d+\s*[~\-–—]\s*\d+)\s*(?:Monsters?)?',h,re.I)
  if m:
    label=clean(m.group(1))
    # Keep the displayed label consistent even if the wiki omits the dot.
    label=re.sub(r'^Lv\s+','Lv. ',label,flags=re.I)
    label=re.sub(r'^SLv\s+','SLv. ',label,flags=re.I)
    return label
  return ''

def parse(html, with_category=False, with_group=False):
  p=P();p.feed(html);result={}
  # wiki.gg renders each collapsible level-band label as its own tiny table in
  # some page revisions. Carry the most recently seen level section forward
  # across table boundaries so the following Name / Given Stats / Location
  # table inherits it.
  pending_section=''
  for heading,captured_level,raw in p.tables:
    table=expand(raw)
    heading_section=(captured_level or level_section(heading)) if with_group else ''
    table_section=''
    if with_group:
      for probe in table:
        candidate=level_section(' '.join(clean(x) for x in probe if clean(x)))
        if candidate:
          table_section=candidate
          break
      if heading_section:
        pending_section=heading_section
      elif table_section:
        pending_section=table_section
    matched_data_table=False
    for hi,row in enumerate(table[:12]):
      headers=[clean(x).lower() for x in row]
      loc=next((i for i,h in enumerate(headers) if h in ('location','locations','area','source')),None)
      name=next((i for i,h in enumerate(headers) if h in ('name','item','item name','monster','monster name')),None)
      cat=next((i for i,h in enumerate(headers) if h in ('category','type','item type','item category')),None)
      group=next((i for i,h in enumerate(headers) if h in ('group','monster group','illustration group')),None)
      level=next((i for i,h in enumerate(headers) if h in ('level','lv','lvl','monster level')),None)
      if loc is None or name is None:continue
      # wiki.gg collapsible tables put the level band in a full-width row
      # *above* the Name / Given Stats / Location header row, e.g.
      # "Lv. 1 ~ 20 Monsters [Collapse]". Seed this table's section from
      # those pre-header rows before parsing the monster rows below.
      matched_data_table=True
      current_section=heading_section or pending_section
      if with_group:
        for pre in table[:hi]:
          pre_section=level_section(' '.join(clean(x) for x in pre if clean(x)))
          if pre_section:
            current_section=pre_section
            pending_section=pre_section
      for r in table[hi+1:]:
        # wiki.gg has alternated between <h*> level headings and separator rows
        # inside a larger table. Capture either form so every following monster
        # inherits the correct section until the next separator appears.
        if with_group:
          row_section=level_section(' '.join(clean(x) for x in r if clean(x)))
          if row_section:
            current_section=row_section
            pending_section=row_section
            # Separator rows do not represent a monster entry. Continue unless
            # this row also contains an actual field source + monster name.
            row_loc=clean(r[loc]) if loc < len(r) else ''
            row_name=clean(r[name]) if name < len(r) else ''
            if not field_name(row_loc) or not row_name:
              continue
        if max(loc,name)>=len(r):continue
        n=monster_name(r[name]) if with_group else clean(r[name]);f=field_name(r[loc])
        if with_group and n and f:
          n=MONSTER_FIELD_NAME_FIXES.get((f,n),n)
        if n and f:
          if with_category:
            category=normalize_category(r[cat] if cat is not None and cat<len(r) else '')
            result.setdefault(f,[]).append({'name':n,'category':category,'sourceField':f})
          elif with_group:
            explicit_group=clean(r[group] if group is not None and group<len(r) else '')
            explicit_level=clean(r[level] if level is not None and level<len(r) else '')
            fixed_level=MONSTER_LEVEL_FIXES.get((f,n),'')
            grp=fixed_level or explicit_group or current_section or explicit_level
            lvl=fixed_level or current_section or explicit_level
            result.setdefault(f,[]).append({'name':n,'group':grp,'level':lvl,'sourceField':f})
          else: result.setdefault(f,[]).append(n)
      break
    # A one-row collapsible header table has no Name/Location columns. Its
    # level band is intentionally retained in pending_section for the next
    # data table.
  if with_category:
    out={}
    for k,vals in result.items():
      seen=set();uniq=[]
      for v in vals:
        key=(v['name'],v['category'],v.get('sourceField',''))
        if key not in seen:seen.add(key);uniq.append(v)
      out[k]=uniq
    return out
  if with_group:
    out={}
    for k,vals in result.items():
      seen=set();uniq=[]
      for v in vals:
        key=(v['name'],v.get('sourceField',''))
        if key not in seen:
          seen.add(key);uniq.append(v)
      out[k]=uniq
    return out
  return {k:list(dict.fromkeys(v)) for k,v in result.items()}
def main():
  monsters=parse(fetch(PAGES['monsters'][0]),with_group=True);codex=parse(fetch(PAGES['codex'][0]),with_category=True)
  if not monsters:raise RuntimeError('No field Monster Illustrations parsed; existing snapshot preserved')
  if not codex:raise RuntimeError('No field Item Codex entries parsed; existing snapshot preserved')

  # TAID locations are dungeons, not field maps. The wiki Monster Illustration
  # source can list them alongside field locations, so exclude them here.
  for source in (monsters, codex):
    for field in list(source):
      if re.match(r'^\s*Taid\s*:', field, flags=re.I):
        source.pop(field, None)

  # The wiki currently omits/misplaces several Monster Tower illustration rows.
  # Keep the known Tower sequence together in the Monster Tower field.
  tower_names={name for name,_ in MONSTER_TOWER_ILLUSTRATIONS}
  tower_names_compact={re.sub(r'\s+','',name) for name in tower_names}
  for field,entries in list(monsters.items()):
    monsters[field]=[
      entry for entry in entries
      if re.sub(r'\s+','',entry.get('name','')) not in tower_names_compact
    ]
  monsters['Monster Tower']=[
    {'name':name,'group':level,'level':level,'sourceField':'Monster Tower'}
    for name,level in MONSTER_TOWER_ILLUSTRATIONS
  ]

  fields={}
  for wiki_order,(f,names) in enumerate(monsters.items()):
    row=fields.setdefault(f,{'illustrations':[],'codex':[],'wiki_order':wiki_order})
    row['illustrations']=names
    row['wiki_order']=min(row.get('wiki_order',wiki_order),wiki_order)
  for f,names in codex.items():fields.setdefault(f,{'illustrations':[],'codex':[],'wiki_order':10**9})['codex']=names
  data={'source':{k:v[1] for k,v in PAGES.items()},'updated':date.today().isoformat(),'fields':dict(sorted(fields.items()))}
  OUTPUT.write_text('window.LT_FIELD_DATA = '+json.dumps(data,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
  print(f"Synced {len(fields)} fields, {sum(len(v['illustrations']) for v in fields.values())} illustrations, {sum(len(v['codex']) for v in fields.values())} codex entries")
if __name__=='__main__':main()
