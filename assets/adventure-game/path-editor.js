(() => {
 const KEY='latale-adventure-paths-v1',W=252.286,H=156.444;
 const original=routes.map(board=>board.map(point=>point.slice()));
 const clone=boards=>boards.map(board=>board.map(point=>point.slice()));
 const history=[];
 let board=0,slot=0,storageWarning='';
 const dialog=$('pathEditor');
 function validate(data){
  if(!data||data.version!==1||!Array.isArray(data.boards)||data.boards.length!==original.length)throw Error('This is not a compatible adventure path backup.');
  data.boards.forEach((points,b)=>{
   if(!Array.isArray(points)||points.length<1||points.length>200)throw Error('Choose between 1 and 200 slots for board '+(b+1)+'.');
   points.forEach(point=>{if(!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite)||point[0]<0||point[0]>W||point[1]<0||point[1]>H)throw Error('A tile position is outside its board.');});
  });
  return clone(data.boards);
 }
 function apply(boards){boards.forEach((points,b)=>{routes[b]=points.map(p=>p.slice())});render()}
 try{const saved=localStorage.getItem(KEY);if(saved)apply(validate(JSON.parse(saved)))}catch(error){storageWarning='Saved paths could not be loaded. Original paths are in use.';}
 function status(message){$('editorStatus').textContent=message}
 function save(message){
  render();
  try{localStorage.setItem(KEY,JSON.stringify({version:1,boards:routes}));storageWarning='';status(message+' Saved in this browser.');}
  catch(error){storageWarning='Browser storage is unavailable. Export a backup to keep your changes.';status(message+' '+storageWarning);}
 }
 function remember(){history.push({boards:clone(routes),board,slot});if(history.length>50)history.shift()}
 function draw(){
  const offset=routes.slice(0,board).reduce((n,r)=>n+r.length,0);
  const points=routes[board];slot=Math.min(slot,points.length-1);
  $('editAddSlot').disabled=points.length>=200;$('editRemoveSlot').disabled=points.length<=1;
  $('editBoard').value=String(board);$('editSlot').replaceChildren();
  points.forEach((p,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent='Slot '+(i+1)+' · Journey '+(offset+i+1);$('editSlot').append(o)});
  $('editSlot').value=String(slot);$('editorCanvas').style.backgroundImage=boardImage(board);
  $('editorLine').setAttribute('points',points.map(p=>p.join(',')).join(' '));
  $('editorPoints').replaceChildren();
  points.forEach((p,i)=>{
   const g=document.createElementNS('http://www.w3.org/2000/svg','g');
   const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');
   circle.setAttribute('cx',p[0]);circle.setAttribute('cy',p[1]);circle.setAttribute('r',i===slot?'4':'2.6');circle.setAttribute('class',i===slot?'selected-point':'route-point');g.append(circle);
   if($('editorLabels').checked){const text=document.createElementNS('http://www.w3.org/2000/svg','text');text.setAttribute('x',p[0]);text.setAttribute('y',p[1]);text.textContent=String(i+1);g.append(text)}
   $('editorPoints').append(g);
  });
  $('editPrevious').disabled=slot===0;$('editNext').disabled=slot===points.length-1;$('editUndo').disabled=history.length===0;
  $('editorInstruction').textContent='Board '+(board+1)+' · tile '+(slot+1)+' · Journey slot '+(offset+slot+1)+'. Click its center.';
  $('editorCanvas').setAttribute('aria-label','Board '+(board+1)+', editing slot '+(slot+1)+'. Click to place its center, or use arrow keys to adjust it.');
 }
 function place(x,y,advance=false){
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>W||y<0||y>H)return;
  remember();const edited=slot;routes[board][slot]=[Math.round(x*1000)/1000,Math.round(y*1000)/1000];
  if(advance&&$('editorAdvance').checked&&slot<routes[board].length-1)slot++;
  draw();save('Board '+(board+1)+', slot '+(edited+1)+' updated.');
 }
 for(let b=0;b<routes.length;b++){const o=document.createElement('option');o.value=String(b);o.textContent='Board '+(b+1);$('editBoard').append(o)}
 let mapHeight=300;
 function fitCanvas(){
  const viewport=$('editorCanvas').parentElement;
  const width=Math.min(viewport.clientWidth-2,(mapHeight-2)*W/H);
  if(width<=0)return;
  $('editorCanvas').style.width=(width*Number($('editorZoom').value)/100)+'px';
  $('editorZoomValue').textContent=$('editorZoom').value+'%';
 }
 function resetZoom(){
  $('editorZoom').value='100';fitCanvas();
  const viewport=$('editorCanvas').parentElement;viewport.scrollTop=0;viewport.scrollLeft=0;
 }
 function sizeEditor(){let height=window.innerHeight;try{height=Math.min(height,window.parent.innerHeight)}catch{}dialog.style.maxHeight=Math.max(280,height-24)+'px';mapHeight=Math.max(240,height*.72);dialog.style.setProperty('--editor-map-height',mapHeight+'px');fitCanvas()}
 window.addEventListener('resize',()=>{if(dialog.open)sizeEditor()});
 $('editPathButton').addEventListener('click',()=>{
  if(state.busy)return;board=state.board;slot=Math.max(0,state.square-1);draw();
  status(storageWarning||'Choose a slot, then click its tile center. Changes save automatically in this browser.');dialog.showModal();sizeEditor();resetZoom();
 });
 $('editorClose').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{render();$('editPathButton').focus()});
 $('editBoard').addEventListener('change',()=>{board=Number($('editBoard').value);slot=0;draw();resetZoom()});
 $('editSlot').addEventListener('change',()=>{slot=Number($('editSlot').value);draw()});
 $('editPrevious').addEventListener('click',()=>{if(slot>0){slot--;draw()}});
 $('editNext').addEventListener('click',()=>{if(slot<routes[board].length-1){slot++;draw()}});
 $('editAddSlot').addEventListener('click',()=>{
  if(routes[board].length>=200)return;
  remember();routes[board].push(routes[board].at(-1).slice());slot=routes[board].length-1;
  draw();save('Slot '+(slot+1)+' added. Click the center of its tile to place it.');
 });
 $('editRemoveSlot').addEventListener('click',()=>{
  const count=routes[board].length;if(count<=1)return;
  remember();routes[board].pop();draw();
  save('Slot '+count+' removed from board '+(board+1)+'. You can undo this.');
 });
 $('editorLabels').addEventListener('change',draw);
 $('editorZoom').addEventListener('input',fitCanvas);
 $('editorFit').addEventListener('click',resetZoom);
 $('editorCanvas').addEventListener('click',event=>{
  const rect=$('editorCanvas').getBoundingClientRect();if(!rect.width||!rect.height)return;
  place((event.clientX-rect.left)/rect.width*W,(event.clientY-rect.top)/rect.height*H,true);
 });
 $('editorCanvas').addEventListener('keydown',event=>{
  const direction={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];if(!direction)return;
  event.preventDefault();const p=routes[board][slot],amount=event.shiftKey?1:0.25;
  place(Math.max(0,Math.min(W,p[0]+direction[0]*amount)),Math.max(0,Math.min(H,p[1]+direction[1]*amount)));
 });
 $('editUndo').addEventListener('click',()=>{const previous=history.pop();if(!previous)return;board=previous.board;slot=previous.slot;apply(previous.boards);draw();save('Last path change undone.')});
 $('editResetBoard').addEventListener('click',()=>{remember();routes[board]=clone([original[board]])[0];draw();save('Original path restored for board '+(board+1)+'. You can undo this.')});
 $('editUsePublished').addEventListener('click',()=>{remember();apply(original);draw();save('Published paths loaded for all 62 boards. You can undo this.')});
 function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 $('editExport').addEventListener('click',()=>{download('adventure-paths.json',JSON.stringify({version:1,boards:routes},null,2),'application/json');status('Backup exported. Keep it to restore your paths in another browser.')});
 $('editPublishExport').addEventListener('click',()=>{download('routes.js','// Tile centers exported from the visual path editor.\nconst routes = '+JSON.stringify(routes)+';\n','text/javascript');status('Website paths exported. Replace assets/adventure-game/routes.js in your GitHub repository to publish these corrections for everyone.')});
 $('editImport').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  try{
   if(file.size>2000000)throw Error('This file is too large. Choose an adventure-paths.json backup.');
   const imported=validate(JSON.parse(await file.text()));remember();apply(imported);draw();save('Path backup imported. You can undo this.');
  }catch(error){status('Import failed: '+error.message)}finally{event.target.value=''}
 });
})();
