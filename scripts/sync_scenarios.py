#!/usr/bin/env python3
"""Sync Main/Sub Scenario dungeon references from the Official La Tale Wiki."""
from __future__ import annotations
import json, re, urllib.parse, urllib.request
from html.parser import HTMLParser
from pathlib import Path

API = "https://latale.wiki.gg/api.php"
ROOT = Path(__file__).resolve().parents[1]
DATA_JS = ROOT / "assets" / "data.js"
OUTPUT = ROOT / "assets" / "scenario-data.js"

VERIFIED_SCENARIO_REFS = {
  "Dragon Lair": {
    "main": [
      "Ch.1-1"
    ],
    "sub": []
  },
  "Shangri-la": {
    "main": [
      "Ch.1-2"
    ],
    "sub": []
  },
  "Dark Moon of the 16th": {
    "main": [
      "Ch.1-2"
    ],
    "sub": [
      "Ch.3-12"
    ]
  },
  "Treasure Vault": {
    "main": [
      "Ch.1-2"
    ],
    "sub": []
  },
  "Gothic Room": {
    "main": [
      "Ch.1-2"
    ],
    "sub": []
  },
  "Heart of Ktuka": {
    "main": [
      "Ch.1-2"
    ],
    "sub": []
  },
  "Cold Heart": {
    "main": [
      "Ch.1-2"
    ],
    "sub": []
  },
  "Chimera Laboratory": {
    "main": [
      "Ch.1-3"
    ],
    "sub": []
  },
  "Valhalla": {
    "main": [
      "Ch.1-3"
    ],
    "sub": []
  },
  "Hell's Door": {
    "main": [
      "Ch.1-4"
    ],
    "sub": []
  },
  "Outer Realm": {
    "main": [
      "Ch.1-5",
      "Ch.1-6"
    ],
    "sub": [
      "Ch.3-36"
    ]
  },
  "Constellation Cliff": {
    "main": [],
    "sub": [
      "Ch.1-2"
    ]
  },
  "Collapsed Tower Underground": {
    "main": [
      "Ch.1-5"
    ],
    "sub": []
  },
  "Star's Cradle": {
    "main": [],
    "sub": [
      "Ch.1-2"
    ]
  },
  "Road of Flower": {
    "main": [
      "Ch.1-6"
    ],
    "sub": []
  },
  "Road of Moon": {
    "main": [
      "Ch.1-6"
    ],
    "sub": []
  },
  "Road of Dream": {
    "main": [
      "Ch.1-6"
    ],
    "sub": []
  },
  "Crash Zone": {
    "main": [],
    "sub": [
      "Ch.1-3"
    ]
  },
  "Sky Coliseum": {
    "main": [],
    "sub": [
      "Ch.2-1",
      "Ch.3-8"
    ]
  },
  "Mysterious Hall": {
    "main": [],
    "sub": [
      "Ch.2-3"
    ]
  },
  "Aurora Garden": {
    "main": [],
    "sub": [
      "Ch.2-2",
      "Ch.3-1",
      "Ch.3-27"
    ]
  },
  "TAID Dragon Garden": {
    "main": [
      "Ch.2-2"
    ],
    "sub": []
  },
  "Rising Dragon Temple": {
    "main": [
      "Ch.2-2"
    ],
    "sub": [
      "Ch.3-10"
    ]
  },
  "Hidden Cave": {
    "main": [
      "Ch.2-3"
    ],
    "sub": []
  },
  "Ruined Palace": {
    "main": [
      "Ch.2-3"
    ],
    "sub": []
  },
  "Manastone Laboratory": {
    "main": [],
    "sub": [
      "Ch.3-5",
      "Ch.3-10"
    ]
  },
  "Devil's Canyon": {
    "main": [],
    "sub": [
      "Ch.2-3"
    ]
  },
  "Sacred Hall": {
    "main": [
      "Ch.2-5"
    ],
    "sub": []
  },
  "Twisted Genesis": {
    "main": [],
    "sub": [
      "Ch.2-4"
    ]
  },
  "Dwarf Aircraft": {
    "main": [],
    "sub": [
      "Ch.2-5",
      "Ch.3-1",
      "Ch.3-10"
    ]
  },
  "Sunset Forest": {
    "main": [],
    "sub": [
      "Ch.2-7"
    ]
  },
  "Solar Temple": {
    "main": [
      "Ch.2-6"
    ],
    "sub": [
      "Ch.3-5"
    ]
  },
  "Agni's Altar": {
    "main": [
      "Ch.2-6"
    ],
    "sub": []
  },
  "Treasure Cave": {
    "main": [],
    "sub": [
      "Ch.2-6",
      "Ch.3-1"
    ]
  },
  "Book of Shadows": {
    "main": [],
    "sub": [
      "Ch.2-8"
    ]
  },
  "Euphony of Corals": {
    "main": [],
    "sub": [
      "Ch.2-9",
      "Ch.3-17"
    ]
  },
  "Waterfall Forest": {
    "main": [
      "Ch.2-7"
    ],
    "sub": []
  },
  "Jewell Forest": {
    "main": [
      "Ch.2-7"
    ],
    "sub": [
      "Ch.3-6",
      "Ch.3-25"
    ]
  },
  "Ra's Palace": {
    "main": [
      "Ch.3-1"
    ],
    "sub": [
      "Ch.3-5"
    ]
  },
  "Warrior's Graveyard": {
    "main": [
      "Ch.3-6"
    ],
    "sub": [
      "Ch.3-16",
      "Ch.3-17",
      "Ch.3-55"
    ]
  },
  "Zerenis Training Center": {
    "main": [],
    "sub": [
      "Ch.4-1"
    ]
  },
  "Floating Island": {
    "main": [
      "Ch.2-8"
    ],
    "sub": [
      "Ch.3-2"
    ]
  },
  "Illusion Mist Swamp": {
    "main": [
      "Ch.2-8"
    ],
    "sub": []
  },
  "Twin Caves": {
    "main": [],
    "sub": [
      "Ch.2-9",
      "Ch.3-2",
      "Ch.3-4",
      "Ch.3-13"
    ]
  },
  "Canyon of Chaos": {
    "main": [],
    "sub": [
      "Ch.3-7",
      "Ch.3-29"
    ]
  },
  "Frozen World": {
    "main": [
      "Ch.2-9"
    ],
    "sub": [
      "Ch.3-2",
      "Ch.3-5",
      "Ch.3-7",
      "Ch.3-11",
      "Ch.3-12",
      "Ch.3-18",
      "Ch.3-27",
      "Ch.3-37",
      "Ch.3-55"
    ]
  },
  "Hall of Rest": {
    "main": [
      "Ch.3-1"
    ],
    "sub": [
      "Ch.3-4",
      "Ch.3-5",
      "Ch.3-15",
      "Ch.3-18"
    ]
  },
  "Champion's Memorial": {
    "main": [
      "Ch.3-2"
    ],
    "sub": [
      "Ch.3-10",
      "Ch.3-22"
    ]
  },
  "Chamber of Hell": {
    "main": [
      "Ch.3-2"
    ],
    "sub": [
      "Ch.3-6",
      "Ch.3-8",
      "Ch.3-13",
      "Ch.3-15",
      "Ch.4-6"
    ]
  },
  "Monster Tree Valley": {
    "main": [
      "Ch.3-3"
    ],
    "sub": [
      "Ch.3-11",
      "Ch.3-17",
      "Ch.3-18"
    ]
  },
  "Dragon Valley": {
    "main": [
      "Ch.3-4",
      "Ch.3-8"
    ],
    "sub": [
      "Ch.3-9",
      "Ch.3-12",
      "Ch.3-13"
    ]
  },
  "Divine Tree Rapier": {
    "main": [
      "Ch.3-4"
    ],
    "sub": [
      "Ch.3-20",
      "Ch.3-22",
      "Ch.3-25",
      "Ch.3-50",
      "Ch.3-55"
    ]
  },
  "Zerenis Headquarters": {
    "main": [
      "Ch.3-5"
    ],
    "sub": [
      "Ch.3-18",
      "Ch.3-21",
      "Ch.3-40",
      "Ch.3-46"
    ]
  },
  "Fallout Shelter": {
    "main": [
      "Ch.3-6"
    ],
    "sub": []
  },
  "Dream Oneiro": {
    "main": [
      "Ch.3-6"
    ],
    "sub": [
      "Ch.3-20",
      "Ch.3-21",
      "Ch.3-23",
      "Ch.3-51"
    ]
  },
  "Void Star": {
    "main": [],
    "sub": [
      "Ch.3-26"
    ]
  },
  "Oblivon Lake": {
    "main": [],
    "sub": [
      "Ch.3-27",
      "Ch.3-32",
      "Ch.3-34",
      "Ch.3-49"
    ]
  },
  "Flame's Cradle": {
    "main": [
      "Ch.3-8"
    ],
    "sub": [
      "Ch.3-30",
      "Ch.3-53"
    ]
  },
  "Rosengarten": {
    "main": [
      "Ch.3-8"
    ],
    "sub": [
      "Ch.3-29",
      "Ch.3-31",
      "Ch.3-53",
      "Ch.4-6"
    ]
  },
  "Hyle": {
    "main": [
      "Ch.3-9",
      "Ch.4-1"
    ],
    "sub": [
      "Ch.3-35"
    ]
  },
  "Promised Sancutary": {
    "main": [
      "Ch.3-9"
    ],
    "sub": [
      "Ch.3-36"
    ]
  },
  "Icicle Prison": {
    "main": [
      "Ch.3-10"
    ],
    "sub": [
      "Ch.3-41",
      "Ch.3-50",
      "Ch.3-52"
    ]
  },
  "Spring of the Echo": {
    "main": [
      "Ch.3-10"
    ],
    "sub": [
      "Ch.3-38",
      "Ch.3-39",
      "Ch.3-41",
      "Ch.3-45",
      "Ch.3-52",
      "Ch.3-55"
    ]
  },
  "Heart of Reminiscience": {
    "main": [
      "Ch.3-11"
    ],
    "sub": [
      "Ch.3-43"
    ]
  },
  "Acro Coffin": {
    "main": [
      "Ch.3-11"
    ],
    "sub": [
      "Ch.3-44"
    ]
  },
  "Vanitas": {
    "main": [
      "Ch.3-12"
    ],
    "sub": [
      "Ch.3-51"
    ]
  },
  "Purgatory Azreal": {
    "main": [
      "Ch.3-12"
    ],
    "sub": [
      "Ch.3-51"
    ]
  },
  "Chronos' Time": {
    "main": [
      "Ch.3-13"
    ],
    "sub": [
      "Ch.3-56"
    ]
  },
  "Kairos' Time": {
    "main": [
      "Ch.3-13"
    ],
    "sub": [
      "Ch.3-57",
      "Ch.4-6"
    ]
  },
  "Chaotic Mirror": {
    "main": [
      "Ch.4-1"
    ],
    "sub": [
      "Ch.4-2",
      "Ch.4-3"
    ]
  },
  "Theater Eugamon": {
    "main": [
      "Ch.4-1"
    ],
    "sub": [
      "Ch.4-3"
    ]
  },
  "Entelechy of Life": {
    "main": [],
    "sub": [
      "Ch.4-6"
    ]
  },
  "Stump of Spirits": {
    "main": [],
    "sub": [
      "Ch.4-6",
      "Ch.4-8"
    ]
  },
  "Euphony of the Vanished Star": {
    "main": [
      "Ch.4-3"
    ],
    "sub": [
      "Ch.4-8"
    ]
  },
  "Twilight Cathedral": {
    "main": [
      "Ch.4-3"
    ],
    "sub": [
      "Ch.4-8"
    ]
  },
  "Atlas Garden": {
    "main": [
      "Ch.4-5",
      "Ch.4-7"
    ],
    "sub": []
  }
}

