import {initializeApp,getApps,getApp,type FirebaseApp} from "firebase/app";
import {getAuth,type Auth} from "firebase/auth";
import {getFirestore,type Firestore} from "firebase/firestore";
import {getStorage,type FirebaseStorage} from "firebase/storage";
import {initializeAppCheck,ReCaptchaEnterpriseProvider,type AppCheck} from "firebase/app-check";

const env=import.meta.env;
const config={
 apiKey:env.VITE_FIREBASE_API_KEY||"",
 authDomain:env.VITE_FIREBASE_AUTH_DOMAIN||"",
 projectId:env.VITE_FIREBASE_PROJECT_ID||"",
 storageBucket:env.VITE_FIREBASE_STORAGE_BUCKET||"",
 appId:env.VITE_FIREBASE_APP_ID||"",
 appCheckSiteKey:env.VITE_FIREBASE_APPCHECK_SITE_KEY||"",
};
export const firebaseReady=Boolean(config.apiKey&&config.authDomain&&config.projectId&&config.appId);
export const firebaseConfigState={ready:firebaseReady,projectId:config.projectId||""};
let appInstance:FirebaseApp|null=null;
if(firebaseReady){
 appInstance=getApps().length?getApp():initializeApp(config);
}
export const firebaseApp=appInstance;
let appCheckInstance:AppCheck|null=null;
if(appInstance&&config.appCheckSiteKey){
 try{appCheckInstance=initializeAppCheck(appInstance,{provider:new ReCaptchaEnterpriseProvider(config.appCheckSiteKey),isTokenAutoRefreshEnabled:true});}
 catch(error){console.warn("Firebase App Check initialization failed:",error);}
}
export const firebaseAppCheck=appCheckInstance;
export const firebaseAuth:Auth|null=appInstance?getAuth(appInstance):null;
export const firebaseDb:Firestore|null=appInstance?getFirestore(appInstance):null;
export const firebaseStorage:FirebaseStorage|null=appInstance?getStorage(appInstance):null;
