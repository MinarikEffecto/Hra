// Looping user-supplied island soundtrack with a compact volume control.
export function createParadiseMusic(context,output,bytesPromise){
 const bus=context.createGain();let enabled=true,volume=.28,source=null;bus.gain.value=volume;bus.connect(output);
 bytesPromise.then(bytes=>bytes?context.decodeAudioData(bytes.slice(0)):null).then(buffer=>{if(!buffer)return;source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(bus);source.start();}).catch(()=>{});
 function apply(){bus.gain.setTargetAtTime(enabled?volume:0,context.currentTime,.12);}
 return {toggle(){enabled=!enabled;apply();return enabled;},setVolume(value){volume=Math.max(0,Math.min(1,value));apply();},update(){},get enabled(){return enabled;}};
}
