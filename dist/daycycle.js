import * as THREE from './vendor/three.module.js';
export function lightingAt(hour){const elevation=Math.sin((hour-6)/24*Math.PI*2);return {elevation,day:THREE.MathUtils.smoothstep(elevation,-.16,.24),dusk:Math.exp(-Math.pow(elevation/.23,2))};}
export function createDayCycle(scene,sun,hemi,water,player){
 let hour=16.5,speed=1;const clock=document.getElementById('clock'),slider=document.getElementById('hour');
 slider.oninput=()=>{hour=Number(slider.value)};document.getElementById('timeSpeed').onchange=e=>speed=Number(e.target.value);document.querySelectorAll('[data-hour]').forEach(b=>b.onclick=()=>{hour=Number(b.dataset.hour);slider.value=hour});
 const moon=new THREE.DirectionalLight(0x789cff,.18);moon.position.set(5,10,-5);scene.add(moon);
 const glow=new THREE.PointLight(0xb8d5ff,0,2.6,1.5);glow.position.set(0,.9,.2);player.add(glow);
 const daySky=new THREE.Color(0xd6f9ff),nightSky=new THREE.Color(0x5779ba),gold=new THREE.Color(0xff863f),white=new THREE.Color(0xfff1d3);
 return {update(dt){hour=(hour+dt*24/360*speed)%24;const {elevation,day,dusk}=lightingAt(hour),a=(hour-6)/24*Math.PI*2;
 sun.position.set(Math.cos(a)*13,Math.max(.8,elevation*16),-4);sun.intensity=3*day*(1-dusk*.3);sun.color.copy(white).lerp(gold,dusk);sun.castShadow=day>.03;
 hemi.intensity=.13+day*1.52;hemi.color.copy(nightSky).lerp(daySky,day).lerp(new THREE.Color(0xf49eae),dusk*.35);hemi.groundColor.set(0x9f9571).lerp(new THREE.Color(0x172544),1-day);moon.intensity=(1-day)*.22;glow.intensity=(1-day)*.65;
 water.uDay.value=day;water.uDusk.value=dusk;const minutes=Math.floor(hour*60);clock.textContent=String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');if(document.activeElement!==slider)slider.value=hour;
 }};
}
