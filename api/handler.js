import {firebaseApi} from '../server/firebase-api.js';
export function apiRequestUrl(req){
 const url=new URL(req.url,'https://localhost'),route=req.query?.__route||url.searchParams.get('__route');
 return typeof route==='string'?'/api/'+route:url.pathname;
}
export default async function handler(req,res){const original=req.url;req.url=apiRequestUrl(req);try{await firebaseApi(req,res)}finally{req.url=original}}
