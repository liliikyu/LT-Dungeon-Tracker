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
    all_names=sorted(set(main_map)|set(sub_map),key=str.lower)
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
