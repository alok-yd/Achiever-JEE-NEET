import {collection,doc,getDoc,getDocs,setDoc,writeBatch,type DocumentData} from "firebase/firestore";
import {firebaseDb,firebaseReady} from "./firebase";
import {defaultState,type AppState} from "../store";

type RecordRow={id:string;[key:string]:unknown};
const collections=[
 ["lectures","lectures"],["attempts","attempts"],["tests","tests"],["revisions","revisions"],
 ["notes","notes"],["sessions","studySessions"],["dailyTasks","dailyTasks"],
 ["flashcards","flashcards"],["customQuestions","customQuestions"],["healthChallenges","healthChallenges"],["aiMessages","aiMessages"],["events","events"]
] as const;
const safeId=(id:string)=>encodeURIComponent(id).slice(0,1400);
function removeUndefined(value:any):any{
 if(Array.isArray(value))return value.map(removeUndefined);
 if(value&&typeof value==="object"&&Object.getPrototypeOf(value)===Object.prototype){
  return Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).map(([k,v])=>[k,removeUndefined(v)]));
 }
 return value;
}
const requireDb=()=>{if(!firebaseReady||!firebaseDb)throw new Error("Firebase is not configured. Add the JEE/NEET project's VITE_FIREBASE_* values.");return firebaseDb;};

async function replaceCollection(uid:string,collectionName:string,records:RecordRow[]){
 const db=requireDb();const ref=collection(db,"users",uid,collectionName);
 const existing=await getDocs(ref);const ids=new Set(records.map(x=>safeId(x.id)));
 const operations:Array<(batch:ReturnType<typeof writeBatch>)=>void>=[];
 existing.docs.forEach(snapshot=>{if(!ids.has(snapshot.id))operations.push(batch=>batch.delete(snapshot.ref));});
 records.forEach(record=>operations.push(batch=>batch.set(doc(ref,safeId(record.id)),removeUndefined(record) as DocumentData)));
 for(let offset=0;offset<operations.length;offset+=400){
  const batch=writeBatch(db);operations.slice(offset,offset+400).forEach(fn=>fn(batch));await batch.commit();
 }
}
export async function saveWorkspaceToCloud(uid:string,state:AppState){
 const db=requireDb();const meta={
  schemaVersion:state.schemaVersion,profile:state.profile,completedChapters:state.completedChapters,
  bookmarkedQuestionIds:state.bookmarkedQuestionIds,ncertCompletedChapters:state.ncertCompletedChapters,health:state.health,streak:state.streak,lastStudyDate:state.lastStudyDate,
  updatedAt:new Date().toISOString()
 };
 await Promise.all([
  setMeta(db,uid,meta),
  ...collections.map(([key,name])=>replaceCollection(uid,name,(state[key]||[]) as unknown as RecordRow[]))
 ]);
}
async function setMeta(db:NonNullable<typeof firebaseDb>,uid:string,data:DocumentData){
 await setDoc(doc(db,"users",uid,"workspace","meta"),removeUndefined(data),{merge:true});
}
export async function loadWorkspaceFromCloud(uid:string):Promise<AppState|null>{
 const db=requireDb();const metaSnap=await getDoc(doc(db,"users",uid,"workspace","meta"));
 if(!metaSnap.exists())return null;
 const base=defaultState();const meta=metaSnap.data();
 const fetched=await Promise.all(collections.map(async([key,name])=>{
  const snap=await getDocs(collection(db,"users",uid,name));
  return [key,snap.docs.map(d=>d.data())] as const;
 }));
 const arrays=Object.fromEntries(fetched);
 return {
  ...base,...meta,
  profile:{...base.profile,...(meta.profile||{})},
  completedChapters:Array.isArray(meta.completedChapters)?meta.completedChapters:[],
  bookmarkedQuestionIds:Array.isArray(meta.bookmarkedQuestionIds)?meta.bookmarkedQuestionIds:[],
  ncertCompletedChapters:Array.isArray(meta.ncertCompletedChapters)?meta.ncertCompletedChapters:[],
  health:{...base.health,...(meta.health||{})},
  ...arrays,
  schemaVersion:2
 } as AppState;
}
