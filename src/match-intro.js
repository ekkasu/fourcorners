export function createMatchIntro({createAudio=()=>new Audio('/audio/match-intro.mp3'),onActive=()=>{}}={}){
 let audio=null,timer=null;
 function stop(){
  clearTimeout(timer);timer=null;
  if(audio){audio.onended=audio.onerror=null;audio.pause();audio=null}
  onActive(false);
 }
 return {
  play(muted=false){
   stop();if(muted)return;
   try{
    audio=createAudio();audio.preload='auto';audio.volume=.8;
    const clip=audio,finish=()=>{if(audio===clip)stop()};
    audio.onended=audio.onerror=finish;
    onActive(true);
    // Audio failures or blocked autoplay must never hold up a match.
    timer=setTimeout(finish,5000);
    Promise.resolve(audio.play()).catch(finish);
   }catch{stop()}
  },
  setMuted(muted){if(audio)audio.muted=muted},
  stop,
 };
}
