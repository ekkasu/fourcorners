// Game sounds synthesized with the Web Audio API, so no audio files are needed.
// The context starts on the first key or touch, because browsers block audio before a user gesture.
let ctx=null,master=null,muted=false;
try{muted=localStorage.getItem('fc_muted')==='1'}catch{}

function audio(){
 if(!ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;ctx=new AC();master=ctx.createGain();master.gain.value=muted?0:.8;master.connect(ctx.destination)}
 if(ctx.state==='suspended')ctx.resume();return ctx;
}
function envelope(gain,t,attack,peak,release){gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(peak,t+attack);gain.gain.exponentialRampToValueAtTime(.0001,t+attack+release)}
function thump(from,to,peak,length){
 const c=audio();if(!c||muted)return;const t=c.currentTime,osc=c.createOscillator(),gain=c.createGain();
 osc.frequency.setValueAtTime(from,t);osc.frequency.exponentialRampToValueAtTime(to,t+length);envelope(gain,t,.005,peak,length);
 osc.connect(gain).connect(master);osc.start(t);osc.stop(t+length+.05);
}
function hiss(type,freq,peak,attack,release,q=1){
 const c=audio();if(!c||muted)return;const t=c.currentTime,length=attack+release+.05,buffer=c.createBuffer(1,Math.ceil(c.sampleRate*length),c.sampleRate),data=buffer.getChannelData(0);
 for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
 const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=buffer;filter.type=type;filter.frequency.value=freq;filter.Q.value=q;envelope(gain,t,attack,peak,release);
 source.connect(filter).connect(gain).connect(master);source.start(t);
}
function whistle(delay,length){
 const c=audio();if(!c||muted)return;const t=c.currentTime+delay,osc=c.createOscillator(),lfo=c.createOscillator(),depth=c.createGain(),gain=c.createGain();
 osc.type='triangle';osc.frequency.value=2850;lfo.frequency.value=28;depth.gain.value=90;lfo.connect(depth).connect(osc.frequency);envelope(gain,t,.01,.16,length);
 osc.connect(gain).connect(master);osc.start(t);lfo.start(t);osc.stop(t+length+.05);lfo.stop(t+length+.05);
}

export const sfx={
 unlock(){audio()},
 kick(power=1){thump(150,45,.9*power,.18);hiss('lowpass',1800,.35*power,.003,.06)},
 bounce(strength=.5){thump(110,60,.35*Math.min(1,strength),.1)},
 tackle(){thump(90,50,.5,.12);hiss('bandpass',900,.25,.005,.12,.8)},
 save(){thump(80,40,.6,.2);hiss('lowpass',900,.2,.004,.1)},
 post(strength=.6){thump(420,210,.55*strength,.09);hiss('bandpass',2600,.28*strength,.002,.07,3)},
 goal(){hiss('bandpass',650,.55,.4,1.8,.5);hiss('bandpass',1600,.18,.3,1.5,.7);whistle(0,.18);whistle(.25,.5)},
 isMuted(){return muted},
 toggle(){muted=!muted;try{localStorage.setItem('fc_muted',muted?'1':'0')}catch{}if(master)master.gain.value=muted?0:.8;return muted},
};