ALIASES = {
    "heart of reminiscience": "Heart of Reminiscence",
    "promised sancutary": "Promised Sanctuary",
    "muchkin storage": "Munchkin Storage",
    "purgatory azrael": "Purgatory Azreal",
    "chronos time": "Chronos' Time",
    "kairos time": "Kairos' Time",
}

def norm(v):
    return re.sub(r"[^a-z0-9]+", " ", str(v or "").lower()).strip()

def fetch_page_html(page):
    query = urllib.parse.urlencode({
        "action":"parse","page":page,"prop":"text","format":"json","formatversion":"2"
    })
    req = urllib.request.Request(
        f"{API}?{query}",
        headers={"User-Agent":"LtDungeonTracker/1.0 (scenario sync)","Accept":"application/json"}
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        payload = json.loads(r.read().decode("utf-8"))
    html = payload.get("parse",{}).get("text","")
    if not html:
        raise RuntimeError(f"No parsed HTML for {page}")
    return html

class ScenarioParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.chapter=None; self.episode=None
        self.heading_tag=None; self.heading_parts=[]
        self.row_depth=0; self.row_parts=[]; self.rows=[]
    def handle_starttag(self, tag, attrs):
        tag=tag.lower()
        if tag in {"h2","h3","h4"}:
            self.heading_tag=tag; self.heading_parts=[]
        elif tag=="tr":
            self.row_depth+=1
            if self.row_depth==1: self.row_parts=[]
        elif self.row_depth and tag in {"br","p","div","td","th"}:
            self.row_parts.append(" ")
    def handle_data(self, data):
        if self.heading_tag: self.heading_parts.append(data)
        if self.row_depth: self.row_parts.append(data)
    def handle_endtag(self, tag):
        tag=tag.lower()
        if self.heading_tag==tag:
            text=re.sub(r"\s+"," ","".join(self.heading_parts)).strip()
            ch=re.search(r"\bChapter\s+(\d+)\b",text,re.I)
            ep=re.search(r"\bEpisode\s+(\d+)\b",text,re.I)
            if ch:
                self.chapter=int(ch.group(1)); self.episode=None
            elif ep and self.chapter is not None:
                self.episode=int(ep.group(1))
            elif tag in {"h3","h4"}:
                self.episode=None
            self.heading_tag=None; self.heading_parts=[]
        elif tag=="tr" and self.row_depth:
            self.row_depth-=1
            if self.row_depth==0:
                text=re.sub(r"\s+"," ","".join(self.row_parts)).strip()
                if text and self.chapter is not None and self.episode is not None:
                    self.rows.append((self.chapter,self.episode,text))
                self.row_parts=[]

def load_names():
    text=DATA_JS.read_text(encoding="utf-8")
    m=re.search(r"window\.LT_DATA\s*=\s*(\{.*\})\s*;?\s*$",text,re.S)
    data=json.loads(m.group(1))
    return [d["name"] for d in data.get("dungeons",[]) if d.get("name")]

def build(page, names):
    p=ScenarioParser(); p.feed(fetch_page_html(page))
    result={n:[] for n in names}
    aliases={n:[n] for n in names}
    for alias,target in ALIASES.items():
        tracker=next((n for n in names if norm(n)==norm(target)),None)
        if tracker: aliases[tracker].append(alias)
    for ch,ep,text in p.rows:
        hay=norm(text); ref=f"Ch.{ch}-{ep}"
        for name in names:
            if any(norm(a) and norm(a) in hay for a in aliases[name]):
                if ref not in result[name]: result[name].append(ref)
    return {k:v for k,v in result.items() if v}

def main():
    names=load_names()
    main_map=build("Main Scenario",names)
    sub_map=build("Sub Scenario",names)
    # Merge verified references so repeated dungeon appearances are not lost.
    for name, refs in VERIFIED_SCENARIO_REFS.items():
        if name not in names:
            continue
        for ref in refs.get("main", []):
            main_map.setdefault(name, [])
            if ref not in main_map[name]:
                main_map[name].append(ref)
        for ref in refs.get("sub", []):
            sub_map.setdefault(name, [])
            if ref not in sub_map[name]:
                sub_map[name].append(ref)

    # Keep every tracker dungeon in the snapshot, even if no verified story use exists.
    all_names=sorted(names,key=str.lower)
    payload={
        "updated":__import__("datetime").date.today().isoformat(),
        "source":{
            "main":"https://latale.wiki.gg/wiki/Main_Scenario",
            "sub":"https://latale.wiki.gg/wiki/Sub_Scenario",
        },
        "dungeons":{
            name:{"main":main_map.get(name,[]),"sub":sub_map.get(name,[])}
            for name in all_names
        }
    }
    OUTPUT.write_text(
        "window.LT_SCENARIO_DATA = "+json.dumps(payload,ensure_ascii=False,indent=2)+";\n",
        encoding="utf-8"
    )
    print(f"Wrote {OUTPUT} with {len(all_names)} dungeon mappings")

if __name__=="__main__":
    main()
