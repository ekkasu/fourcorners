export async function copyText(text){
 try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return}}catch{}
 // Older browsers and local-network HTTP pages may lack the Clipboard API.
 const previous=document.activeElement,input=document.createElement('textarea');
 input.value=text;input.readOnly=true;input.style.cssText='position:fixed;top:0;left:0;opacity:0;pointer-events:none';
 document.body.appendChild(input);
 try{input.focus();input.select();input.setSelectionRange(0,text.length);if(!document.execCommand('copy'))throw new Error('Copy unavailable')}
 finally{input.remove();previous?.focus?.({preventScroll:true})}
}
