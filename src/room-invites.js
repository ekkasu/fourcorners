export function validRoomCode(value){
 const code=String(value||'').trim().toUpperCase();
 return /^[A-Z0-9]{6}$/.test(code)?code:'';
}
export function roomCodeFromUrl(value){
 try{return validRoomCode(new URL(value).searchParams.get('room'))}catch{return ''}
}
export function roomInviteUrl(base,code){
 const normalized=validRoomCode(code);
 if(!normalized)throw new Error('Invalid room code');
 const url=new URL(base);url.search='';url.hash='';url.searchParams.set('room',normalized);
 return url.href;
}
export function roomCodeInput(value){
 if(/^https?:\/\//i.test(value.trim()))return roomCodeFromUrl(value.trim());
 return value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
}
