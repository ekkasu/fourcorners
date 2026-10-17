import {initializeApp} from 'firebase/app';
import {getAuth,browserLocalPersistence,setPersistence} from 'firebase/auth';
export const firebaseConfig={apiKey:'AIzaSyAQk_q77sFa0uctbflkoG90IBRzuqe65Rw',authDomain:'fourkorners-46cfc.firebaseapp.com',projectId:'fourkorners-46cfc',databaseURL:'https://fourkorners-46cfc-default-rtdb.firebaseio.com',storageBucket:'fourkorners-46cfc.firebasestorage.app',messagingSenderId:'502232020081',appId:'1:502232020081:web:00ffa246062d7cdff557d0'};
export const firebaseApp=initializeApp(firebaseConfig);
export const auth=getAuth(firebaseApp);
export const authReady=setPersistence(auth,browserLocalPersistence).then(()=>auth.authStateReady());
