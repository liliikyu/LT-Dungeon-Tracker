#!/usr/bin/env python3
"""Sync achievements that can be mapped to tracked Fields from Official La Tale Wiki."""
from __future__ import annotations
from html.parser import HTMLParser
from pathlib import Path
from datetime import date
import json,re,urllib.parse,urllib.request

ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'assets'/'field-achievements.js'
FIELD_DATA=ROOT/'assets'/'field-data.js'
API='https://latale.wiki.gg/api.php'
SOURCE='https://latale.wiki.gg/wiki/Achievement'

# Explicit title -> field fallbacks for Explore achievements whose title/objective
# does not use the tracker field spelling.
FIELD_MAP={
  "Andersen's Fairy Tale":"Aquarium",
  "Courageous Training":"Spooky Village",
  "Hiding Place":"Behemoth's Stomach",
  "Very Spicy Pepper":"Lilliput Highway",
  "Find the Queen!":"Ant Cave",
  "Diet Is Hard!":"Cookie Garden",
  "Beautiful Snow":"Bridge of Merhen",
  "Ocean's Outlaw":"Phantom Ship",
  "New Discovery":"Druid Ridge",
  "Mysterious Aura":"Aurora Forest",
  "Mysterious Island?":"Marin Island",
  "Horrendous Mountain?":"Devil's Mountain",
  "Dwarf City":"Aki City",
  "New Continent":"Eastern Jude Frontier",
  "Summer Resort Area?!":"Treasure Beach",
  "The City of Hope?!":"Lumen",
  "Lumen Health Club?!":"Waterlily Forest",
  "To the Deep Ocean":"Coral City",
  "Memories":"Old Belos",
  "Streak of Lights":"Amarune Desert",
  "Underworld City":"Tartaros",
  "Monster Tree Hill":"Monster Tree Hill",
  "Phantom Land":"Adrica",
  "Zerenis Hill":"Zerenis Hill",
  "Moros":"Moros",
  "Zisk Plains":"Zisk Plains",
  "Phobos":"Phobos",
  "Eidos, the Sanctuary":"Eidos, the Sanctuary",
  "Deborah Snowfield":"Deborah Snowfield",
  "Knossos":"Knossos",
  "Avalon":"Avalon",
  "Pneuma":"Pheuma",
  "Aie Island":"Air Island",
  "Orcarium":"Oracrium",
  "Lifthrasir & Crystal Moon Forest":"Crystal Moon Forest",
  "Elysia":"Elysia",
  "Laran Road":"Laran Road",
  "Vigrid":"Vigrid",
  "Invernell of Light":"Invernel Ruins",
  "Canyon of the Winds":"Vayuna Canyon",
  "Glaston Admin Area":"Glaston Admin Area",
  "Oscar Road":"Oscar Road",
  "Perfect for hiding":"Linlos, Sacred place",
}

def clean(v):
  return re.sub(r'\s+',' ',re.sub(r'\[[^\]]+\]','',v or '')).strip()

def norm(v): return re.sub(r'[^a-z0-9]+',' ',str(v).lower()).strip()

def category_name(heading):
  h=clean(heading)
  h=re.sub(r'\bAchievements?\b','',h,flags=re.I).strip(' -–—:')
  return h or 'Achievement'

class P(HTMLParser):
  def __init__(self):
    super().__init__();self.tables=[];self.depth=0;self.rows=None;self.row=None;self.parts=None
    self.heading_parts=None;self.heading_tag=None;self.current_heading='';self.table_heading=''
  def handle_starttag(self,t,a):
    t=t.lower()
    if self.depth==0 and t in ('h2','h3','h4'):
      self.heading_parts=[];self.heading_tag=t
    if t=='table':
      self.depth+=1
      if self.depth==1:self.rows=[];self.table_heading=self.current_heading
    elif self.depth==1 and t=='tr':self.row=[]
    elif self.depth==1 and t in ('td','th') and self.row is not None:self.parts=[]
    elif self.parts is not None and t in ('br','p','div','li'):self.parts.append(' | ')
  def handle_data(self,d):
    if self.heading_parts is not None:self.heading_parts.append(d)
    if self.parts is not None:self.parts.append(d)
  def handle_endtag(self,t):
    t=t.lower()
    if self.heading_parts is not None and t==self.heading_tag:
      self.current_heading=clean(''.join(self.heading_parts));self.heading_parts=None;self.heading_tag=None
    if self.depth==1 and t in ('td','th') and self.parts is not None:
      self.row.append(clean(''.join(self.parts)));self.parts=None
    elif self.depth==1 and t=='tr' and self.row is not None:
      if self.row:self.rows.append(self.row)
      self.row=None
    elif t=='table' and self.depth:
      if self.depth==1 and self.rows is not None:self.tables.append((self.table_heading,self.rows));self.rows=None
      self.depth-=1

