#!/usr/bin/env python3
"""Sync achievements that can be mapped to tracked dungeons from Official La Tale Wiki."""
from __future__ import annotations
from html.parser import HTMLParser
from pathlib import Path
import json,re,urllib.parse,urllib.request

PAGE='Achievement'
API='https://latale.wiki.gg/api.php'
SOURCE='https://latale.wiki.gg/wiki/Achievement'
ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'assets'/'dungeon-achievements.js'
DATA=ROOT/'assets'/'data.js'
ALIASES={
    "Star Cradle":"Star's Cradle",
    "Champion Memorial":"Champions' Memorial",
    "Champion's Memorial":"Champions' Memorial",
    "Warriors Graveyard":"Warrior's Graveyard",
    "Flame Cradle":"Flame's Cradle",
    "Heart of Reminiscence":"Heart of Reminiscience",
    "Chronos Time":"Chronos' Time",
    "Euphony of Vanishing Star":"Euphony of the Vanished Star",
    "Munchkin Storage":"Muchkin Storage",
}

def clean(v):
    v=re.sub(r'\[[^\]]+\]','',v or '')
    return re.sub(r'\s+',' ',v).strip()

def norm(v): return re.sub(r'[^a-z0-9]+',' ',str(v).lower()).strip()

def category_name(heading):
    h=clean(heading)
    h=re.sub(r'\bAchievements?\b','',h,flags=re.I).strip(' -–—:')
    return h or 'Achievement'

class P(HTMLParser):
    def __init__(self):
        super().__init__(); self.tables=[]; self.depth=0; self.rows=None; self.row=None; self.parts=None
        self.heading_parts=None; self.heading_tag=None; self.current_heading=''; self.table_heading=''
    def handle_starttag(self,t,a):
        t=t.lower()
        if self.depth==0 and t in ('h2','h3','h4'):
            self.heading_parts=[]; self.heading_tag=t
        if t=='table':
            self.depth+=1
            if self.depth==1:
                self.rows=[]; self.table_heading=self.current_heading
        elif self.depth==1 and t=='tr': self.row=[]
        elif self.depth==1 and t in ('td','th') and self.row is not None:self.parts=[]
        elif self.parts is not None and t in ('br','p','div','li'):self.parts.append(' | ')
    def handle_data(self,d):
        if self.heading_parts is not None:self.heading_parts.append(d)
        if self.parts is not None:self.parts.append(d)
    def handle_endtag(self,t):
        t=t.lower()
        if self.heading_parts is not None and t==self.heading_tag:
            self.current_heading=clean(''.join(self.heading_parts))
            self.heading_parts=None; self.heading_tag=None
        if self.depth==1 and t in ('td','th') and self.parts is not None:
            self.row.append(clean(''.join(self.parts)));self.parts=None
        elif self.depth==1 and t=='tr' and self.row is not None:
            if self.row:self.rows.append(self.row)
            self.row=None
        elif t=='table' and self.depth:
            if self.depth==1 and self.rows is not None:
                self.tables.append((self.table_heading,self.rows));self.rows=None
            self.depth-=1

def fetch():
    q=urllib.parse.urlencode({'action':'parse','page':PAGE,'prop':'text','format':'json','formatversion':'2'})
    req=urllib.request.Request(f'{API}?{q}',headers={'User-Agent':'LtDungeonTracker/1.0','Accept':'application/json'})
    with urllib.request.urlopen(req,timeout=60) as r: data=json.loads(r.read().decode())
    html=data.get('parse',{}).get('text','')
    if not html: raise RuntimeError('Achievement wiki returned no HTML')
    return html

def tracker_names():
    txt=DATA.read_text(encoding='utf-8')
    m=re.search(r'window\.LT_DATA\s*=\s*(\{.*\})\s*;?\s*$',txt,re.S)
    if not m:return []
    return [d.get('name','') for d in json.loads(m.group(1)).get('dungeons',[]) if d.get('name')]

def match_in(text,names):
    ntext=norm(text); out=[]
    for name in names:
        if norm(name) and norm(name) in ntext: out.append(name)
    for wiki,tracker in ALIASES.items():
        if norm(wiki) in ntext and tracker in names and tracker not in out: out.append(tracker)
    return out

def match_dungeons(name,objective,notes,category,names):
    # Direct references in the achievement title/objective are strongest and avoid
    # false matches from "Dungeon List - ..." navigation hints in Explore notes.
    out=match_in(f'{name} {objective}',names)
    if out:return out
    if category.lower()!='explore':
        return match_in(notes,names)
    return []

def parse(html):
    p=P();p.feed(html);names=tracker_names();result={}
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
        for row in table[hi+1:]:
            if max(ai,oi,ni)>=len(row):continue
            name,objective,notes=clean(row[ai]),clean(row[oi]),clean(row[ni])
            if not name or name.lower()=='total achievement points':continue
            dungeons=match_dungeons(name,objective,notes,category,names)
            if not dungeons:continue
            points=None
            if pi is not None and pi<len(row):
                m=re.search(r'\d+',row[pi]); points=int(m.group()) if m else None
            rec={'name':name,'objective':objective,'points':points,'category':category}
            if notes:rec['notes']=notes
            for dungeon in dungeons:
                bucket=result.setdefault(dungeon,[])
                if not any(norm(x.get('name'))==norm(name) and norm(x.get('objective'))==norm(objective) for x in bucket):
                    bucket.append(rec)
    if not result:raise RuntimeError('No dungeon achievements parsed; keeping existing snapshot')
    return result

def main():
    data={'source':'Official La Tale Wiki — Achievement','sourceUrl':SOURCE,'dungeons':parse(fetch())}
    text='window.LT_DUNGEON_ACHIEVEMENTS='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n'
    if OUTPUT.exists() and OUTPUT.read_text(encoding='utf-8')==text:
        print('Dungeon achievements unchanged.');return
    OUTPUT.write_text(text,encoding='utf-8')
    print(f"Wrote {sum(map(len,data['dungeons'].values()))} achievement links for {len(data['dungeons'])} dungeons.")
if __name__=='__main__':main()
