import {
 createUserWithEmailAndPassword,
 onAuthStateChanged,
 signInWithEmailAndPassword,
 sendPasswordResetEmail,
 signOut,
 updateProfile,
 type User
} from "firebase/auth";
import {firebaseAuth,firebaseReady} from "./firebase";

const requireAuth=()=>{if(!firebaseReady||!firebaseAuth)throw new Error("Firebase Authentication is not configured for ACHIEVER JEE/NEET.");return firebaseAuth;};
export const subscribeToCloudUser=(callback:(user:User|null)=>void)=>firebaseAuth?onAuthStateChanged(firebaseAuth,callback):()=>{};
export async function createCloudAccount(name:string,email:string,password:string){
 const auth=requireAuth();const result=await createUserWithEmailAndPassword(auth,email.trim(),password);
 if(name.trim())await updateProfile(result.user,{displayName:name.trim()});
 return result.user;
}
export async function signInToCloudAccount(email:string,password:string){
 return (await signInWithEmailAndPassword(requireAuth(),email.trim(),password)).user;
}
export async function resetCloudPassword(email:string){await sendPasswordResetEmail(requireAuth(),email.trim());}
export async function signOutCloudAccount(){await signOut(requireAuth());}