def fetch():
  q=urllib.parse.urlencode({'action':'parse','page':'Achievement','prop':'text','format':'json','formatversion':'2'})
  req=urllib.request.Request(API+'?'+q,headers={'User-Agent':'LtDungeonTracker/1.0 (field achievement sync)','Accept':'application/json'})
  with urllib.request.urlopen(req,timeout=60) as r:data=json.loads(r.read().decode())
  html=data.get('parse',{}).get('text','')
  if not html:raise RuntimeError('No Achievement HTML returned')
  return html

def tracker_fields():
  txt=FIELD_DATA.read_text(encoding='utf-8')
  m=re.search(r'window\.LT_FIELD_DATA\s*=\s*(\{.*\})\s*;?\s*$',txt,re.S)
  if not m:return []
  return list(json.loads(m.group(1)).get('fields',{}).keys())

def compact_notes(raw):
  parts=[clean(x) for x in re.split(r'\s*\|\s*|[\r\n]+',raw or '') if clean(x)]
  parts=[x for x in parts if not x.lower().startswith('file:')]
  return ' · '.join(parts)

def first_note_location(raw):
  notes=compact_notes(raw)
  return notes.split(' · ',1)[0] if notes else ''

def match_fields(name,objective,notes,fields):
  matched=[]
  title_target=FIELD_MAP.get(name)
  if title_target in fields:matched.append(title_target)
  probe=norm(f'{name} {objective} {first_note_location(notes)}')
  for field in fields:
    if norm(field) and norm(field) in probe and field not in matched:matched.append(field)
  return matched

def main():
  p=P();p.feed(fetch());fields={}
  tracked=tracker_fields()
  for heading,table in p.tables:
    if not table:continue
    header=None
    for i,row in enumerate(table[:6]):
      h=[norm(x) for x in row]
      if 'achievement' in h and 'objective' in h and 'notes' in h:
        header=(i,h.index('achievement'),h.index('objective'),h.index('notes'),h.index('achievement points') if 'achievement points' in h else None);break
    if not header:continue
    category=category_name(heading)
    hi,ai,oi,ni,pi=header
    for r in table[hi+1:]:
      if max(ai,oi,ni)>=len(r):continue
      name,objective,raw_notes=clean(r[ai]),clean(r[oi]),clean(r[ni])
      if not name or name.lower()=='total achievement points':continue
      locations=match_fields(name,objective,raw_notes,tracked)
      if not locations:continue
      points=0
      if pi is not None and pi<len(r):
        try:points=int(re.sub(r'\D','',r[pi]) or 0)
        except:points=0
      rec={'name':name,'category':category,'objective':objective,'notes':compact_notes(raw_notes),'points':points}
      for location in locations:
        bucket=fields.setdefault(location,[])
        if not any(norm(x.get('name'))==norm(name) and norm(x.get('objective'))==norm(objective) for x in bucket):
          bucket.append(rec)

  if not fields:raise RuntimeError('No Field achievements parsed; existing snapshot preserved')
  payload={'source':SOURCE,'updated':date.today().isoformat(),'fields':dict(sorted(fields.items()))}
  OUTPUT.write_text('window.LT_FIELD_ACHIEVEMENTS = '+json.dumps(payload,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
  print(f"Synced {sum(len(v) for v in fields.values())} achievements across {len(fields)} field locations")

if __name__=='__main__':main()
