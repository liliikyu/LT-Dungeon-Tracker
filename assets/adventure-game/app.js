const $=id=>document.getElementById(id);
const state={board:0,square:0,turn:0,busy:false,finished:false};
const pipPositions={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
const totalSquares=routes.reduce((n,r)=>n+r.length,0);
function drawDie(id,value){const el=$(id);el.replaceChildren();el.setAttribute('aria-label',`Die ${id==='die1'?'one':'two'}: ${value}`);for(let i=0;i<9;i++){const dot=document.createElement('span');if(pipPositions[value].includes(i))dot.className='pip';el.append(dot)}}
function die(){const buffer=new Uint32Array(1);do{crypto.getRandomValues(buffer)}while(buffer[0]>=4294967292);return buffer[0]%6+1}
function boardImage(index){return `url('boards/${String(index+1).padStart(2,'0')}.webp')`}
function render(){
 const n=state.board+1, route=routes[state.board];
 $('board').style.backgroundImage=boardImage(state.board);
 $('boardNumber').textContent=String(n).padStart(2,'0');$('boardBadge').textContent=String(n).padStart(2,'0');
 $('squareLabel').textContent=state.square?`Square ${state.square} / ${route.length}`:'At the start';
 const p=state.square?route[state.square-1]:[4,140];
 $('player').style.left=`${p[0]/252.286*100}%`;$('player').style.top=`${p[1]/156.444*100}%`;
 $('player').setAttribute('aria-label',`Player on board ${n}, ${state.square?'square '+state.square:'start'}`);
 $('trailLine').setAttribute('points',route.map(p=>p.join(',')).join(' '));
 $('destination').setAttribute('cx',route.at(-1)[0]);$('destination').setAttribute('cy',route.at(-1)[1]);
 const traveled=routes.slice(0,state.board).reduce((s,r)=>s+r.length,0)+state.square;
 $('progressFill').style.width=`${traveled/totalSquares*100}%`;
 $('journeyLabel').textContent=`Board ${n} of ${routes.length}`;$('turnLabel').textContent=`Turn ${state.turn+1}`;
 $('rollButton').disabled=state.busy||state.finished;$('restart').disabled=state.busy;
 $('rollButton').innerHTML=state.finished?'Journey complete ✓':state.busy?'Moving…':'Roll the dice <span>↗</span>';
 document.querySelectorAll('.mini-board').forEach((el,i)=>{el.classList.toggle('current',i===state.board);el.classList.toggle('complete',i<state.board)});
 $('atlasStatus').textContent=`You are on board ${n} of ${routes.length}.`;
}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function roll(){
 if(state.busy||state.finished)return {error:'A move is in progress or the journey is complete.'};
 state.busy=true;render();
 const a=die(),b=die(),sum=a+b,startBoard=state.board,startSquare=state.square;
 $('die1').classList.add('rolling');$('die2').classList.add('rolling');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 for(let i=0;i<(reduced?1:7);i++){drawDie('die1',die());drawDie('die2',die());await delay(reduced?0:70)}
 $('die1').classList.remove('rolling');$('die2').classList.remove('rolling');drawDie('die1',a);drawDie('die2',b);
 $('rollTotal').textContent=`${a} + ${b} = ${sum} steps`;
 $('announcement').textContent=`You rolled ${sum}. Moving forward…`;
 let moved=0;
 for(let i=0;i<sum;i++){
  if(state.square>=routes[state.board].length){
   if(state.board===routes.length-1){state.finished=true;break}
   state.board++;state.square=0;
  }
  state.square++;moved++;render();await delay(reduced?0:210);
  if(state.board===routes.length-1&&state.square===routes[state.board].length){state.finished=true;break}
 }
 state.turn++;state.busy=false;render();
 $('lastMove').textContent=`Rolled ${a} + ${b}. Board ${startBoard+1}, ${startSquare?'square '+startSquare:'start'} → board ${state.board+1}, square ${state.square}.`;
 $('announcement').textContent=state.finished?`Adventure complete! You reached the end of all ${routes.length} boards in ${state.turn} rolls.`:state.board!==startBoard?`Welcome to board ${state.board+1}! Your remaining steps carried you to square ${state.square}.`:`You moved ${moved} squares. Ready for your next roll.`;
 return {dice:[a,b],board:state.board+1,square:state.square,finished:state.finished};
}
function reset(){if(state.busy)return;Object.assign(state,{board:0,square:0,turn:0,busy:false,finished:false});drawDie('die1',3);drawDie('die2',5);$('rollTotal').textContent='Two dice. One journey.';$('announcement').textContent='Your adventure starts here. Roll both dice to move forward.';$('lastMove').textContent='The first roll is yours.';render()}
for(let i=0;i<routes.length;i++){const el=document.createElement('div');el.className='mini-board';el.dataset.board=String(i);el.setAttribute('aria-label',`Board ${i+1}`);const label=document.createElement('span');label.textContent=String(i+1).padStart(2,'0');el.append(label);$('atlasGrid').append(el)}
$('rollButton').addEventListener('click',roll);
$('showTrail').addEventListener('change',e=>$('trail').classList.toggle('visible',e.target.checked));
$('atlasButton').addEventListener('click',()=>{document.querySelectorAll('.mini-board').forEach(el=>{el.style.backgroundImage=boardImage(Number(el.dataset.board))});$('atlas').showModal()});
$('closeAtlas').addEventListener('click',()=>$('atlas').close());$('backToGame').addEventListener('click',()=>$('atlas').close());
$('restart').addEventListener('click',()=>$('resetDialog').showModal());$('cancelReset').addEventListener('click',()=>$('resetDialog').close());
$('confirmReset').addEventListener('click',()=>{reset();$('resetDialog').close()});
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!document.querySelector('dialog[open]')&&!['INPUT','BUTTON','SUMMARY','A'].includes(e.target.tagName)){e.preventDefault();roll()}});
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'roll_adventure_dice',title:'Roll adventure dice',description:'Roll two dice and move the player forward by their sum in the current adventure.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async input=>{if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new Error('Expected an empty object.');return roll()}})).catch(()=>{})}catch{}}
reset();
