export const fullscreenElement=doc=>doc.fullscreenElement||doc.webkitFullscreenElement;
export async function toggleFullscreen(doc){
 const active=fullscreenElement(doc),target=active?doc:doc.documentElement;
 const action=active?(doc.exitFullscreen||doc.webkitExitFullscreen):(target.requestFullscreen||target.webkitRequestFullscreen);
 if(!action)throw new Error('Fullscreen is unavailable in this browser.');
 await action.call(target);
}
