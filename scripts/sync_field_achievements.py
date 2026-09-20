#!/usr/bin/env python3
"""Sync Field Explore achievements from the Official La Tale Wiki."""
from __future__ import annotations
from html.parser import HTMLParser
from pathlib import Path
from datetime import date
import json, re, urllib.parse, urllib.request

ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/"assets"/"field-achievements.js"
API="https://latale.wiki.gg/api.php"

FIELD_MAP={
  "Andersen\'s Fairy Tale":"Aquarium",
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
  return re.sub(r"\s+"," ",re.sub(r"\[[^\]]+\]","",v or "")).strip()

class P(HTMLParser):
  def __init__(self):
    super().__init__();self.tables=[];self.depth=0;self.rows=None;self.row=None;self.parts=None
  def handle_starttag(self,t,a):
    t=t.lower()
    if t=="table": self.depth+=1; self.rows=[] if self.depth==1 else self.rows
    elif self.depth==1 and t=="tr": self.row=[]
    elif self.depth==1 and t in ("td","th") and self.row is not None:self.parts=[]
    elif self.parts is not None and t in ("br","p","div","li"):self.parts.append("\n")
  def handle_data(self,d):
    if self.parts is not None:self.parts.append(d)
  def handle_endtag(self,t):
    t=t.lower()
    if self.depth==1 and t in ("td","th") and self.parts is not None:
      self.row.append("".join(self.parts).strip());self.parts=None
    elif self.depth==1 and t=="tr" and self.row is not None:
      if self.row:self.rows.append(self.row)
      self.row=None
    elif t=="table" and self.depth:
      if self.depth==1 and self.rows is not None:self.tables.append(self.rows);self.rows=None
      self.depth-=1

def fetch():
  q=urllib.parse.urlencode({"action":"parse","page":"Achievement","prop":"text","format":"json","formatversion":"2"})
  req=urllib.request.Request(API+"?"+q,headers={"User-Agent":"LtDungeonTracker/1.0 (field achievement sync)","Accept":"application/json"})
  with urllib.request.urlopen(req,timeout=60) as r:data=json.loads(r.read().decode())
  html=data.get("parse",{}).get("text","")
  if not html:raise RuntimeError("No Achievement HTML returned")
  return html

def compact_notes(raw):
  lines=[clean(x) for x in re.split(r"[\r\n]+",raw or "") if clean(x)]
  lines=[x for x in lines if not x.lower().startswith("file:")]
  return " · ".join(lines)

def main():
  p=P();p.feed(fetch());rows=None
  for table in p.tables:
    if not table:continue
    headers=[clean(x).lower() for x in table[0]]
    if len(headers)>=4 and headers[:4]==["achievement","objective","notes","achievement points"]:
      # Select the Explore table by finding a known Explore achievement.
      names={clean(r[0]) for r in table[1:] if r}
      if "Zisk Plains" in names and "Courageous Training" in names:
        rows=table[1:];break
  if rows is None:raise RuntimeError("Explore Achievements table not found; existing snapshot preserved")

  fields={}
  for r in rows:
    if len(r)<4:continue
    name=clean(r[0])
    if not name or name=="Total Achievement Points" or name not in FIELD_MAP:continue
    objective=clean(r[1]);notes=compact_notes(r[2])
    try:points=int(re.sub(r"\D","",r[3]) or 0)
    except:points=0
    fields.setdefault(FIELD_MAP[name],[]).append({
      "name":name,"category":"Exploration","objective":objective,"notes":notes,"points":points
    })

  if not fields:raise RuntimeError("No Field Explore achievements parsed; existing snapshot preserved")
  payload={"source":"https://latale.wiki.gg/wiki/Achievement","updated":date.today().isoformat(),"category":"Explore","fields":dict(sorted(fields.items()))}
  OUTPUT.write_text("window.LT_FIELD_ACHIEVEMENTS = "+json.dumps(payload,ensure_ascii=False,indent=2)+";\n",encoding="utf-8")
  print(f"Synced {sum(len(v) for v in fields.values())} Explore achievements across {len(fields)} field locations")

if __name__=="__main__":main()
