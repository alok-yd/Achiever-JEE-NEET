import { ExamKey, CURRICULA } from "./data";
import type { ExamTrack } from "./exam-config";

export type PreparationMode = "Self-study"|"Coaching"|"Hybrid";
export type LearningMedium = "English"|"Hindi"|"Bilingual";
export type Profile = {
 name:string; exam:ExamKey; examTrack:ExamTrack; selectedExams:ExamTrack[];
 targetYear:string; classLevel:string; target:string; targetRank:string;
 targetCollege:string; targetBranch:string; dailyHours:number; examDate:string;
 preparationMode:PreparationMode; learningMedium:LearningMedium;
 currentStatus:"Starting"|"In progress"|"Revision"|"Mock-test phase";
};
export type Lecture = {
 id:string; subjectId:string; chapter:string; topic?:string; title:string;
 minutes:number; actualMinutes?:number; date:string; completed:boolean;
 lectureNumber?:number; teacherName?:string; notes?:string;
 revisionStatus?:"Not scheduled"|"Due"|"Revised";
};
export type Attempt = {
 id:string; questionId:string; subjectId:string; chapter:string; topic?:string;
 result:"correct"|"incorrect"|"skipped"; difficulty:string; seconds:number; date:string;
 mistake?:string; mistakeCategory?:string; selectedAnswer?:string|number;
 correctAnswer?:string|number; confidence?:1|2|3|4|5;
 attemptType?:"PYQ"|"Practice"|"Mock"|"Custom"; examTrack?:ExamTrack;
 examYear?:string; session?:string; shift?:string; sourceLabel?:string;
 bookmarked?:boolean; markedForRevision?:boolean; notes?:string;
};
export type TestRecord = {
 id:string; title:string; exam:ExamKey; examTrack?:ExamTrack; patternVersion?:string;
 testType?:"Full mock"|"Subject test"|"Chapter test"|"Topic test"|"PYQ paper"|"Starter practice";
 score:number; maxScore:number; scoreUnit?:"marks"|"raw correct";
 date:string; correct:number; incorrect:number; skipped:number; accuracy:number;
 durationMinutes:number; subjectScores:Record<string,number>;
 attempted?:number; negativeMarks?:number; attemptedAt?:string;
};
export type RevisionItem = {
 id:string; title:string; subjectId:string; chapter:string; dueDate:string;
 done:boolean; source:"manual"|"mistake"|"chapter"; intervalDay?:number;
 stage?:number; notes?:string;
};
export type Note = {
 id:string; title:string; subjectId:string; body:string; updatedAt:string;
 kind?:"note"|"formula"|"error"; chapter?:string; topic?:string; tags?:string[];
};
export type StudySession = {
 id:string; date:string; minutes:number; mode:string; subjectId:string;
 origin?:"manual"|"verified"; verificationStatus?:"unverified"|"verified"|"interrupted";
 startedAt?:string; endedAt?:string; note?:string;
};
export type DailyTask = {
 id:string; title:string; date:string; subjectId?:string; chapter?:string;
 taskType:"Lecture"|"Questions"|"Revision"|"Mock test"|"Reading"|"Other";
 estimatedMinutes:number; done:boolean; source:"manual"|"suggested";
};
export type Flashcard = {id:string;front:string;back:string;subjectId:string;chapter:string;createdAt:string;dueAt?:string;intervalDays?:number;ease?:number;repetitions?:number};
export type StudyEvent = {id:string;type:"lecture_added"|"lecture_completed"|"chapter_completed"|"attempt_logged"|"test_submitted"|"revision_completed"|"focus_session_saved";date:string;subjectId?:string;chapter?:string;refId?:string;summary:string};
export type AppState = {
 schemaVersion:number; profile:Profile; completedChapters:string[];
 lectures:Lecture[]; attempts:Attempt[]; tests:TestRecord[]; revisions:RevisionItem[];
 notes:Note[]; sessions:StudySession[]; dailyTasks:DailyTask[]; flashcards:Flashcard[];
 bookmarkedQuestionIds:string[]; events:StudyEvent[];
 health:{sleep:number;water:number;exercise:number;meditation:number;date:string};
 streak:number; lastStudyDate:string;
};
const localDate=()=>{
 const d=new Date();const y=d.getFullYear();const m=String(d.getMonth()+1).padStart(2,"0");const day=String(d.getDate()).padStart(2,"0");
 return y+"-"+m+"-"+day;
};
export const defaultState=():AppState=>({
 schemaVersion:2,
 profile:{
  name:"Student",exam:"JEE",examTrack:"jee-main",selectedExams:["jee-main","jee-advanced"],
  targetYear:"2027",classLevel:"Class 12",target:"Top 1000",targetRank:"Under 1000",
  targetCollege:"IIT / NIT",targetBranch:"Computer Science",dailyHours:8,examDate:"",
  preparationMode:"Hybrid",learningMedium:"English",currentStatus:"In progress"
 },
 completedChapters:[],lectures:[],attempts:[],tests:[],revisions:[],notes:[],
 sessions:[],dailyTasks:[],flashcards:[],bookmarkedQuestionIds:[],events:[],
 health:{sleep:7,water:2,exercise:20,meditation:10,date:localDate()},
 streak:0,lastStudyDate:""
});
const KEY="achiever-jee-neet-v1";
const isArray=<T,>(v:unknown):v is T[]=>Array.isArray(v);
export function loadState():AppState {
 try {
  const raw=localStorage.getItem(KEY);if(!raw)return defaultState();
  const parsed=JSON.parse(raw) as Partial<AppState>;const base=defaultState();
  const profile={...base.profile,...(parsed.profile||{})};
  if(!profile.examTrack)profile.examTrack=profile.exam==="NEET"?"neet-ug":"jee-main";
  if(!isArray(profile.selectedExams)||profile.selectedExams.length===0)profile.selectedExams=profile.exam==="NEET"?["neet-ug"]:["jee-main","jee-advanced"];
  if(!profile.targetRank)profile.targetRank=profile.target||"Not set";
  if(!profile.preparationMode)profile.preparationMode="Hybrid";
  if(!profile.learningMedium)profile.learningMedium="English";
  if(!profile.currentStatus)profile.currentStatus="In progress";
  const safe={...base,...parsed,profile,
   completedChapters:isArray<string>(parsed.completedChapters)?parsed.completedChapters:[],
   lectures:isArray<Lecture>(parsed.lectures)?parsed.lectures:[],
   attempts:isArray<Attempt>(parsed.attempts)?parsed.attempts:[],
   tests:isArray<TestRecord>(parsed.tests)?parsed.tests:[],
   revisions:isArray<RevisionItem>(parsed.revisions)?parsed.revisions:[],
   notes:isArray<Note>(parsed.notes)?parsed.notes:[],
   sessions:isArray<StudySession>(parsed.sessions)?parsed.sessions:[],
   dailyTasks:isArray<DailyTask>(parsed.dailyTasks)?parsed.dailyTasks:[],
   flashcards:isArray<Flashcard>(parsed.flashcards)?parsed.flashcards:[],
   bookmarkedQuestionIds:isArray<string>(parsed.bookmarkedQuestionIds)?parsed.bookmarkedQuestionIds:[],
   events:isArray<StudyEvent>(parsed.events)?parsed.events:[],
   health:{...base.health,...(parsed.health||{})},
   schemaVersion:2
  };
  return safe;
 }catch{return defaultState();}
}
export function saveState(state:AppState){
 try{localStorage.setItem(KEY,JSON.stringify({...state,schemaVersion:2}));}
 catch(e){console.warn("Could not save ACHIEVER data",e);}
}
export function subjectStats(state:AppState){
 const subjects=CURRICULA[state.profile.exam];
 return subjects.map(s=>{
  const keys=s.chapters.map(c=>s.id+"::"+c);
  const complete=keys.filter(k=>state.completedChapters.includes(k)).length;
  const allAttempts=state.attempts.filter(a=>a.subjectId===s.id);
  const attempts=allAttempts.filter(a=>a.result!=="skipped");
  const correct=attempts.filter(a=>a.result==="correct").length;
  const lectures=state.lectures.filter(l=>l.subjectId===s.id);
  return {...s,complete,total:s.chapters.length,progress:Math.round(complete/s.chapters.length*100),
   attempts:attempts.length,correct,accuracy:attempts.length?Math.round(correct/attempts.length*100):0,
   lectureCount:lectures.length,completedLectures:lectures.filter(l=>l.completed).length,
   lectureMinutes:lectures.reduce((n,l)=>n+(l.actualMinutes??l.minutes),0),
   revisionOpen:state.revisions.filter(r=>r.subjectId===s.id&&!r.done).length};
 });
}
export function totalStudyMinutes(state:AppState){
 return state.sessions.reduce((n,s)=>n+s.minutes,0);
}
export function studyMinutesByOrigin(state:AppState,origin:"manual"|"verified"){
 return state.sessions.filter(s=>(s.origin||"manual")===origin).reduce((n,s)=>n+s.minutes,0);
}
export function addStudyDay(state:AppState){
 const t=localDate();if(state.lastStudyDate===t)return state;
 const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
 const key=yesterday.getFullYear()+"-"+String(yesterday.getMonth()+1).padStart(2,"0")+"-"+String(yesterday.getDate()).padStart(2,"0");
 return {...state,streak:state.lastStudyDate===key?state.streak+1:1,lastStudyDate:t};
}
export const uid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36);
