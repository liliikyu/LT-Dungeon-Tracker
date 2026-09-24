const $=id=>document.getElementById(id);
const state={board:0,square:0,turn:0,busy:false,finished:false};
function totalSquares(){return routes.reduce((n,r)=>n+r.length,0)}
function journeyNumber(board,slot){return routes.slice(0,board).reduce((n,r)=>n+r.length,0)+slot}
function position(){return routes.slice(0,state.board).reduce((n,r)=>n+r.length,0)+state.square}
function setPosition(value){let board=0,square=Math.max(0,Math.min(totalSquares(),value));while(board<routes.length-1&&square>routes[board].length){square-=routes[board].length;board++}Object.assign(state,{board,square,finished:value>=totalSquares()})}
function boardImage(index){return "url('boards/"+String(index+1).padStart(2,'0')+".webp')"}
function render(){
 state.square=Math.min(state.square,routes[state.board].length);state.finished=position()===totalSquares();
 const n=state.board+1,route=routes[state.board],traveled=position();
 $('board').style.backgroundImage=boardImage(state.board);
 $('boardNumber').textContent=String(n).padStart(2,'0');$('boardBadge').textContent=String(n).padStart(2,'0');
 $('squareLabel').textContent=state.square?'Slot '+state.square+' / '+route.length+' · Slot '+traveled:'At the start';
 const p=state.square?route[state.square-1]:route[0];
 $('player').style.left=p[0]/252.286*100+'%';$('player').style.top=p[1]/156.444*100+'%';
 $('player').setAttribute('aria-label','Player on board '+n+', '+(state.square?'slot '+state.square:'start'));
 $('trailLine').setAttribute('points',route.map(p=>p.join(',')).join(' '));
 $('destination').setAttribute('cx',route.at(-1)[0]);$('destination').setAttribute('cy',route.at(-1)[1]);
 $('progressFill').style.width=traveled/totalSquares()*100+'%';
 $('journeyLabel').textContent='Journey slot '+traveled+' / '+totalSquares();
 $('journeyInput').max=String(totalSquares());$('journeyInput').disabled=state.busy;$('journeyGo').disabled=state.busy;
 $('journeyHint').textContent='Unique across all boards: 1–'+totalSquares()+'. This board: '+journeyNumber(state.board,1)+'–'+journeyNumber(state.board,route.length)+'.';$('turnLabel').textContent='Moves: '+state.turn;
 document.querySelectorAll('[data-step]').forEach(button=>{button.disabled=state.busy||(Number(button.dataset.step)>0?traveled===totalSquares():traveled===0)});
 $('editPathButton').disabled=state.busy;$('restart').disabled=state.busy;$('slotInput').disabled=state.busy;$('goButton').disabled=state.busy;
 $('slotInput').max='';$('slotInput').placeholder='1–'+route.length;
 $('slotHint').textContent='Board '+n+' has '+route.length+' slots. Larger numbers continue across following boards; '+(route.length+1)+' goes to '+(n<routes.length?'board '+(n+1)+', slot 1.':'the final slot.');
 document.querySelectorAll('.mini-board').forEach((el,i)=>{el.classList.toggle('current',i===state.board);el.classList.toggle('complete',i<state.board)});
 $('atlasStatus').textContent='You are on board '+n+' of '+routes.length+'.';
}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function result(){return {board:state.board+1,slot:state.square,finished:state.finished}}
function describe(board,square){return 'Board '+(board+1)+', '+(square?'slot '+square:'start')}
async function moveBy(steps){
 if(!Number.isInteger(steps)||steps===0||Math.abs(steps)>12)throw new Error('Choose +1 to +12 or −1 to −12.');
 if(state.busy)return {error:'A move is already in progress.'};
 const from=position(),target=Math.max(0,Math.min(totalSquares(),from+steps));
 if(target===from)return result();
 const startBoard=state.board,startSquare=state.square,direction=Math.sign(steps);
 state.busy=true;$('slotError').textContent='';render();
 $('announcement').textContent='Moving '+(direction>0?'forward':'back')+' '+Math.abs(target-from)+' slots…';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 for(let next=from+direction;direction>0?next<=target:next>=target;next+=direction){setPosition(next);render();await delay(reduced?0:150)}
 state.turn++;state.busy=false;$('slotInput').value='';render();
 $('lastMove').textContent=(steps>0?'+':'')+steps+': '+describe(startBoard,startSquare)+' → '+describe(state.board,state.square)+'.';
 $('announcement').textContent=state.finished?'You reached the final slot. You can still move back or jump to another slot.':target===0?'Back at the start.':'Moved '+Math.abs(target-from)+' slots '+(direction>0?'forward':'back')+'. '+describe(state.board,state.square)+'.';
 return result();
}
function goToSlot(slot){
 if(!Number.isSafeInteger(slot)||slot<1)throw new Error('Enter a positive whole slot number.');
 if(state.busy)return {error:'A move is already in progress.'};
 const startBoard=state.board,startSquare=state.square,from=position();
 const offset=from-state.square,remaining=totalSquares()-offset;
 setPosition(offset+Math.min(slot,remaining));if(from!==position())state.turn++;
 $('slotError').textContent='';$('slotInput').value='';render();
 $('lastMove').textContent='Jumped: '+describe(startBoard,startSquare)+' → '+describe(state.board,state.square)+'.';
 $('announcement').textContent=(slot>remaining?'That number goes beyond the journey. Stopped at the final slot: ':'Character moved to ')+describe(state.board,state.square)+'.';return result();
}
function goToJourneySlot(slot){
 if(!Number.isSafeInteger(slot)||slot<1||slot>totalSquares())throw new Error('Enter a whole journey slot from 1 to '+totalSquares()+'.');
 if(state.busy)return {error:'A move is already in progress.'};
 const before=position();setPosition(slot);if(before!==slot)state.turn++;
 $('journeyInput').value='';$('journeyError').textContent='';render();
 $('lastMove').textContent='Journey slot '+before+' → '+slot+' · '+describe(state.board,state.square)+'.';
 $('announcement').textContent='Journey slot '+slot+': '+describe(state.board,state.square)+'.';return result();
}
$('journeyForm').addEventListener('submit',event=>{event.preventDefault();try{goToJourneySlot(Number($('journeyInput').value.trim()))}catch(error){$('journeyError').textContent=error.message;$('journeyInput').focus()}});
$('journeyInput').addEventListener('input',()=>{$('journeyError').textContent=''});
function reset(){if(state.busy)return;$('journeyInput').value='';$('journeyError').textContent='';Object.assign(state,{board:0,square:0,turn:0,busy:false,finished:false});$('slotInput').value='';$('slotError').textContent='';$('announcement').textContent='Choose a movement button or enter a slot on this board.';$('lastMove').textContent='No moves yet.';render()}
for(const sign of [1,-1])for(let n=1;n<=12;n++){
 const button=document.createElement('button');button.type='button';button.className='step-button';button.dataset.step=String(sign*n);
 button.textContent=(sign>0?'+':'−')+n;button.setAttribute('aria-label','Move '+(sign>0?'forward':'back')+' '+n+' '+(n===1?'slot':'slots'));
 button.addEventListener('click',()=>moveBy(sign*n));$(sign>0?'forwardButtons':'backwardButtons').append(button);
}
for(let i=0;i<routes.length;i++){const el=document.createElement('div');el.className='mini-board';el.dataset.board=String(i);el.setAttribute('aria-label','Board '+(i+1));const label=document.createElement('span');label.textContent=String(i+1).padStart(2,'0');el.append(label);$('atlasGrid').append(el)}
$('slotForm').addEventListener('submit',event=>{event.preventDefault();try{goToSlot(Number($('slotInput').value.trim()))}catch(error){$('slotError').textContent=error.message;$('slotInput').focus()}});
$('slotInput').addEventListener('input',()=>{$('slotError').textContent=''});
$('showTrail').addEventListener('change',e=>$('trail').classList.toggle('visible',e.target.checked));
$('atlasButton').addEventListener('click',()=>{document.querySelectorAll('.mini-board').forEach(el=>{el.style.backgroundImage=boardImage(Number(el.dataset.board))});$('atlas').showModal()});
$('closeAtlas').addEventListener('click',()=>$('atlas').close());$('backToGame').addEventListener('click',()=>$('atlas').close());
$('restart').addEventListener('click',()=>$('resetDialog').showModal());$('cancelReset').addEventListener('click',()=>$('resetDialog').close());
$('confirmReset').addEventListener('click',()=>{reset();$('resetDialog').close()});
if(document.modelContext?.registerTool){
 for(const tool of [
  {name:'move_adventure_character',title:'Move adventure character',description:'Move forward or backward by 1–12 slots, crossing board boundaries as needed.',key:'steps',minimum:-12,maximum:12,action:moveBy},
  {name:'go_to_adventure_slot',title:'Go to adventure slot',description:'Jump to a slot counted from the start of the current board, continuing across following boards when needed and stopping at the journey end.',key:'slot',minimum:1,action:goToSlot}
 ])try{Promise.resolve(document.modelContext.registerTool({name:tool.name,title:tool.title,description:tool.description,inputSchema:{type:'object',properties:{[tool.key]:{type:'integer',minimum:tool.minimum,...(tool.maximum?{maximum:tool.maximum}:{})}},required:[tool.key],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async input=>{if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length!==1||!Object.hasOwn(input,tool.key))throw new Error('Expected '+tool.key+'.');return tool.action(input[tool.key])}})).catch(()=>{})}catch{}
}
reset();