// Match music: an Afrobeat/highlife groove (112 BPM, C-F-G-F), synthesized and scheduled a little ahead of time.
// It plays through its own gain so it can be switched off without muting the game sounds.
const BPM=112,STEP=60/BPM/4,CHORDS=[[48,52,55],[53,57,60],[55,59,62],[53,57,60]];
const KICK=[0,6,8,14],CLAP=[4,12],BELL=[0,3,6,10,12],BASS=[0,3,6,8,11,14],GUITAR=[2,5,7,10,13,15];
let musicOn=true;try{musicOn=localStorage.getItem('fc_music')!=='0'}catch{}
let musicBus=null,timer=null,nextTime=0,step=0,noiseBuf=null,ambience=null;
const hz=m=>440*Math.pow(2,(m-69)/12);
function noiseBuffer(){if(!noiseBuf){noiseBuf=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}return noiseBuf}
function tone(type,freq,t,peak,length,cutoff){
 const osc=ctx.createOscillator(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();osc.type=type;osc.frequency.value=freq;filter.type='lowpass';filter.frequency.value=cutoff;
 envelope(gain,t,.004,peak,length);osc.connect(filter).connect(gain).connect(musicBus);osc.start(t);osc.stop(t+length+.05);
}
function noiseHit(t,freq,type,peak,length){
 const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=noiseBuffer();filter.type=type;filter.frequency.value=freq;
 envelope(gain,t,.002,peak,length);source.connect(filter).connect(gain).connect(musicBus);source.start(t,Math.random(),length+.05);
}
function scheduleStep(i,t){
 const s16=i%16,chord=CHORDS[Math.floor(i/16)%4];
 if(KICK.includes(s16)){const osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.setValueAtTime(130,t);osc.frequency.exponentialRampToValueAtTime(42,t+.14);envelope(gain,t,.003,.55,.16);osc.connect(gain).connect(musicBus);osc.start(t);osc.stop(t+.2)}
 if(CLAP.includes(s16))noiseHit(t,1500,'bandpass',.3,.09);
 noiseHit(t,7000,'highpass',s16%2?.08:.045,.035);
 if(BELL.includes(s16)){tone('sine',hz(84),t,.06,.09,6000);tone('sine',hz(91),t,.03,.06,6000)}
 if(BASS.includes(s16))tone('triangle',hz((s16===6||s16===14?chord[0]+7:chord[0])-12),t,.32,STEP*1.6,600);
 if(GUITAR.includes(s16)){const note=chord[GUITAR.indexOf(s16)%3]+12;tone('triangle',hz(note),t,.09,STEP*1.2,2400);tone('sine',hz(note+12),t,.03,STEP,4000)}
}
function tick(){if(nextTime<ctx.currentTime-.2)nextTime=ctx.currentTime+.05;while(nextTime<ctx.currentTime+.15){scheduleStep(step++,nextTime);nextTime+=STEP}}
function fade(gain,to,seconds){const t=ctx.currentTime;gain.gain.cancelScheduledValues(t);gain.gain.setValueAtTime(Math.max(.0001,gain.gain.value),t);gain.gain.exponentialRampToValueAtTime(Math.max(.0001,to),t+seconds)}

export const music={
 start(){const c=audio();if(!c||timer)return;if(!musicBus){musicBus=c.createGain();musicBus.gain.value=.0001;musicBus.connect(master)}fade(musicBus,musicOn?.32:0,1.2);nextTime=c.currentTime+.08;step=0;timer=setInterval(tick,25);tick()},
 stop(){if(!timer)return;clearInterval(timer);timer=null;fade(musicBus,0,.8)},
 isOn(){return musicOn},
 toggle(){musicOn=!musicOn;try{localStorage.setItem('fc_music',musicOn?'1':'0')}catch{}if(musicBus&&timer)fade(musicBus,musicOn?.32:0,.4);return musicOn},
};

// Crowd murmur under the match, slowly swelling and fading, plus a cheer for goals.
export const crowd={
 start(){const c=audio();if(!c||ambience)return;const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain(),lfo=c.createOscillator(),depth=c.createGain();
  source.buffer=noiseBuffer();source.loop=true;filter.type='bandpass';filter.frequency.value=550;filter.Q.value=.6;gain.gain.value=.0001;lfo.frequency.value=.13;depth.gain.value=.025;
  lfo.connect(depth).connect(gain.gain);source.connect(filter).connect(gain).connect(master);source.start();lfo.start();fade(gain,.08,1.5);ambience={source,gain,lfo}},
 stop(){if(!ambience)return;const{source,gain,lfo}=ambience;fade(gain,0,.8);source.stop(ctx.currentTime+.9);lfo.stop(ctx.currentTime+.9);ambience=null},
 cheer(){hiss('bandpass',800,.4,.15,1.4,.5)},
};
