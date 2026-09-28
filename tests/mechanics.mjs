import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
const elements=new Map();
const element=id=>{if(!elements.has(id))elements.set(id,{hidden:false,value:1,style:{},classList:{toggle(){}},addEventListener(){},requestPointerLock(){return Promise.resolve()},showModal(){},close(){},textContent:'',innerHTML:''});return elements.get(id)};
const document={getElementById:element,body:element('body'),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},exitPointerLock(){},pointerLockElement:null};
const storage=new Map();
const context=vm.createContext({THREE:{...THREE,WebGLRenderer:class{setPixelRatio(){}setSize(){}render(){}}},document,window:{addEventListener(){}},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},innerWidth:1280,innerHeight:800,devicePixelRatio:1,matchMedia:()=>({matches:true}),performance:{now:()=>0},requestAnimationFrame(){},setTimeout:()=>0,console,assert});
const code=fs.readFileSync(new URL('../dist/game.js',import.meta.url),'utf8').replace(/^import .*?;\n/,'');
vm.runInContext(code+`
// Starting behind the companion is forbidden, without needing to move first.
enterLevel(0);yaw=Math.PI;updateGame(1/60);assert.equal(mode,'over');
// A wall prevents leaving the walkable corridor.
enterLevel(0);const oldX=player.x;keys.KeyD=true;for(let i=0;i<120;i++)updateGame(1/60);assert(player.x-oldX<2);keys={};
// Seen statues follow when gaze is broken, then a shelter removes the slowdown.
enterLevel(0);const pen=penguins[0];player.copy(pen.pos).add(new THREE.Vector3(0,0,1));eul.copy(player).add(new THREE.Vector3(0,0,1.6));crumbs=[eul.clone(),player.clone()];yaw=0;updateGame(1/60);assert(pen.seen);pitch=1.05;for(let i=0;i<35;i++)updateGame(1/60);assert(pen.attached);player.copy(camp);interact();assert(!pen.attached&&pen.released);
// Walk every main route using the real movement, collision, follow and jump rules.
for(let n=0;n<5;n++){
 enterLevel(n);const planned=route.map(v=>[...v]);
 for(let ri=1;ri<planned.length;ri++){
  const target=pos(planned[ri]);let frames=0;
  while(player.distanceTo(target)>.08&&frames++<450){
   const delta=target.clone().sub(player);yaw=Math.atan2(-delta.x,-delta.z);pitch=0;keys={KeyW:true};
   const current=cellAt(player.x,player.z);const gapAhead=gaps.has(planned[ri].join(','))||gaps.has(current.join(','));
   if(gapAhead&&jumpY===0){const gapZ=gaps.has(planned[ri].join(','))?target.z:(current[1]-8)*CELL;if(player.z-gapZ>1&&player.z-gapZ<2.15)jumpV=6;}
   updateGame(1/60);worldTime+=1/60;
   if(n===4&&mode==='ending')break;
   assert.equal(mode,'playing','unexpected failure stage '+n+' route '+ri+' '+$('overTitle').textContent);
  }
  assert(frames<450,'unreachable waypoint '+n+'/'+ri);if(mode==='ending')break;
 }
 keys={};if(mode!=='ending'){assert(player.distanceTo(exitPos)<.1);interact();}assert.equal(mode,n===4?'ending':'playing');console.log('PASS route, collisions, follow, jumps, exit: stage '+(n+1));
}
assert.equal(checkpoint,null);console.log('PASS backward gaze failure, penguin attach/release, all five stages and ending');
`,context,{timeout:20000});
