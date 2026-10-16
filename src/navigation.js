import {useCallback, useState} from 'react';

// Returning to an existing screen unwinds its child screens instead of creating a loop.
export function navigateScreens(screens, next) {
 const target=typeof next==='function'?next(screens.at(-1)):next;
 const index=screens.lastIndexOf(target);
 return index<0?[...screens,target]:screens.slice(0,index+1);
}

export function useScreenNavigation(initialScreen='home') {
 const [screens,setScreens]=useState(()=>initialScreen==='home'?['home']:['home',initialScreen]);
 const navigate=useCallback(next=>setScreens(current=>navigateScreens(current,next)),[]);
 const back=useCallback(()=>setScreens(current=>current.length>1?current.slice(0,-1):current),[]);
 return [screens.at(-1),navigate,back,screens.at(-2)||'home'];
}
