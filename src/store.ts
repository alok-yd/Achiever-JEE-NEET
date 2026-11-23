import { ExamKey, CURRICULA } from "./data";
export type Profile = {name:string; exam:ExamKey; targetYear:string; classLevel:string; target:string; targetCollege:string; targetBranch:string; dailyHours:number; examDate:string};
export type Lecture = {id:string; subjectId:string; chapter:string; title:string; minutes:number; date:string; completed:boolean};
export type Attempt = {id:string; questionId:string; subjectId:string; chapter:string; result:"correct"|"incorrect"|"skipped"; difficulty:string; seconds:number; date:string; mistake?:string};
export type TestRecord = {id:string; title:string; exam:ExamKey; date:string; score:number; maxScore:number; correct:number; incorrect:number; skipped:number; accuracy:number; durationMinutes:number; subjectScores:Record<string,number>};
export type RevisionItem = {id:string; title:string; subjectId:string; chapter:string; dueDate:string; done:boolean; source:"manual"|"mistake"|"chapter"};
export type Note = {id:string; title:string; subjectId:string; body:string; updatedAt:string};
export type StudySession = {id:string; date:string; minutes:number; mode:string; subjectId:string};
export type AppState = {profile:Profile; completedChapters:string[]; lectures:Lecture[]; attempts:Attempt[]; tests:TestRecord[]; revisions:RevisionItem[]; notes:Note[]; sessions:StudySession[]; health:{sleep:number;water:number;exercise:number;meditation:number;date:string}; streak:number; lastStudyDate:string};
const today = () => new Date().toISOString().slice(0,10);
export const defaultState = ():AppState=>({profile:{name:"Student",exam:"JEE",targetYear:"2027",classLevel:"Class 12",target:"Top 1000",targetCollege:"IIT / NIT / AIIMS",targetBranch:"",dailyHours:8,examDate:"2027-01-20"},completedChapters:[],lectures:[],attempts:[],tests:[],revisions:[],notes:[],sessions:[],health:{sleep:7,water:2,exercise:20,meditation:10,date:today()},streak:0,lastStudyDate:""});
const KEY="achiever-jee-neet-v1";
export function loadState():AppState {
 try { const raw=localStorage.getItem(KEY); if(!raw) return defaultState(); const parsed=JSON.parse(raw) as Partial<AppState>; const base=defaultState(); return {...base,...parsed,profile:{...base.profile,...parsed.profile}}; } catch { return defaultState(); }
}
export function saveState(state:AppState){ try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){console.warn("Could not save ACHIEVER data",e);} }
export function subjectStats(state:AppState){const subjects=CURRICULA[state.profile.exam];return subjects.map(s=>{const keys=s.chapters.map(c=>s.id+"::"+c);const complete=keys.filter(k=>state.completedChapters.includes(k)).length;const attempts=state.attempts.filter(a=>a.subjectId===s.id&&a.result!=="skipped");const correct=attempts.filter(a=>a.result==="correct").length;return {...s,complete,total:s.chapters.length,progress:Math.round(complete/s.chapters.length*100),attempts:attempts.length,correct,accuracy:attempts.length?Math.round(correct/attempts.length*100):0};});}
export function totalStudyMinutes(state:AppState){return state.sessions.reduce((n,s)=>n+s.minutes,0);}
export function addStudyDay(state:AppState){const t=today();if(state.lastStudyDate===t)return state;const prev=new Date();prev.setDate(prev.getDate()-1);const y=prev.toISOString().slice(0,10);return {...state,streak:state.lastStudyDate===y?state.streak+1:1,lastStudyDate:t};}
export const uid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36);
