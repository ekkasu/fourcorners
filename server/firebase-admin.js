import {getApps,initializeApp,cert,applicationDefault} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getDatabase} from 'firebase-admin/database';
import {getFirestore} from 'firebase-admin/firestore';
export function firebaseServices(){
 let app=getApps().find(a=>a.name==='fourcorners');
 if(!app){
  const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if(process.env.VERCEL&&!raw&&!process.env.GOOGLE_APPLICATION_CREDENTIALS)throw new Error('Firebase Admin credentials are not configured.');
  const options={projectId:'fourkorners-46cfc',databaseURL:'https://fourkorners-46cfc-default-rtdb.firebaseio.com'};
  if(!process.env.FIRESTORE_EMULATOR_HOST)options.credential=raw?cert(JSON.parse(raw)):applicationDefault();
  app=initializeApp(options,'fourcorners');
 }
 return {auth:getAuth(app),db:getFirestore(app),realtime:getDatabase(app)};
}
