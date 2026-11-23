import React, { useEffect, useMemo, useRef, useState } from "react";
import {
 Activity, ArrowRight, BarChart3, BookOpen, Brain, CalendarDays, Check, CheckCircle2,
 ChevronDown, ChevronRight, Clock3, Download, Eye, FileText, Flame, GraduationCap,
 Heart, HeartPulse, LayoutDashboard, Lightbulb, ListChecks, Menu, Mic, Pause, Play,
 Plus, Paperclip, RefreshCw, Search, Send, Settings, ShieldCheck, Sparkles, Star, Target,
 Timer, Trash2, TrendingUp, Trophy, Volume2, X
} from "lucide-react";
import { CHAPTER_GROUPS, CURRICULA, EXAM_DATES, EXAM_RULES, PAGE_ITEMS, SAMPLE_QUESTIONS, type ExamKey, type PracticeQuestion } from "./data";
import { DEFAULT_TRACK, EXAM_TRACKS, formatExamTrack, tracksForExam, type ExamTrack } from "./exam-config";
import { buildAnalytics, buildStudentContext } from "./services/analytics-engine";
import { chapterActivity, createMistakeRevision, eventRecord, markAttemptWithRevision, scheduleChapterRevision } from "./services/study-engine";
import { addStudyDay, loadState, saveState, subjectStats, totalStudyMinutes, uid, type AppState, type Attempt, type DailyTask, type Flashcard, type Lecture, type Note, type RevisionItem, type TestRecord } from "./store";

type PageKey = typeof PAGE_ITEMS[number][1];
type FocusMode = "Lecture" | "Practice" | "Revision" | "Reading" | "Mock test";
type FocusData = { elapsed:number; startedAt:number|null; running:boolean; mode:FocusMode; subjectId:string };
type ChatAttachment = { name:string; mimeType:string; previewUrl?:string };
type ChatMessage = { role:"assistant"|"user"; text:string; attachments?:ChatAttachment[] };
type PendingChatFile = { file:File; previewUrl?:string };
const FOCUS_KEY = "achiever-focus-session-v1";
const today = () => {const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate()+1); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); };
const fmt = (n:number) => { const h=Math.floor(n/3600), m=Math.floor(n%3600/60), s=Math.floor(n%60); return (h?String(h).padStart(2,"0")+":":"")+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0"); };
const dateLabel = (v:string) => new Date(v+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
const fileToDataUrl = (file:File) => new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>typeof reader.result==="string"?resolve(reader.result):reject(new Error("Could not read file"));reader.onerror=()=>reject(new Error("Could not read file"));reader.readAsDataURL(file);});
const getFocus = ():FocusData => { try { const v=JSON.parse(localStorage.getItem(FOCUS_KEY)||"null"); if(!v) return {elapsed:0,startedAt:null,running:false,mode:"Practice",subjectId:"physics"}; const recoveredElapsed=Number(v.elapsed||0)+(v.running&&v.startedAt?Math.max(0,Math.floor((Date.now()-v.startedAt)/1000)):0); return {...v,elapsed:recoveredElapsed,running:false,startedAt:null}; } catch { return {elapsed:0,startedAt:null,running:false,mode:"Practice",subjectId:"physics"}; } };
const pageInfo:Record<PageKey,{title:string;sub:string}> = {
 dashboard:{title:"Dashboard",sub:"Your preparation, progress and next steps — all in one place."},
 planner:{title:"Study Planner",sub:"Turn preparation goals into scheduled daily actions and measurable follow-through."},
 roadmap:{title:"Roadmap",sub:"Turn the syllabus into clear, measurable chapter milestones."},
 focus:{title:"AI Focus",sub:"Build consistency with focused study sessions and a reliable timer."},
 lectures:{title:"Lecture Tracker",sub:"Track lectures, learning time and chapter coverage."},
 pyq:{title:"PYQ Execution Tracker",sub:"Record attempts, understand mistakes and improve accuracy."},
 questions:{title:"Question Bank",sub:"Practise sample questions by subject and chapter."},
 mocks:{title:"Mock Tests",sub:"Attempt timed practice sets and review your performance."},
 performance:{title:"Test Performance",sub:"Track scores, accuracy, question selection and improvement."},
 revision:{title:"Revision",sub:"Keep important concepts active with a practical revision queue."},
 notebook:{title:"Digital Notebook",sub:"Capture formulas, explanations, short notes and important ideas."},
 health:{title:"Health Tracker",sub:"Protect energy, sleep and sustainable study habits."},
 mentor:{title:"AI Mentor",sub:"Ask doubts and get study guidance grounded in your preparation data."},
 analytics:{title:"AI Analytics",sub:"Find patterns in study time, practice accuracy and chapter mastery."},
 strategy:{title:"Strategy & Tips",sub:"Use exam-aware guidance to make preparation more effective."},
 settings:{title:"Settings",sub:"Manage your profile and personal study data."}
};
const subjectLabel = (exam:ExamKey,id:string) => CURRICULA[exam].find(x=>x.id===id)?.name || id;
const chaptersFor = (exam:ExamKey,id:string) => CURRICULA[exam].find(x=>x.id===id)?.chapters || [];
function Button(p:{children:React.ReactNode;onClick?:()=>void;variant?:"primary"|"secondary"|"ghost"|"danger"|"hero";type?:"button"|"submit";disabled?:boolean;className?:string}) {
 return <button type={p.type||"button"} disabled={p.disabled} onClick={p.onClick} className={"btn btn-"+(p.variant||"primary")+" "+(p.className||"")}>{p.children}</button>;
}
function Card(p:{children:React.ReactNode;className?:string}) { return <section className={"card "+(p.className||"")}>{p.children}</section>; }
function Pill(p:{children:React.ReactNode;tone?:string}) { return <span className={"pill "+(p.tone||"slate")}>{p.children}</span>; }
function Progress(p:{value:number;color?:string}) { return <div className="progress"><span style={{width:Math.max(0,Math.min(100,p.value))+"%",background:p.color||"#5652df"}}/></div>; }
function Stat(p:{label:string;value:string|number;detail:string;icon:React.ElementType;tone?:string}) {
 const Icon=p.icon;
 return <Card className="stat-card"><div className="stat-head"><span>{p.label}</span><i className={"stat-icon "+(p.tone||"") }><Icon size={18}/></i></div><strong>{p.value}</strong><small>{p.detail}</small></Card>;
}
function Empty(p:{title:string;detail:string}) { return <div className="empty"><BookOpen size={25}/><b>{p.title}</b><span>{p.detail}</span></div>; }

export default function App() {
 const [state,setState] = useState<AppState>(()=>loadState());
 const [page,setPage] = useState<PageKey>(()=>{ const p=location.hash.replace("#/","") as PageKey; return PAGE_ITEMS.some(x=>x[1]===p)?p:"dashboard"; });
 const [mobileNav,setMobileNav] = useState(false);
 const [onboarding,setOnboarding] = useState(()=>!localStorage.getItem("achiever-onboarded"));
 const [focus,setFocus] = useState<FocusData>(()=>getFocus());
 const [seconds,setSeconds] = useState(()=>focus.elapsed);
 const [toast,setToast] = useState("");
 const [jarvis,setJarvis] = useState(false);
 const [mentorInput,setMentorInput] = useState("");
 const [mentorBusy,setMentorBusy] = useState(false);
 const [messages,setMessages] = useState<ChatMessage[]>([{role:"assistant",text:"Namaste! I’m your ACHIEVER study mentor. Ask a concept doubt, share a question, or attach a question image or PDF for help."}]);
 const subjects = CURRICULA[state.profile.exam];
 const stats = useMemo(()=>subjectStats(state),[state]);
 const analytics30 = useMemo(()=>buildAnalytics(state,30),[state]);
 const chapterTotal = stats.reduce((n,x)=>n+x.total,0);
 const chapterDone = stats.reduce((n,x)=>n+x.complete,0);
 const syllabusPct = chapterTotal ? Math.round(chapterDone/chapterTotal*100) : 0;
 const recorded = state.attempts.filter(x=>x.result!=="skipped");
 const accuracy = recorded.length ? Math.round(recorded.filter(x=>x.result==="correct").length/recorded.length*100) : 0;
 const studyMinutes = totalStudyMinutes(state);
 const completedLectures = state.lectures.filter(x=>x.completed).length;
 const weakest = analytics30.weakest;
 const update = (fn:(s:AppState)=>AppState) => setState(s=>fn(s));
 const notify = (text:string) => setToast(text);
 useEffect(()=>saveState(state),[state]);
 useEffect(()=>{ location.hash="/"+page; },[page]);
 useEffect(()=>{ localStorage.setItem(FOCUS_KEY,JSON.stringify(focus)); },[focus]);
 useEffect(()=>{
  if(!focus.running || focus.startedAt===null) return;
  const tick=()=>setSeconds(focus.elapsed+Math.max(0,Math.floor((Date.now()-focus.startedAt!)/1000)));
  tick(); const t=window.setInterval(tick,1000); return ()=>window.clearInterval(t);
 },[focus]);
 useEffect(()=>{ if(!toast)return; const t=window.setTimeout(()=>setToast(""),2800); return ()=>window.clearTimeout(t); },[toast]);
 const navigate=(p:PageKey)=>{setPage(p);setMobileNav(false);window.scrollTo({top:0,behavior:"smooth"});};
 const markChapter=(subjectId:string,chapter:string)=>update(s=>{
  const key=subjectId+"::"+chapter;const completing=!s.completedChapters.includes(key);
  const completedChapters=completing?s.completedChapters.concat(key):s.completedChapters.filter(x=>x!==key);
  const existingOpen=s.revisions.some(x=>x.subjectId===subjectId&&x.chapter===chapter&&!x.done);
  const revisions=completing&&!existingOpen?[...scheduleChapterRevision(subjectId,chapter),...s.revisions]:s.revisions;
  const event=eventRecord("chapter_completed",(completing?"Marked complete: ":"Reopened: ")+chapter,{subjectId,chapter});
  return {...s,completedChapters,revisions,events:[event,...s.events]};
 });
 const recordAttempt=(q:PracticeQuestion,result:"correct"|"incorrect",elapsed=45)=>update(s=>{
  const a:Attempt={id:uid(),questionId:q.id,subjectId:q.subjectId,chapter:q.chapter,result,difficulty:q.difficulty,seconds:elapsed,date:today(),
   mistake:result==="incorrect"?"Review the concept and solution":undefined,mistakeCategory:result==="incorrect"?"Unclassified":undefined,
   attemptType:q.sourceType==="verified-pyq"?"PYQ":"Practice",examTrack:s.profile.examTrack,examYear:q.year,sourceLabel:q.sourceLabel||"Illustrative practice"};
  return addStudyDay(markAttemptWithRevision(s,a));
 });
 const recordManualAttempt=(v:Omit<Attempt,"id"|"date">)=>update(s=>{
  const a:Attempt={...v,id:uid(),date:today(),examTrack:v.examTrack||s.profile.examTrack};
  return addStudyDay(markAttemptWithRevision(s,a));
 });
 const addLecture=(v:Omit<Lecture,"id"|"date">)=>update(s=>{
  const lecture={...v,id:uid(),date:today()};
  return {...s,lectures:[lecture,...s.lectures],events:[eventRecord("lecture_added","Added lecture: "+lecture.title,{subjectId:lecture.subjectId,chapter:lecture.chapter,refId:lecture.id}),...s.events]};
 });
 const toggleLecture=(id:string)=>update(s=>{
  const lectures=s.lectures.map(x=>x.id===id?{...x,completed:!x.completed}:x);
  const lecture=lectures.find(x=>x.id===id);
  const events=lecture?.completed?[eventRecord("lecture_completed","Completed lecture: "+lecture.title,{subjectId:lecture.subjectId,chapter:lecture.chapter,refId:id}),...s.events]:s.events;
  return {...s,lectures,events};
 });
 const addRevision=(v:{title:string;subjectId:string;chapter:string;dueDate:string})=>update(s=>({...s,revisions:[{...v,id:uid(),done:false,source:"manual"},...s.revisions]}));
 const saveNote=(v:Omit<Note,"id"|"updatedAt">,id?:string)=>update(s=>({...s,notes:id?s.notes.map(n=>n.id===id?{...n,...v,updatedAt:new Date().toISOString()}:n):[{...v,id:uid(),updatedAt:new Date().toISOString()},...s.notes]}));
 const addDailyTask=(v:Omit<DailyTask,"id"|"done"|"source">)=>update(s=>({...s,dailyTasks:[{...v,id:uid(),done:false,source:"manual"},...s.dailyTasks]}));
 const toggleDailyTask=(id:string)=>update(s=>({...s,dailyTasks:s.dailyTasks.map(x=>x.id===id?{...x,done:!x.done}:x)}));
 const addFlashcard=(v:Omit<Flashcard,"id"|"createdAt">)=>update(s=>({...s,flashcards:[{...v,id:uid(),createdAt:new Date().toISOString()},...s.flashcards]}));
 const reviewFlashcard=(id:string,remembered:boolean)=>update(s=>({...s,flashcards:s.flashcards.map(card=>{
  if(card.id!==id)return card;
  const repetitions=remembered?(card.repetitions||0)+1:0;
  const intervalDays=remembered?((card.intervalDays||0)===0?1:(card.intervalDays||1)===1?3:Math.max(4,Math.round((card.intervalDays||3)*2.5))):1;
  const due=new Date();due.setDate(due.getDate()+intervalDays);
  return {...card,repetitions,intervalDays,ease:Math.max(1.3,Math.min(2.8,(card.ease||2.5)+(remembered?0.1:-0.2))),dueAt:due.toISOString().slice(0,10)};
 })}));
 const toggleBookmark=(questionId:string)=>update(s=>({...s,bookmarkedQuestionIds:s.bookmarkedQuestionIds.includes(questionId)?s.bookmarkedQuestionIds.filter(x=>x!==questionId):[...s.bookmarkedQuestionIds,questionId]}));
 const importQuestionFile=async(file:File)=>{
  try{
   const raw=JSON.parse(await file.text());const rows=Array.isArray(raw)?raw:raw.questions;
   if(!Array.isArray(rows))throw new Error("Expected a JSON array or an object with a questions array.");
   const allowedSubjects=CURRICULA[state.profile.exam].map(x=>x.id);
   const valid:PracticeQuestion[]=rows.filter((q:any)=>q&&typeof q.prompt==="string"&&typeof q.chapter==="string"&&allowedSubjects.includes(q.subjectId)&&Array.isArray(q.options)&&q.options.length>=2&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length)
    .map((q:any,i:number)=>({...q,id:String(q.id||"import-"+uid()+"-"+i),year:String(q.year||state.profile.targetYear),difficulty:["Easy","Moderate","Hard"].includes(q.difficulty)?q.difficulty:"Moderate",kind:q.kind==="Numerical"?"Numerical":"MCQ",sourceType:"custom" as const,examTrack:state.profile.examTrack,sourceLabel:String(q.sourceLabel||q.source||"Student import — source not independently verified")}));
   if(!valid.length)throw new Error("No valid questions found. Check subjectId, chapter, prompt, options and answer fields.");
   update(s=>({...s,customQuestions:[...valid,...s.customQuestions]}));notify(valid.length+" custom questions imported. Their sources remain student-labelled and unverified.");
  }catch(e){notify(e instanceof Error?"Import failed: "+e.message:"Question import failed.");}
 };
 const startFocus=()=>setFocus(f=>({...f,startedAt:Date.now(),running:true}));
 const pauseFocus=()=>setFocus(f=>({...f,elapsed:seconds,startedAt:null,running:false}));
 const finishFocus=()=>{
  if(seconds>=60){
   const startedAt=focus.startedAt?new Date(focus.startedAt).toISOString():undefined;
   const session={id:uid(),date:today(),minutes:Math.max(1,Math.round(seconds/60)),mode:focus.mode,subjectId:focus.subjectId,
    origin:"manual" as const,verificationStatus:"unverified" as const,startedAt,endedAt:new Date().toISOString()};
   update(s=>addStudyDay({...s,sessions:[session,...s.sessions],events:[eventRecord("focus_session_saved","Saved "+focus.mode.toLowerCase()+" focus session",{subjectId:focus.subjectId,refId:session.id}),...s.events]}));
  }
  setFocus(f=>({...f,elapsed:0,startedAt:null,running:false}));setSeconds(0);
  notify(seconds>=60?"Focus session saved as manual, unverified study time.":"Session under one minute was not added to study totals.");
 };
 const coachContext=()=>buildStudentContext(state);
 const localCoach=(message:string)=>{
  const m=message.toLowerCase();
  if(m.includes("today")||m.includes("plan")||m.includes("study")){
   const todays=state.dailyTasks.filter(x=>x.date===today()&&!x.done);
   return "Today's preparation summary:\n"+(todays.length? "Your pending scheduled tasks are: "+todays.slice(0,4).map(x=>x.title).join("; ")+".":"You have not scheduled any tasks for today yet.")+
    "\nYou have a "+state.profile.dailyHours+" hour daily target. Add a plan in Study Planner, then use AI Focus to record each study block. Current manual syllabus completion is "+syllabusPct+"%.";
  }
  if(m.includes("weak")||m.includes("improve")||m.includes("accuracy")){
   return weakest?"Based on "+weakest.attempts+" counted attempts, "+weakest.name+" is currently your lowest sampled subject at "+weakest.accuracy+"% accuracy. Review its wrong answers and retry a short timed set.":"There is not enough evidence to identify a reliable weak subject. ACHIEVER waits for at least five counted attempts in a subject before highlighting it.";
  }
  if(m.includes("progress")||m.includes("syllabus")){
   return "You have manually marked "+chapterDone+" of "+chapterTotal+" starter-map chapters complete ("+syllabusPct+"%). The roadmap also displays lecture, practice and revision activity separately. Confirm the chapter list against the official "+state.profile.examTrack+" syllabus.";
  }
  return "I can help with "+formatExamTrack(state.profile.examTrack)+" concepts, daily planning, revision and performance analysis. The workspace has "+state.attempts.length+" logged attempts, "+state.tests.length+" submitted tests and "+studyMinutes+" focus minutes. Connect an authenticated server-side AI deployment for model-powered tutoring.";
 };
 const askMentor=async(message:string,files:PendingChatFile[] = [])=>{
  if(!message.trim()&&!files.length)return;
  const prompt=message.trim()||"Please inspect the attached question or study document and explain it step by step.";
  setMessages(m=>m.concat({role:"user",text:prompt,attachments:files.map(x=>({name:x.file.name,mimeType:x.file.type,previewUrl:x.previewUrl}))}));setMentorInput("");setMentorBusy(true);
  try{
   const attachments=await Promise.all(files.map(async x=>({name:x.file.name,mimeType:x.file.type,dataUrl:await fileToDataUrl(x.file)})));
   const r=await fetch("/api/mentor",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({message:prompt,context:coachContext(),attachments})});
   const d=await r.json();
   const fallback=localCoach(prompt)+(files.length?"\n\nThe selected attachment could not be analysed because live AI is not configured. Configure the server-side AI provider to enable image and PDF question solving.":"");
   setMessages(m=>m.concat({role:"assistant",text:r.ok&&d.reply?d.reply:fallback+(d.error?"\n\nLive AI unavailable: "+d.error:"")}));
  }catch{setMessages(m=>m.concat({role:"assistant",text:localCoach(prompt)+(files.length?"\n\nThe attachment could not be sent. Check its size and try again.":"")}));}
  finally{setMentorBusy(false);}
 };
 const askJarvis=async(message:string)=>{
  try{
   const response=await fetch("/api/mentor",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({message,context:coachContext()})});
   const data=await response.json();
   if(response.ok&&data.reply)return String(data.reply);
  }catch{/* Use the local mentor fallback below when the server is unavailable. */}
  return localCoach(message);
 };
 const pageBody=()=>{
  switch(page){
   case "dashboard":return <Dashboard state={state} stats={stats} syllabusPct={syllabusPct} accuracy={accuracy} studyMinutes={studyMinutes} completedLectures={completedLectures} due={state.revisions.filter(x=>!x.done&&x.dueDate<=today()).length} go={navigate} toggleTask={toggleDailyTask}/>;
   case "planner":return <StudyPlanner state={state} addTask={addDailyTask} toggleTask={toggleDailyTask}/>;
   case "roadmap":return <Roadmap state={state} markChapter={markChapter} addRevision={addRevision}/>;
   case "focus":return <FocusPage state={state} focus={focus} seconds={seconds} setFocus={setFocus} start={startFocus} pause={pauseFocus} finish={finishFocus}/>;
   case "lectures":return <Lectures state={state} addLecture={addLecture} toggleLecture={toggleLecture}/>;
   case "pyq":return <PYQPage state={state} addAttempt={recordManualAttempt}/>;
   case "questions":return <QuestionBank state={state} record={recordAttempt} toggleBookmark={toggleBookmark} onImport={importQuestionFile}/>;
   case "mocks":return <MockTests state={state} saveTest={(t,attempts)=>update(s=>{let next={...s,tests:[t,...s.tests]};for(const a of attempts)next=markAttemptWithRevision(next,a);return addStudyDay(next);})}/>;
   case "performance":return <Performance state={state}/>;
   case "revision":return <Revision state={state} addRevision={addRevision} update={update}/>;
   case "notebook":return <Notebook state={state} saveNote={saveNote} addFlashcard={addFlashcard} reviewFlashcard={reviewFlashcard} addRevision={addRevision}/>;
   case "health":return <Health state={state} update={update}/>;
   case "mentor":return <Mentor messages={messages} input={mentorInput} setInput={setMentorInput} send={askMentor} busy={mentorBusy}/>;
   case "analytics":return <Analytics state={state} stats={stats} syllabusPct={syllabusPct} accuracy={accuracy} studyMinutes={studyMinutes} analytics={analytics30}/>;
   case "strategy":return <Strategy state={state} stats={stats}/>;
   case "settings":return <SettingsPage state={state} update={update} notify={notify}/>;
  }
 };
 const completeOnboarding=(profile:AppState["profile"])=>{update(s=>({...s,profile}));localStorage.setItem("achiever-onboarded","yes");setOnboarding(false);notify("Your ACHIEVER workspace is ready.");};
 return <div className="app-shell">
  <aside className={"sidebar "+(mobileNav?"open":"")}>
   <div className="brand"><img src="./achiever-logo.svg" alt="ACHIEVER — AI Learning & Intelligence"/><button className="mobile-close" onClick={()=>setMobileNav(false)}><X size={18}/></button></div>
   <nav className="navigation">{PAGE_ITEMS.map(([label,key])=><button key={key} className={"nav-item "+(page===key?"active":"")} onClick={()=>navigate(key)}><NavIcon name={key}/><span>{label}</span>{key==="focus"&&focus.running?<em>{fmt(seconds)}</em>:null}</button>)}</nav>
   <div className="sidebar-bottom">
    <div className="institute-mark"><div><GraduationCap size={30}/><b>{state.profile.exam==="JEE"?"IIT":"AIIMS"}</b></div></div>
    <div className="goal-count"><div><span>{state.profile.exam==="JEE"?"JEE Main Session 1": "NEET UG"} {state.profile.targetYear}</span><Pill tone="blue">{state.profile.examDate?Math.max(0,Math.ceil((new Date(state.profile.examDate+"T00:00:00").getTime()-Date.now())/86400000))+" Days":(state.profile.examTrack==="jee-advanced"?"23 May 2027":state.profile.examTrack==="jee-main"?"Jan 2027":"May 2027")}</Pill></div><Progress value={state.profile.examDate?Math.max(0,Math.min(100,100-Math.max(0,(new Date(state.profile.examDate+"T00:00:00").getTime()-Date.now())/86400000)/365*100)):0}/></div>
    <div className="target-box"><small>TARGET</small><b><Star size={16} fill="currentColor"/> {state.profile.target}</b><span>{state.profile.targetCollege}</span></div>
    <button className="profile-button" onClick={()=>navigate("settings")}><i>{state.profile.name.slice(0,1).toUpperCase()}</i><span><b>{state.profile.name}</b><small>{state.profile.exam} • {state.profile.classLevel}</small></span><Settings size={15}/></button>
   </div>
  </aside>
  <div className={"mobile-scrim "+(mobileNav?"visible":"")} onClick={()=>setMobileNav(false)}/>
  <main className="main-panel">
   <header className="mobile-header"><button onClick={()=>setMobileNav(true)}><Menu/></button><img src="./achiever-logo.svg" alt="ACHIEVER"/><span>{state.profile.exam}</span></header>
   <div className="page-scroll"><div className="page-container">
    <div className="page-heading"><div><h1>{pageInfo[page].title}</h1><p>{pageInfo[page].sub}</p></div><div className="heading-actions"><Pill tone="green"><i className="live-dot"/> {state.profile.exam} {state.profile.targetYear}</Pill><button className="icon-button" title="Open AI Mentor" onClick={()=>navigate("mentor")}><Brain size={18}/></button></div></div>
    {pageBody()}
   </div></div>
  </main>
  <button className="jarvis-fab" aria-label="Open JARVIS voice assistant" onClick={()=>setJarvis(true)}><Mic size={22}/></button>
  {jarvis&&<Jarvis state={state} onClose={()=>setJarvis(false)} onNavigate={navigate} onAsk={askJarvis}/>}
  {onboarding&&<Onboarding state={state} onDone={completeOnboarding}/>}
  {toast&&<div className="toast"><CheckCircle2 size={16}/>{toast}</div>}
 </div>;
}

function NavIcon({name}:{name:string}){
 const props={size:18,strokeWidth:1.9};
 const icons:Record<string,React.ReactNode>={dashboard:<LayoutDashboard {...props}/>,planner:<CalendarDays {...props}/>,roadmap:<Target {...props}/>,focus:<Eye {...props}/>,lectures:<BookOpen {...props}/>,pyq:<ListChecks {...props}/>,questions:<BookOpen {...props}/>,mocks:<Timer {...props}/>,performance:<BarChart3 {...props}/>,revision:<RefreshCw {...props}/>,notebook:<FileText {...props}/>,health:<Heart {...props}/>,mentor:<Brain {...props}/>,analytics:<TrendingUp {...props}/>,strategy:<Lightbulb {...props}/>,settings:<Settings {...props}/>};
 return <i className="nav-icon">{icons[name]}</i>;
}
function Onboarding({state,onDone}:{state:AppState;onDone:(p:AppState["profile"])=>void}){
 const [name,setName]=useState(state.profile.name==="Student"?"":state.profile.name);
 const [exam,setExam]=useState<ExamKey>(state.profile.exam);
 const [level,setLevel]=useState(state.profile.classLevel);
 const [target,setTarget]=useState(state.profile.target);
 const [targetRank,setTargetRank]=useState(state.profile.targetRank);
 const [college,setCollege]=useState(state.profile.targetCollege);
 const [branch,setBranch]=useState(state.profile.targetBranch);
 const [hours,setHours]=useState(state.profile.dailyHours);
 const [mode,setMode]=useState(state.profile.preparationMode);
 const [medium,setMedium]=useState(state.profile.learningMedium);
 const [status,setStatus]=useState(state.profile.currentStatus);
 const [track,setTrack]=useState<ExamTrack>(state.profile.examTrack);
 const [includeAdvanced,setIncludeAdvanced]=useState(state.profile.selectedExams.includes("jee-advanced"));
 useEffect(()=>{setTrack(exam==="NEET"?"neet-ug":"jee-main");},[exam]);
 const selectedExams:ExamTrack[]=exam==="NEET"?["neet-ug"]:includeAdvanced?["jee-main","jee-advanced"]:["jee-main"];
 return <div className="modal-backdrop"><div className="modal onboarding"><img src="./achiever-logo.svg" alt="ACHIEVER"/><Pill tone="blue">PERSONALIZE YOUR PREPARATION</Pill><h2>Welcome to ACHIEVER</h2><p>Set up your student workspace. Your profile and goals can be changed later.</p>
  <label>Student name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Enter your name"/></label>
  <label>Target examination<select value={exam} onChange={e=>setExam(e.target.value as ExamKey)}><option value="JEE">JEE Main / Advanced</option><option value="NEET">NEET UG</option></select></label>
  {exam==="JEE"&&<label className="inline-check"><input type="checkbox" checked={includeAdvanced} onChange={e=>setIncludeAdvanced(e.target.checked)}/> Prepare for JEE Advanced as well as JEE Main</label>}
  <div className="form-grid"><label>Current class<select value={level} onChange={e=>setLevel(e.target.value)}><option>Class 11</option><option>Class 12</option><option>Dropper</option><option>Other</option></select></label><label>Daily study target<select value={hours} onChange={e=>setHours(Number(e.target.value))}>{[4,5,6,7,8,9,10,11,12].map(x=><option key={x} value={x}>{x} hours</option>)}</select></label></div>
  <div className="form-grid"><label>Preparation mode<select value={mode} onChange={e=>setMode(e.target.value as AppState["profile"]["preparationMode"])}><option>Self-study</option><option>Coaching</option><option>Hybrid</option></select></label><label>Learning medium<select value={medium} onChange={e=>setMedium(e.target.value as AppState["profile"]["learningMedium"])}><option>English</option><option>Hindi</option><option>Bilingual</option></select></label></div>
  <div className="form-grid"><label>Target / score goal<input value={target} onChange={e=>setTarget(e.target.value)} placeholder="e.g. 99 percentile / 650+"/></label><label>Target rank<input value={targetRank} onChange={e=>setTargetRank(e.target.value)} placeholder="e.g. Under 1000"/></label></div>
  <div className="form-grid"><label>Target college<input value={college} onChange={e=>setCollege(e.target.value)} placeholder="IIT Bombay / AIIMS Delhi"/></label><label>Target branch / course<input value={branch} onChange={e=>setBranch(e.target.value)} placeholder="Computer Science / MBBS"/></label></div>
  <label>Current preparation stage<select value={status} onChange={e=>setStatus(e.target.value as AppState["profile"]["currentStatus"])}><option>Starting</option><option>In progress</option><option>Revision</option><option>Mock-test phase</option></select></label>
  <Button onClick={()=>onDone({...state.profile,name:name.trim()||"Student",exam,examTrack:track,selectedExams,targetYear:"2027",classLevel:level,target,targetRank,targetCollege:college,targetBranch:branch,dailyHours:hours,examDate:"",preparationMode:mode,learningMedium:medium,currentStatus:status})}>Create my workspace <ArrowRight size={16}/></Button>
  <small className="muted">Current study records remain on this browser. Cloud accounts and cross-device sync are not connected yet.</small>
 </div></div>;
}

function Dashboard({state,stats,syllabusPct,accuracy,studyMinutes,completedLectures,due,go,toggleTask}:{state:AppState;stats:ReturnType<typeof subjectStats>;syllabusPct:number;accuracy:number;studyMinutes:number;completedLectures:number;due:number;go:(p:PageKey)=>void;toggleTask:(id:string)=>void}){
 const todayTasks=state.dailyTasks.filter(x=>x.date===today()).sort((a,b)=>Number(a.done)-Number(b.done));
 const recommendations=state.profile.exam==="JEE"?["Physics concept block + 20 problems","Chemistry concept / NCERT review","Mathematics timed practice + error review"]:["Physics numericals + formula recall","Chemistry NCERT revision + MCQs","Biology active recall + diagrams"];
 const sampled=stats.filter(x=>x.attempts>=5).sort((a,b)=>a.accuracy-b.accuracy)[0];
 const days=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));const key=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");return {label:d.toLocaleDateString("en-IN",{weekday:"short"}),minutes:state.sessions.filter(s=>s.date===key).reduce((n,s)=>n+s.minutes,0)};});
 const max=Math.max(1,...days.map(x=>x.minutes));
 return <div className="page-stack">
  <div className="hero-banner"><div className="hero-copy"><Pill tone="hero">YOUR PREPARATION HQ</Pill><h2>Hello, {state.profile.name}! 👋</h2><p>You are preparing for <b>{formatExamTrack(state.profile.examTrack)} {state.profile.targetYear}</b>. Learn deliberately, practise consistently and improve from every test.</p><div className="hero-actions"><Button onClick={()=>go("focus")}><Play size={15}/> Start focused study</Button><Button variant="hero" onClick={()=>go("planner")}>Plan my day <ArrowRight size={15}/></Button></div></div><div className="streak-box"><Flame size={25}/><b>{state.streak}</b><span>Day streak</span></div><div className="hero-glow"/></div>
  <div className="stats-grid"><Stat label="SYLLABUS COMPLETION" value={syllabusPct+"%"} detail={stats.reduce((n,x)=>n+x.complete,0)+" manually completed chapters"} icon={GraduationCap}/><Stat label="TOTAL STUDY TIME" value={(studyMinutes/60).toFixed(1)+"h"} detail={state.sessions.filter(x=>x.origin==="verified"&&x.verificationStatus==="verified").reduce((n,x)=>n+x.minutes,0)+" verified minutes; remaining manual"} icon={Clock3} tone="green"/><Stat label="QUESTION ACCURACY" value={accuracy+"%"} detail={state.attempts.length+" recorded attempts"} icon={Target} tone="amber"/><Stat label="LECTURES COMPLETED" value={completedLectures} detail={state.lectures.length+" learning records"} icon={BookOpen} tone="purple"/></div>
  <div className="two-col">
   <Card><div className="card-head"><div><small>DAILY EXECUTION</small><h3>Today's study plan</h3></div><Pill tone="blue">{state.profile.dailyHours}h target</Pill></div>
    {todayTasks.length?todayTasks.map(task=><div className="plan-row" key={task.id}><button className={"check-button "+(task.done?"checked":"")} onClick={()=>toggleTask(task.id)}>{task.done?<Check size={14}/>:null}</button><span><b className={task.done?"task-done":""}>{task.title}</b><small>{task.subjectId?subjectLabel(state.profile.exam,task.subjectId):task.taskType} • {task.estimatedMinutes} min</small></span><Pill tone={task.done?"green":"blue"}>{task.done?"Done":task.taskType}</Pill></div>)
    :<><div className="notice"><CalendarDays size={16}/> No tasks scheduled for today yet. These are suggested starting blocks, not assigned tasks.</div>{recommendations.map((x,i)=><div className="plan-row" key={x}><i>0{i+1}</i><span><b>{x}</b><small>{["Concept clarity","Retention and understanding","Timed application"][i]}</small></span><Pill>{["Priority","Core","Practice"][i]}</Pill></div>)}</>}
    <div className="card-foot"><button className="text-link" onClick={()=>go("planner")}>Open Study Planner <ArrowRight size={14}/></button><span>{todayTasks.filter(x=>x.done).length}/{todayTasks.length} tasks complete • {due} revisions due</span></div></Card>
   <Card><div className="card-head"><div><small>PERSONALIZED INSIGHT</small><h3>What needs attention?</h3></div><Sparkles color="#9165d5"/></div>
    <div className="insight"><Lightbulb size={20}/><div><b>{sampled?sampled.name:"Build a reliable baseline"}</b><p>{sampled?"Based on "+sampled.attempts+" counted attempts, "+sampled.name+" has "+sampled.accuracy+"% recorded accuracy. Review incorrect answers and reattempt a short timed set.":"ACHIEVER will only highlight a weak subject after at least five counted attempts in that subject. Log actual results to avoid misleading recommendations."}</p></div></div>
    <div className="metric"><span>Pending revision tasks</span><b>{state.revisions.filter(x=>!x.done).length}</b></div><div className="metric"><span>Upcoming scheduled tasks</span><b>{state.dailyTasks.filter(x=>!x.done&&x.date>today()).length}</b></div><button className="text-link" onClick={()=>go("analytics")}>Explore learning analytics <ArrowRight size={14}/></button></Card>
  </div>
  <div className="two-col"><Card><div className="card-head"><div><small>LAST 7 DAYS</small><h3>Study consistency</h3></div><Pill tone="green">Saved focus logs</Pill></div><div className="bar-chart">{days.map(d=><div className="bar-column" key={d.label}><small>{d.minutes?Math.round(d.minutes/6)/10+"h":""}</small><div className="bar-rail"><i style={{height:Math.max(3,d.minutes/max*100)+"%"}}/></div><span>{d.label}</span></div>)}</div></Card>
   <Card><div className="card-head"><div><small>SUBJECT COVERAGE</small><h3>Chapter progress</h3></div><button className="text-link" onClick={()=>go("roadmap")}>View all</button></div>{stats.map(s=><div className="subject-progress" key={s.id}><div><i style={{background:s.color}}/><b>{s.name}</b><span>{s.progress}%</span></div><Progress value={s.progress} color={s.color}/></div>)}</Card></div>
  <Card><div className="card-head"><div><small>QUICK ACCESS</small><h3>Keep your preparation moving</h3></div></div><div className="quick-grid">{[{t:"Practise questions",d:"Chapter-wise question practice",i:BookOpen,p:"questions" as PageKey},{t:"Attempt a mock",d:"Try a timed practice set",i:Timer,p:"mocks" as PageKey},{t:"Revise mistakes",d:"Review incorrect questions",i:RefreshCw,p:"revision" as PageKey},{t:"Ask AI Mentor",d:"Get concept and preparation guidance",i:Brain,p:"mentor" as PageKey}].map(x=><button className="quick-card" key={x.t} onClick={()=>go(x.p)}><i><x.i size={18}/></i><b>{x.t}</b><small>{x.d}</small><ArrowRight size={15}/></button>)}</div></Card>
  <small className="disclaimer">Syllabus and practice content are a starter framework. Confirm exam coverage against the latest official documents. Analytics are based on records saved in this workspace.</small>
 </div>;
}

function Roadmap({state,markChapter,addRevision}:{state:AppState;markChapter:(s:string,c:string)=>void;addRevision:(v:{title:string;subjectId:string;chapter:string;dueDate:string})=>void}){
 const [open,setOpen]=useState(CURRICULA[state.profile.exam][0].id);
 const list=subjectStats(state);
 return <div className="page-stack"><div className="roadmap-banner"><div><small>SYLLABUS ROADMAP</small><h2>Your {formatExamTrack(state.profile.examTrack)} learning map</h2><p>Organized by subject and planning group. Chapter mastery remains student-controlled.</p></div><b>{list.reduce((n,x)=>n+x.complete,0)}<small> / {list.reduce((n,x)=>n+x.total,0)}</small><span>manual chapter completions</span></b></div>
  <div className="notice"><ShieldCheck size={17}/> This is a starter planning map, not a certified complete syllabus. Verify chapter inclusion and topic detail against the official syllabus for the selected examination year. Lecture, question and revision activity are shown separately from a manual mastery declaration.</div>
  {list.map(s=>{
   const map=CHAPTER_GROUPS[state.profile.exam][s.id]||{};
   const groups=Array.from(new Set(s.chapters.map(ch=>map[ch]||"Other")));
   return <Card className="subject-card" key={s.id}>
    <button className="subject-toggle" onClick={()=>setOpen(open===s.id?"":s.id)}><i style={{background:s.color+"19",color:s.color}}><BookOpen size={19}/></i><span><b>{s.name}</b><small>{s.complete} of {s.total} manually completed • {s.lectureCount} lectures • {s.attempts} counted attempts</small><Progress value={s.progress} color={s.color}/></span><strong>{s.progress}%</strong>{open===s.id?<ChevronDown size={18}/>:<ChevronRight size={18}/>}</button>
    {open===s.id&&<div className="chapters">{groups.map(group=><div className="roadmap-group" key={group}><h4>{group}</h4>{s.chapters.filter(ch=>(map[ch]||"Other")===group).map((chapter,i)=>{
     const activity=chapterActivity(state,s.id,chapter);
     return <div className="chapter roadmap-chapter" key={chapter}><small>{String(i+1).padStart(2,"0")}</small><span><b className={activity.manuallyComplete?"done":""}>{chapter}</b><em>{activity.manuallyComplete?"Mastery marked complete":activity.activityPct+"% activity signal • not marked complete"}</em><div className="chapter-metrics"><Pill>{activity.lectures} lectures</Pill><Pill>{activity.attempts} attempts</Pill><Pill tone={activity.attempts&&activity.accuracy>=70?"green":"slate"}>{activity.attempts?activity.accuracy+"% accuracy":"No accuracy yet"}</Pill><Pill>{activity.revisionsDone}/{activity.revisions} revisions</Pill></div></span><button className={"check-button "+(activity.manuallyComplete?"checked":"")} title="Toggle manual mastery status" onClick={()=>markChapter(s.id,chapter)}>{activity.manuallyComplete?<Check size={15}/>:null}</button><button className="mini-button" title="Schedule spaced revision plan" onClick={()=>addRevision({title:"Revise "+chapter,subjectId:s.id,chapter,dueDate:today()})}><RefreshCw size={14}/></button></div>;
    })}</div>)}</div>}
   </Card>;
  })}
 </div>;
}

function StudyPlanner({state,addTask,toggleTask}:{state:AppState;addTask:(v:Omit<DailyTask,"id"|"done"|"source">)=>void;toggleTask:(id:string)=>void}){
 const [date,setDate]=useState(today());const [title,setTitle]=useState("");const [subject,setSubject]=useState(CURRICULA[state.profile.exam][0].id);const [chapter,setChapter]=useState(chaptersFor(state.profile.exam,subject)[0]);const [type,setType]=useState<DailyTask["taskType"]>("Questions");const [minutes,setMinutes]=useState(60);
 useEffect(()=>setChapter(chaptersFor(state.profile.exam,subject)[0]),[subject,state.profile.exam]);
 const tasks=state.dailyTasks.filter(x=>x.date===date).sort((a,b)=>Number(a.done)-Number(b.done));
 const done=tasks.filter(x=>x.done).length;const planned=tasks.reduce((n,x)=>n+x.estimatedMinutes,0);
 const week=Array.from({length:7},(_,i)=>{const d=new Date(date+"T12:00:00");d.setDate(d.getDate()+i);const key=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");return {date:key,label:d.toLocaleDateString("en-IN",{weekday:"short"}),count:state.dailyTasks.filter(x=>x.date===key).length};});
 return <div className="page-stack"><div className="stats-grid three"><Stat label="TASKS ON SELECTED DAY" value={tasks.length} detail={done+" completed"} icon={CalendarDays}/><Stat label="PLANNED STUDY TIME" value={(planned/60).toFixed(1)+"h"} detail="Estimated task duration" icon={Clock3} tone="purple"/><Stat label="EXECUTION RATE" value={tasks.length?Math.round(done/tasks.length*100)+"%":"—"} detail="Completed scheduled tasks" icon={CheckCircle2} tone="green"/></div>
  <div className="two-col"><Card><div className="card-head"><div><small>CREATE A DAILY TASK</small><h3>Plan a preparation block</h3></div><Pill tone="blue">Personal schedule</Pill></div><form className="form-stack" onSubmit={e=>{e.preventDefault();if(!title.trim())return;addTask({title:title.trim(),date,subjectId:subject,chapter,taskType:type,estimatedMinutes:minutes});setTitle("");}}><label>Task date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Task title<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Finish electrostatics lecture 4"/></label><div className="form-grid"><label>Subject<select value={subject} onChange={e=>setSubject(e.target.value)}>{CURRICULA[state.profile.exam].map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Activity type<select value={type} onChange={e=>setType(e.target.value as DailyTask["taskType"])}>{["Lecture","Questions","Revision","Mock test","Reading","Other"].map(x=><option key={x}>{x}</option>)}</select></label></div><label>Chapter / topic<select value={chapter} onChange={e=>setChapter(e.target.value)}>{chaptersFor(state.profile.exam,subject).map(x=><option key={x}>{x}</option>)}</select></label><label>Estimated time (minutes)<input type="number" min="5" max="600" step="5" value={minutes} onChange={e=>setMinutes(Math.max(5,Number(e.target.value)))}/></label><Button type="submit"><Plus size={15}/> Add to plan</Button></form></Card>
   <Card><div className="card-head"><div><small>NEXT SEVEN DAYS</small><h3>Planning calendar</h3></div></div><div className="week-strip">{week.map(d=><button key={d.date} className={date===d.date?"selected":""} onClick={()=>setDate(d.date)}><b>{d.label}</b><small>{new Date(d.date+"T12:00:00").getDate()}</small><i>{d.count} tasks</i></button>)}</div><p className="disclaimer">Select a day to plan or review tasks. Scheduled tasks do not automatically add study hours; only saved focus sessions count as focus time.</p></Card></div>
  <Card><div className="card-head"><div><small>DAILY EXECUTION</small><h3>{dateLabel(date)} task list</h3></div><Pill tone={tasks.length&&done===tasks.length?"green":"blue"}>{done}/{tasks.length} completed</Pill></div>{tasks.length===0?<Empty title="Nothing planned for this date" detail="Add a lecture, question block, revision session or mock-test task above."/>:tasks.map(task=><div className="revision-row" key={task.id}><button className={"check-button "+(task.done?"checked":"")} onClick={()=>toggleTask(task.id)}>{task.done?<Check size={14}/>:null}</button><span><b className={task.done?"task-done":""}>{task.title}</b><small>{task.subjectId?subjectLabel(state.profile.exam,task.subjectId)+" • ":""}{task.chapter||task.taskType} • {task.estimatedMinutes} min</small></span><Pill tone={task.done?"green":"slate"}>{task.done?"Completed":task.taskType}</Pill></div>)}</Card>
 </div>;
}

function FocusPage({state,focus,seconds,setFocus,start,pause,finish}:{state:AppState;focus:FocusData;seconds:number;setFocus:React.Dispatch<React.SetStateAction<FocusData>>;start:()=>void;pause:()=>void;finish:()=>void}){
 const [target,setTarget]=useState(50);const todayMinutes=state.sessions.filter(x=>x.date===today()).reduce((n,x)=>n+x.minutes,0);const pct=Math.min(100,seconds/(target*60)*100);
 return <div className="page-stack"><div className="focus-top"><b><i><Brain size={16}/></i> AI Focus Timer</b><Pill tone={focus.running?"green":"slate"}><i className="live-dot"/> {focus.running?"FOCUS SESSION RUNNING":"READY"}</Pill><span><ShieldCheck size={14}/> Local timer • No video upload</span><label>Session target <select value={target} onChange={e=>setTarget(Number(e.target.value))}>{[25,30,45,50,60,75,90,120].map(n=><option key={n}>{n}</option>)}</select> min</label></div>
 <div className="focus-stats"><Card><small>TODAY'S STUDY TARGET</small><b>{state.profile.dailyHours}h</b><span>Daily focus-time goal</span><Progress value={todayMinutes/(state.profile.dailyHours*60)*100}/></Card><Card><small>TOTAL RECORDED STUDY TIME</small><b className="green-text">{(todayMinutes/60).toFixed(1)}h</b><span>Saved focus sessions today</span></Card><Card><small>REMAINING STUDY TIME TODAY</small><b>{Math.max(0,state.profile.dailyHours*60-todayMinutes)}m</b><span>Based on saved sessions</span></Card></div>
 <div className="focus-layout"><Card className="focus-main"><div className="focus-current"><div><small>CURRENT SESSION</small><h2>{subjectLabel(state.profile.exam,focus.subjectId)}</h2><p>{focus.mode} • Study session</p></div><Pill tone={focus.running?"green":"slate"}>{focus.running?"PRESENT — TIMER RUNNING":focus.elapsed?"PAUSED":"READY"}</Pill></div><div className="timer-display"><small>SESSION TIMER</small><b>{fmt(seconds)}</b><span>{Math.floor(seconds/60)} minutes focused in this session</span></div><Progress value={pct} color="#21c69a"/><div className="form-grid focus-select"><label>SUBJECT<select value={focus.subjectId} disabled={focus.running} onChange={e=>setFocus(f=>({...f,subjectId:e.target.value}))}>{CURRICULA[state.profile.exam].map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>STUDY MODE<select value={focus.mode} disabled={focus.running} onChange={e=>setFocus(f=>({...f,mode:e.target.value as FocusMode}))}>{["Lecture","Practice","Revision","Reading","Mock test"].map(x=><option key={x}>{x}</option>)}</select></label></div><div className="session-goal"><small>SESSION GOAL</small><b>{target} minutes of focused work</b><span>{Math.max(0,target*60-seconds)>0?fmt(Math.max(0,target*60-seconds))+" remaining":"Goal reached — excellent work!"}</span></div><div className="focus-buttons">{!focus.running?<Button onClick={start}><Play size={15}/>{focus.elapsed?"Resume":"Start focus session"}</Button>:<Button variant="secondary" onClick={pause}><Pause size={15}/> Pause</Button>}{(focus.elapsed>0||focus.running)&&<Button variant="danger" onClick={finish}>Finish & save</Button>}</div><p className="disclaimer">This is a manual focus timer. It records time only while running; webcam presence verification is not enabled in this release.</p></Card><Card className="focus-guides"><small>FOCUS GUIDELINES</small><h3>Protect deep work</h3>{[["01","Set one clear task","Choose a chapter, lecture or question set."],["02","Keep distractions away","Silence notifications and keep essential tabs open."],["03","Take a real break","Stand, hydrate and rest your eyes between sessions."]].map(x=><div className="guide-row" key={x[0]}><b>{x[0]}</b><span><strong>{x[1]}</strong><small>{x[2]}</small></span></div>)}<div className="focus-tip"><Sparkles size={17}/> Consistency beats occasional extreme study days.</div></Card></div>
 </div>;
}
function Lectures({state,addLecture,toggleLecture}:{state:AppState;addLecture:(v:Omit<Lecture,"id"|"date">)=>void;toggleLecture:(id:string)=>void}){
 const [subject,setSubject]=useState(CURRICULA[state.profile.exam][0].id);const [chapter,setChapter]=useState(chaptersFor(state.profile.exam,subject)[0]);
 const [topic,setTopic]=useState("");const [title,setTitle]=useState("");const [minutes,setMinutes]=useState(60);const [actual,setActual]=useState(55);
 const [lectureNumber,setLectureNumber]=useState(1);const [teacher,setTeacher]=useState("");const [notes,setNotes]=useState("");
 useEffect(()=>setChapter(chaptersFor(state.profile.exam,subject)[0]),[subject,state.profile.exam]);
 const done=state.lectures.filter(x=>x.completed).length;const time=state.lectures.reduce((n,x)=>n+(x.actualMinutes??x.minutes),0);
 return <div className="page-stack"><div className="stats-grid three"><Stat label="LECTURES LOGGED" value={state.lectures.length} detail="All recorded lessons" icon={BookOpen}/><Stat label="COMPLETED" value={done} detail="Marked as complete" icon={CheckCircle2} tone="green"/><Stat label="ACTUAL LECTURE TIME" value={(time/60).toFixed(1)+"h"} detail="Separate from focus timer totals" icon={Clock3} tone="purple"/></div>
  <div className="two-col"><Card><div className="card-head"><div><small>ADD LECTURE</small><h3>Log a learning session</h3></div><Pill tone="blue">Lecture record</Pill></div>
   <form className="form-stack" onSubmit={e=>{e.preventDefault();addLecture({subjectId:subject,chapter,topic:topic.trim()||undefined,title:title.trim()||topic.trim()||chapter,minutes,actualMinutes:actual,completed:false,lectureNumber,teacherName:teacher.trim()||undefined,notes:notes.trim()||undefined,revisionStatus:"Not scheduled"});setTitle("");setTopic("");setNotes("");}}>
    <label>Subject<select value={subject} onChange={e=>setSubject(e.target.value)}>{CURRICULA[state.profile.exam].map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    <label>Chapter<select value={chapter} onChange={e=>setChapter(e.target.value)}>{chaptersFor(state.profile.exam,subject).map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Topic / subtopic<input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="e.g. Kirchhoff's Current Law"/></label>
    <label>Lecture title<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Lecture 04 — Kirchhoff's laws"/></label>
    <div className="form-grid"><label>Lecture number<input type="number" min="1" value={lectureNumber} onChange={e=>setLectureNumber(Math.max(1,Number(e.target.value)))}/></label><label>Teacher / source<input value={teacher} onChange={e=>setTeacher(e.target.value)} placeholder="Optional"/></label></div>
    <div className="form-grid"><label>Planned duration (minutes)<input type="number" min="1" max="600" value={minutes} onChange={e=>setMinutes(Math.max(1,Number(e.target.value)))}/></label><label>Actual watching time (minutes)<input type="number" min="0" max="600" value={actual} onChange={e=>setActual(Math.max(0,Number(e.target.value)))}/></label></div>
    <label>Learning notes<textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Optional summary, doubt or follow-up task"/></label>
    <Button type="submit"><Plus size={15}/> Add lecture</Button>
   </form>
  </Card><Card><small>LEARNING TIME ACCOUNTING</small><h3>Keep time categories distinct</h3><div className="metric"><span>Actual lecture time</span><b>{(time/60).toFixed(1)}h</b></div><div className="metric"><span>Focus timer time</span><b>{(totalStudyMinutes(state)/60).toFixed(1)}h</b></div><div className="metric"><span>Verified timer time</span><b>{(state.sessions.filter(x=>x.origin==="verified"&&x.verificationStatus==="verified").reduce((n,x)=>n+x.minutes,0)/60).toFixed(1)}h</b></div><p className="disclaimer">Lecture minutes are not added to focus-session totals. This prevents double-counting when a lecture was also completed during a focus timer.</p><ul className="check-list"><li>Use actual watching time rather than only the video duration.</li><li>Mark the lecture complete when you have finished it.</li><li>Use Roadmap to make a separate chapter-mastery decision.</li></ul></Card></div>
  <Card><div className="card-head"><div><small>YOUR RECORDS</small><h3>Lecture history</h3></div></div>{state.lectures.length===0?<Empty title="No lectures logged yet" detail="Add your first lesson above to start building a reliable learning record."/>:<div className="table-wrap"><table><thead><tr><th>Lecture</th><th>Subject / chapter / topic</th><th>Planned</th><th>Actual</th><th>Teacher</th><th>Date</th><th>Status</th></tr></thead><tbody>{state.lectures.map(l=><tr key={l.id}><td><b>{l.title}</b><small>Lecture #{l.lectureNumber||"—"}</small></td><td>{subjectLabel(state.profile.exam,l.subjectId)}<small>{l.chapter}{l.topic?" • "+l.topic:""}</small></td><td>{l.minutes} min</td><td>{l.actualMinutes??l.minutes} min</td><td>{l.teacherName||"—"}</td><td>{dateLabel(l.date)}</td><td><button className={"status-button "+(l.completed?"ok":"")} onClick={()=>toggleLecture(l.id)}>{l.completed?"Completed":"Mark complete"}</button></td></tr>)}</tbody></table></div>}</Card>
 </div>;
}

function PYQPage({state,addAttempt}:{state:AppState;addAttempt:(v:Omit<Attempt,"id"|"date">)=>void}){
 const [subject,setSubject]=useState(CURRICULA[state.profile.exam][0].id);const [chapter,setChapter]=useState(chaptersFor(state.profile.exam,subject)[0]);
 const [topic,setTopic]=useState("");const [result,setResult]=useState<Attempt["result"]>("correct");const [difficulty,setDifficulty]=useState("Moderate");
 const [seconds,setSeconds]=useState(90);const [mistake,setMistake]=useState("Conceptual");const [examYear,setExamYear]=useState(state.profile.targetYear);
 const [session,setSession]=useState("");const [shift,setShift]=useState("");const [selectedAnswer,setSelectedAnswer]=useState("");const [correctAnswer,setCorrectAnswer]=useState("");
 const [confidence,setConfidence]=useState<1|2|3|4|5>(3);const [attemptType,setAttemptType]=useState<Attempt["attemptType"]>("PYQ");
 const [source,setSource]=useState("");const [notes,setNotes]=useState("");
 useEffect(()=>setChapter(chaptersFor(state.profile.exam,subject)[0]),[subject,state.profile.exam]);
 const attempts=state.attempts;const counted=attempts.filter(x=>x.result!=="skipped");const accuracy=counted.length?Math.round(counted.filter(x=>x.result==="correct").length/counted.length*100):0;
 const onSubmit=(e:React.FormEvent)=>{e.preventDefault();addAttempt({questionId:"manual-"+uid(),subjectId:subject,chapter,topic:topic.trim()||undefined,result,difficulty,seconds,
  mistake:result==="incorrect"?(notes.trim()||"Review required"):undefined,mistakeCategory:result==="incorrect"?mistake:undefined,
  examTrack:state.profile.examTrack,examYear,session:session.trim()||undefined,shift:shift.trim()||undefined,
  selectedAnswer:selectedAnswer.trim()||undefined,correctAnswer:correctAnswer.trim()||undefined,confidence,attemptType,
  sourceLabel:source.trim()||"Student-entered practice",notes:notes.trim()||undefined,markedForRevision:result==="incorrect"});};
 return <div className="page-stack"><div className="stats-grid three"><Stat label="QUESTIONS ATTEMPTED" value={attempts.length} detail="All logged attempts" icon={ListChecks}/><Stat label="ACCURACY" value={accuracy+"%"} detail={counted.length+" correct/incorrect results"} icon={Target} tone="green"/><Stat label="INCORRECT" value={attempts.filter(x=>x.result==="incorrect").length} detail="Mistakes added to revision" icon={CircleHelpIcon} tone="amber"/></div>
  <div className="two-col"><Card><div className="card-head"><div><small>RECORD AN ATTEMPT</small><h3>Log PYQ or question practice</h3></div><Pill tone="blue">{formatExamTrack(state.profile.examTrack)}</Pill></div>
   <form className="form-stack" onSubmit={onSubmit}>
    <div className="form-grid"><label>Subject<select value={subject} onChange={e=>setSubject(e.target.value)}>{CURRICULA[state.profile.exam].map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Attempt type<select value={attemptType} onChange={e=>setAttemptType(e.target.value as Attempt["attemptType"])}>{["PYQ","Practice","Mock","Custom"].map(x=><option key={x}>{x}</option>)}</select></label></div>
    <label>Chapter<select value={chapter} onChange={e=>setChapter(e.target.value)}>{chaptersFor(state.profile.exam,subject).map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Topic / subtopic<input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Optional topic label"/></label>
    <div className="form-grid"><label>Exam year<input value={examYear} onChange={e=>setExamYear(e.target.value)} placeholder="e.g. 2025"/></label><label>Session / paper<input value={session} onChange={e=>setSession(e.target.value)} placeholder="e.g. Session 1 / Paper 2"/></label></div>
    <div className="form-grid"><label>Shift / set<input value={shift} onChange={e=>setShift(e.target.value)} placeholder="e.g. 22 Jan Shift 1"/></label><label>Source / book / paper<input value={source} onChange={e=>setSource(e.target.value)} placeholder="Name of source (optional)"/></label></div>
    <div className="form-grid"><label>Outcome<select value={result} onChange={e=>setResult(e.target.value as Attempt["result"])}><option value="correct">Correct</option><option value="incorrect">Incorrect</option><option value="skipped">Skipped</option></select></label><label>Difficulty<select value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option>Easy</option><option>Moderate</option><option>Hard</option></select></label></div>
    <div className="form-grid"><label>Selected answer<input value={selectedAnswer} onChange={e=>setSelectedAnswer(e.target.value)} placeholder="Optional"/></label><label>Correct answer<input value={correctAnswer} onChange={e=>setCorrectAnswer(e.target.value)} placeholder="Optional"/></label></div>
    <div className="form-grid"><label>Time taken (seconds)<input type="number" min="0" value={seconds} onChange={e=>setSeconds(Math.max(0,Number(e.target.value)))}/></label><label>Confidence (1–5)<select value={confidence} onChange={e=>setConfidence(Number(e.target.value) as 1|2|3|4|5)}>{[1,2,3,4,5].map(x=><option key={x} value={x}>{x}</option>)}</select></label></div>
    {result==="incorrect"&&<label>Mistake category<select value={mistake} onChange={e=>setMistake(e.target.value)}>{["Conceptual","Calculation","Formula / memory","Silly mistake","Question interpretation","Guessing","Time pressure","Unclassified"].map(x=><option key={x}>{x}</option>)}</select></label>}
    <label>Attempt notes<textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Why was it wrong? Which formula or concept was missed?"/></label>
    <Button type="submit"><Plus size={15}/> Save attempt and update revision</Button>
   </form>
  </Card><Card><small>EXECUTION INSIGHT</small><h3>Practice with feedback</h3><div className="insight"><Target size={20}/><div><b>{accuracy>=75?"Good accuracy — keep it stable":attempts.length?"Review mistake patterns":"Start with a measurable baseline"}</b><p>{attempts.length?"Incorrect results feed the Mistake Notebook signals and create a due revision item.":"Record correct, incorrect and skipped results honestly to establish a baseline."}</p></div></div><div className="metric"><span>Correct answers</span><b>{attempts.filter(x=>x.result==="correct").length}</b></div><div className="metric"><span>Skipped</span><b>{attempts.filter(x=>x.result==="skipped").length}</b></div><div className="metric"><span>Average time / counted attempt</span><b>{counted.length?Math.round(counted.reduce((n,x)=>n+x.seconds,0)/counted.length)+" sec":"—"}</b></div><div className="metric"><span>Auto-created revision items</span><b>{state.revisions.filter(x=>x.source==="mistake").length}</b></div></Card></div>
  <Card><div className="card-head"><div><small>ATTEMPT HISTORY</small><h3>Recent question attempts</h3></div></div>{attempts.length===0?<Empty title="Your practice history is empty" detail="Record attempts to see accuracy and recurring mistake patterns."/>:<div className="table-wrap"><table><thead><tr><th>Question / chapter</th><th>Subject</th><th>Exam source</th><th>Difficulty</th><th>Time</th><th>Confidence</th><th>Result</th></tr></thead><tbody>{attempts.map(a=><tr key={a.id}><td><b>{a.topic||a.chapter}</b><small>{a.notes||a.mistakeCategory||""}</small></td><td>{subjectLabel(state.profile.exam,a.subjectId)}</td><td>{a.examYear||"—"} {a.session||""} {a.shift||""}<small>{a.attemptType||"Practice"} • {a.sourceLabel||"—"}</small></td><td>{a.difficulty}</td><td>{a.seconds}s</td><td>{a.confidence??"—"}</td><td><Pill tone={a.result==="correct"?"green":a.result==="incorrect"?"rose":"slate"}>{a.result}</Pill></td></tr>)}</tbody></table></div>}</Card>
 </div>;
}

function CircleHelpIcon(p:{size?:number}){return <Target size={p.size||18}/>;}

function QuestionBank({state,record,toggleBookmark,onImport}:{state:AppState;record:(q:PracticeQuestion,r:"correct"|"incorrect")=>void;toggleBookmark:(id:string)=>void;onImport:(file:File)=>void}){
 const [subject,setSubject]=useState("all");const [difficulty,setDifficulty]=useState("all");const [search,setSearch]=useState("");const [open,setOpen]=useState<string[]>([]);
 const fileRef=useRef<HTMLInputElement>(null);
 const questions=[...SAMPLE_QUESTIONS[state.profile.exam],...state.customQuestions.filter(q=>q.examTrack===state.profile.examTrack||!q.examTrack)]
  .filter(q=>(subject==="all"||q.subjectId===subject)&&(difficulty==="all"||q.difficulty.toLowerCase()===difficulty)&&(!search||(q.prompt+" "+q.chapter+" "+(q.topic||"")+" "+(q.sourceLabel||"")).toLowerCase().includes(search.toLowerCase())));
 return <div className="page-stack"><div className="notice"><ShieldCheck size={17}/> Starter questions are illustrative. Imported questions are labelled as student-provided until their source is independently checked. Do not treat either group as an official PYQ collection.</div>
  <Card><div className="question-bank-toolbar"><div><small>QUESTION REPOSITORY</small><h3>{questions.length} questions available in this workspace</h3></div><input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={e=>{const f=e.target.files?.[0];if(f)onImport(f);e.currentTarget.value="";}}/><Button variant="secondary" onClick={()=>fileRef.current?.click()}><Download size={15}/> Import question JSON</Button></div><div className="filters"><div className="search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search question, topic, chapter or source"/></div><select value={subject} onChange={e=>setSubject(e.target.value)}><option value="all">All subjects</option>{CURRICULA[state.profile.exam].map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><select value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option value="all">All difficulty</option><option value="easy">Easy</option><option value="moderate">Moderate</option><option value="hard">Hard</option></select></div><p className="disclaimer">JSON format: an array of questions with subjectId, chapter, prompt, options[], answer (zero-based option index), difficulty, year and explanation. Import source labels are not verified by ACHIEVER.</p></Card>
  {questions.length===0?<Empty title="No matching questions" detail="Try another subject, difficulty or search term, or import a question JSON file."/>:questions.map((q,i)=>{const show=open.includes(q.id);const bookmarked=state.bookmarkedQuestionIds.includes(q.id);return <Card className="question-card" key={q.id}><div className="question-meta"><Pill tone="blue">{subjectLabel(state.profile.exam,q.subjectId)}</Pill><Pill>{q.chapter}</Pill><Pill tone={q.difficulty==="Easy"?"green":q.difficulty==="Hard"?"rose":"amber"}>{q.difficulty}</Pill><small>{q.year} • {q.kind} • {q.sourceType==="custom"?"Imported":q.sourceType==="verified-pyq"?"Verified PYQ":"Illustrative"}</small></div><h3>Q{i+1}. {q.prompt}</h3><div className="options">{q.options.map((o,j)=><div className={"option "+(show&&j===q.answer?"answer":"")} key={j}><i>{String.fromCharCode(65+j)}</i>{o}{show&&j===q.answer?<CheckCircle2 size={15}/>:null}</div>)}</div>{show&&<div className="explanation"><b>Correct answer: {String.fromCharCode(65+q.answer)}. {q.options[q.answer]}</b><p>{q.explanation}</p></div>}<div className="question-source"><span>{q.sourceLabel||"Source not specified"}</span><button className="mini-button" title={bookmarked?"Remove bookmark":"Bookmark question"} onClick={()=>toggleBookmark(q.id)}><Star size={15} fill={bookmarked?"currentColor":"none"}/></button></div><div className="question-actions"><Button variant="secondary" onClick={()=>setOpen(v=>show?v.filter(x=>x!==q.id):v.concat(q.id))}>{show?"Hide solution":"Show solution"}</Button><Button variant="ghost" onClick={()=>record(q,"correct")}>I got it right</Button><Button variant="ghost" onClick={()=>record(q,"incorrect")}>I got it wrong</Button></div></Card>;})}
 </div>;
}
function MockTests({state,saveTest}:{state:AppState;saveTest:(t:TestRecord,attempts:Attempt[])=>void}){
 const [track,setTrack]=useState<ExamTrack>(state.profile.examTrack||DEFAULT_TRACK[state.profile.exam]);
 const qs=SAMPLE_QUESTIONS[state.profile.exam];
 const [active,setActive]=useState(false);const [index,setIndex]=useState(0);const [answers,setAnswers]=useState<Record<string,number>>({});
 const [marked,setMarked]=useState<string[]>([]);const [remaining,setRemaining]=useState(20*60);const [result,setResult]=useState<TestRecord|null>(null);const submitted=useRef(false);
 const config=EXAM_TRACKS[track];
 useEffect(()=>{if(!active)return;const timer=window.setInterval(()=>setRemaining(x=>Math.max(0,x-1)),1000);return()=>window.clearInterval(timer);},[active]);
 const submit=()=>{
  if(submitted.current)return;submitted.current=true;
  let right=0,wrong=0,skip=0;const scores:Record<string,number>={};const attemptRecords:Attempt[]=[];
  qs.forEach(q=>{
   const answer=answers[q.id];const outcome=answer===undefined?"skipped":answer===q.answer?"correct":"incorrect";
   if(outcome==="skipped")skip++;else if(outcome==="correct")right++;else wrong++;
   const rawMode=config.correctMarks===null;
   if(outcome==="correct")scores[q.subjectId]=(scores[q.subjectId]||0)+(rawMode?1:config.correctMarks||0);
   if(outcome==="incorrect")scores[q.subjectId]=(scores[q.subjectId]||0)+(rawMode?0:config.wrongMarks||0);
   attemptRecords.push({id:uid(),questionId:q.id,subjectId:q.subjectId,chapter:q.chapter,result:outcome,difficulty:q.difficulty,seconds:Math.floor((20*60-remaining)/Math.max(1,qs.length)),date:today(),attemptType:"Mock",examTrack:track,examYear:state.profile.targetYear,sourceLabel:q.sourceLabel||"Illustrative starter question"});
  });
  const rawMode=config.correctMarks===null;
  const score=rawMode?right:right*(config.correctMarks||0)+wrong*(config.wrongMarks||0);
  const maxScore=rawMode?qs.length:qs.length*(config.correctMarks||0);
  const record:TestRecord={id:uid(),title:formatExamTrack(track)+" — short starter drill",exam:state.profile.exam,examTrack:track,
   patternVersion:config.patternVersion,testType:"Starter practice",date:today(),score,maxScore,scoreUnit:rawMode?"raw correct":"marks",
   correct:right,incorrect:wrong,skipped:skip,attempted:right+wrong,
   negativeMarks:rawMode?0:Math.max(0,wrong*Math.abs(config.wrongMarks||0)),
   accuracy:right+wrong?Math.round(right/(right+wrong)*100):0,
   durationMinutes:Math.round((20*60-remaining)/60),subjectScores:scores};
  saveTest(record,attemptRecords);setResult(record);setActive(false);
 };
 useEffect(()=>{if(active&&remaining===0)submit();},[active,remaining]);
 const start=()=>{submitted.current=false;setAnswers({});setMarked([]);setIndex(0);setRemaining(20*60);setResult(null);setActive(true);};
 if(result)return <div className="page-stack"><Card className="result-card"><small>PRACTICE SET RESULT</small><h2>{result.score} <span>/ {result.maxScore} {result.scoreUnit==="raw correct"?"correct":"marks"}</span></h2><Pill tone={result.scoreUnit==="raw correct"?"amber":result.accuracy>=65?"green":"amber"}>{result.accuracy}% accuracy</Pill><div className="result-grid"><div><b>{result.correct}</b><span>Correct</span></div><div><b>{result.incorrect}</b><span>Incorrect</span></div><div><b>{result.skipped}</b><span>Unattempted</span></div></div><p>This is a short starter drill built from illustrative questions, not a full official paper. Incorrect responses are added to your attempt history and revision pipeline.</p><Button onClick={()=>setResult(null)}>Back to mock tests</Button></Card></div>;
 if(!active)return <div className="page-stack"><div className="notice amber"><ShieldCheck size={17}/> The question set currently contains illustrative sample items only. It is not a full-length official mock or a verified PYQ paper.</div><div className="two-col"><Card className="mock-intro"><div className="mock-icon"><Timer size={32}/></div><small>EXAM-SPECIFIC TEST CONFIGURATION</small><h2>Starter practice drill</h2><label className="track-select">Examination track<select value={track} onChange={e=>setTrack(e.target.value as ExamTrack)}>{tracksForExam(state.profile.exam).map(t=><option key={t} value={t}>{formatExamTrack(t)}</option>)}</select></label><p>Attempt {qs.length} starter questions. The drill uses a 20-minute local timer. It records each response into PYQ / attempt analytics after submission.</p><div className="mock-specs"><div><b>20 min</b><small>Drill timer</small></div><div><b>{qs.length}</b><small>Sample items</small></div><div><b>{config.correctMarks===null?"Raw correct":config.totalMarks+" marks"}</b><small>Scoring reference</small></div></div><Button onClick={start}><Play size={15}/> Start practice drill</Button></Card>
  <Card><small>OFFICIAL EXAM CONFIGURATION</small><h3>{config.name}</h3><div className="metric"><span>Pattern status</span><b>{config.status==="published"?"Published summary":config.status==="pending-bulletin"?"Awaiting 2027 bulletin":"Variable"}</b></div><div className="metric"><span>Mode</span><b>{config.mode}</b></div><div className="metric"><span>Duration</span><b>{config.durationMinutes===null?"Pending / variable":config.durationMinutes+" minutes"}</b></div><div className="metric"><span>Official question count</span><b>{config.questionCount??"Not fixed here"}</b></div><div className="metric"><span>Official maximum marks</span><b>{config.totalMarks??"Not fixed here"}</b></div><div className="metric"><span>Marking</span><b>{config.correctMarks===null?"Variable — no score assumed":"+"+config.correctMarks+" / "+config.wrongMarks+" / 0"}</b></div><p className="disclaimer">{config.notes}</p><a className="text-link" href={config.officialSource} target="_blank" rel="noreferrer">Open official exam source <ArrowRight size={14}/></a></Card></div>
  <Card><div className="card-head"><div><small>PREVIOUS ATTEMPTS</small><h3>Practice test history</h3></div></div>{state.tests.length===0?<Empty title="No tests attempted yet" detail="Your submitted practice drills will appear here."/>:state.tests.slice(0,6).map(t=><div className="history-row" key={t.id}><span><b>{t.title}</b><small>{dateLabel(t.date)} • {t.correct} correct / {t.incorrect} incorrect</small></span><strong>{t.score}/{t.maxScore} {t.scoreUnit==="raw correct"?"correct":""}</strong></div>)}</Card></div>;
 const q=qs[index];
 return <div className="page-stack"><div className="test-head"><div><Pill tone="blue">{formatExamTrack(track)}</Pill><h2>Starter Practice Drill</h2></div><b className={remaining<120?"urgent":""}><Clock3 size={16}/>{fmt(remaining)}</b></div><div className="test-layout"><Card className="test-question"><div className="question-meta"><Pill>Question {index+1} of {qs.length}</Pill><Pill>{q.chapter}</Pill><Pill tone="amber">{q.difficulty}</Pill></div><h3>{q.prompt}</h3><div className="test-options">{q.options.map((o,j)=><button className={answers[q.id]===j?"chosen":""} key={j} onClick={()=>setAnswers(v=>({...v,[q.id]:j}))}><i>{String.fromCharCode(65+j)}</i>{o}{answers[q.id]===j?<CheckCircle2 size={15}/>:null}</button>)}</div><div className="question-actions"><Button variant="secondary" onClick={()=>setMarked(v=>marked.includes(q.id)?v.filter(x=>x!==q.id):v.concat(q.id))}>{marked.includes(q.id)?"Remove review mark":"Mark for review"}</Button><Button variant="ghost" onClick={()=>setAnswers(v=>{const n={...v};delete n[q.id];return n;})}>Clear response</Button></div><div className="test-nav"><Button variant="secondary" disabled={index===0} onClick={()=>setIndex(x=>x-1)}><ChevronDown className="rotate-left" size={15}/> Previous</Button><Button onClick={()=>index===qs.length-1?submit():setIndex(x=>x+1)}>{index===qs.length-1?"Submit drill":"Save & next"} <ArrowRight size={15}/></Button></div></Card><Card className="palette"><small>QUESTION PALETTE</small><h3>Overview</h3><div>{qs.map((v,i)=><button key={v.id} className={(answers[v.id]!==undefined?"answered ":"")+(marked.includes(v.id)?"marked ":"")+(index===i?"current":"")} onClick={()=>setIndex(i)}>{i+1}</button>)}</div><div className="metric"><span>Answered</span><b>{Object.keys(answers).length}/{qs.length}</b></div><Button className="full" variant="danger" onClick={submit}>Submit practice drill</Button></Card></div></div>;
}
function Performance({state}:{state:AppState}){
 if(!state.tests.length)return <Card><Empty title="No test performance yet" detail="Attempt a starter practice set in Mock Tests. Your score, accuracy and subject-level results will appear here."/></Card>;
 const best=Math.max(...state.tests.map(x=>x.score));const avg=Math.round(state.tests.reduce((n,x)=>n+x.score,0)/state.tests.length);
 return <div className="page-stack"><div className="stats-grid three"><Stat label="TESTS ATTEMPTED" value={state.tests.length} detail="Saved practice sets" icon={ClipboardIcon}/><Stat label="AVERAGE SCORE" value={avg} detail="Marks per saved test" icon={BarChart3}/><Stat label="PERSONAL BEST" value={best} detail="Highest score recorded" icon={Trophy} tone="green"/></div><Card><div className="card-head"><div><small>SCORE HISTORY</small><h3>Test attempts</h3></div></div><div className="table-wrap"><table><thead><tr><th>Test</th><th>Date</th><th>Score</th><th>Accuracy</th><th>Correct</th><th>Incorrect</th><th>Unattempted</th></tr></thead><tbody>{state.tests.map(t=><tr key={t.id}><td><b>{t.title}</b></td><td>{dateLabel(t.date)}</td><td><b>{t.score}/{t.maxScore}</b></td><td>{t.accuracy}%</td><td className="green-text">{t.correct}</td><td>{t.incorrect}</td><td>{t.skipped}</td></tr>)}</tbody></table></div></Card><Card><small>LATEST TEST SUBJECT BREAKDOWN</small><h3>Marks by subject</h3>{Object.entries(state.tests[0].subjectScores).map(([id,score])=><div className="metric"><span>{subjectLabel(state.profile.exam,id)}</span><b>{score} marks</b></div>)}</Card></div>;
}
function ClipboardIcon(){return <ListChecks size={18}/>;}
function Revision({state,addRevision,update}:{state:AppState;addRevision:(v:{title:string;subjectId:string;chapter:string;dueDate:string})=>void;update:(fn:(s:AppState)=>AppState)=>void}){
 const [subject,setSubject]=useState(CURRICULA[state.profile.exam][0].id);const [chapter,setChapter]=useState(chaptersFor(state.profile.exam,subject)[0]);const [title,setTitle]=useState("");const [dueDate,setDueDate]=useState(today());
 useEffect(()=>setChapter(chaptersFor(state.profile.exam,subject)[0]),[subject,state.profile.exam]);
 const pending=state.revisions.filter(x=>!x.done).sort((a,b)=>a.dueDate.localeCompare(b.dueDate));const done=state.revisions.filter(x=>x.done).length;
 return <div className="page-stack"><div className="stats-grid three"><Stat label="PENDING REVISION" value={pending.length} detail="Items to revisit" icon={RefreshCw}/><Stat label="DUE TODAY" value={pending.filter(x=>x.dueDate<=today()).length} detail="Scheduled for now" icon={CalendarDays}/><Stat label="COMPLETED" value={done} detail="Revision tasks finished" icon={CheckCircle2} tone="green"/></div><div className="two-col"><Card><small>ADD REVISION</small><h3>Schedule a review</h3><form className="form-stack" onSubmit={e=>{e.preventDefault();addRevision({title:title.trim()||"Revise "+chapter,subjectId:subject,chapter,dueDate});setTitle("");}}><label>Subject<select value={subject} onChange={e=>setSubject(e.target.value)}>{CURRICULA[state.profile.exam].map(s=><option value={s.id}>{s.name}</option>)}</select></label><label>Chapter<select value={chapter} onChange={e=>setChapter(e.target.value)}>{chaptersFor(state.profile.exam,subject).map(c=><option>{c}</option>)}</select></label><label>Task title<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Formula recall / retry wrong questions"/></label><label>Due date<input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></label><Button type="submit"><Plus size={15}/> Schedule revision</Button></form></Card><Card><small>SPACED REVISION GUIDE</small><h3>A repeatable cycle</h3><div className="revision-cycle">{["Same day","1 day later","3 days later","7 days later","15 days later","30 days later"].map((x,i)=><span key={x}><i>{i+1}</i>{x}</span>)}</div><p className="disclaimer">Adjust intervals to your recall and test performance. These are suggested starting intervals.</p></Card></div><Card><div className="card-head"><div><small>REVISION QUEUE</small><h3>What to revise next</h3></div></div>{pending.length===0?<Empty title="Your queue is clear" detail="Schedule a revision or record an incorrect question to create a review item."/>:pending.map(r=><div className="revision-row" key={r.id}><button className="check-button" onClick={()=>update(s=>({...s,revisions:s.revisions.map(x=>x.id===r.id?{...x,done:true}:x)}))}><Check size={14}/></button><span><b>{r.title}</b><small>{subjectLabel(state.profile.exam,r.subjectId)} • {r.chapter} • {r.source==="mistake"?"Mistake review":"Scheduled"}</small></span><Pill tone={r.dueDate<=today()?"amber":"blue"}>{r.dueDate<=today()?"Due":dateLabel(r.dueDate)}</Pill><button className="mini-button" onClick={()=>update(s=>({...s,revisions:s.revisions.filter(x=>x.id!==r.id)}))}><Trash2 size={14}/></button></div>)}</Card></div>;
}
function Notebook({state,saveNote,addFlashcard,reviewFlashcard,addRevision}:{state:AppState;saveNote:(v:Omit<Note,"id"|"updatedAt">,id?:string)=>void;addFlashcard:(v:Omit<Flashcard,"id"|"createdAt">)=>void;reviewFlashcard:(id:string,remembered:boolean)=>void;addRevision:(v:{title:string;subjectId:string;chapter:string;dueDate:string})=>void}){
 const [tab,setTab]=useState<"notes"|"formulas"|"mistakes"|"flashcards">("notes");
 const [title,setTitle]=useState("");const [body,setBody]=useState("");const [subject,setSubject]=useState(CURRICULA[state.profile.exam][0].id);const [chapter,setChapter]=useState(chaptersFor(state.profile.exam,CURRICULA[state.profile.exam][0].id)[0]);const [kind,setKind]=useState<"note"|"formula">("note");const [editId,setEditId]=useState<string|undefined>();const [search,setSearch]=useState("");
 const [front,setFront]=useState("");const [back,setBack]=useState("");const [flashSubject,setFlashSubject]=useState(CURRICULA[state.profile.exam][0].id);const [flashChapter,setFlashChapter]=useState(chaptersFor(state.profile.exam,CURRICULA[state.profile.exam][0].id)[0]);const [flipped,setFlipped]=useState<string[]>([]);
 useEffect(()=>setChapter(chaptersFor(state.profile.exam,subject)[0]),[subject,state.profile.exam]);
 useEffect(()=>setFlashChapter(chaptersFor(state.profile.exam,flashSubject)[0]),[flashSubject,state.profile.exam]);
 const edit=(n:Note)=>{setEditId(n.id);setTitle(n.title);setBody(n.body);setSubject(n.subjectId);setChapter(n.chapter||chaptersFor(state.profile.exam,n.subjectId)[0]);setKind(n.kind==="formula"?"formula":"note");setTab(n.kind==="formula"?"formulas":"notes");};
 const filtered=state.notes.filter(n=>(tab==="formulas"?n.kind==="formula":n.kind!=="formula")&&(n.title+" "+n.body+" "+(n.chapter||"")).toLowerCase().includes(search.toLowerCase()));
 const mistakes=state.attempts.filter(x=>x.result==="incorrect").filter(x=>(x.topic||x.chapter).toLowerCase().includes(search.toLowerCase())||(x.mistakeCategory||"").toLowerCase().includes(search.toLowerCase()));
 const dueCards=state.flashcards.filter(x=>!x.dueAt||x.dueAt<=today());
 return <div className="page-stack"><div className="notebook-tabs">{[{id:"notes",label:"Study notes"},{id:"formulas",label:"Formula library"},{id:"mistakes",label:"Mistake notebook"},{id:"flashcards",label:"Flashcards"}].map(x=><button key={x.id} className={tab===x.id?"active":""} onClick={()=>{setTab(x.id as typeof tab);setEditId(undefined);}}>{x.label}</button>)}</div>
  {tab==="notes"||tab==="formulas"?<div className="two-col"><Card><small>{editId?"EDIT ENTRY":tab==="formulas"?"FORMULA LIBRARY":"QUICK CAPTURE"}</small><h3>{editId?"Update entry":tab==="formulas"?"Save a formula or relation":"Create a study note"}</h3><form className="form-stack" onSubmit={e=>{e.preventDefault();if(!title.trim()&&!body.trim())return;saveNote({title:title.trim()||"Untitled entry",body,subjectId:subject,kind:tab==="formulas"?"formula":kind,chapter},editId);setTitle("");setBody("");setEditId(undefined);}}>
   <label>Entry type<select value={tab==="formulas"?"formula":kind} onChange={e=>setKind(e.target.value as "note"|"formula")} disabled={tab==="formulas"}><option value="note">Study note</option><option value="formula">Formula / derivation</option></select></label>
   <label>Subject<select value={subject} onChange={e=>setSubject(e.target.value)}>{CURRICULA[state.profile.exam].map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
   <label>Chapter<select value={chapter} onChange={e=>setChapter(e.target.value)}>{chaptersFor(state.profile.exam,subject).map(x=><option key={x}>{x}</option>)}</select></label>
   <label>Title<input value={title} onChange={e=>setTitle(e.target.value)} placeholder={tab==="formulas"?"e.g. Lens maker's formula":"e.g. Important concept summary"}/></label>
   <label>{tab==="formulas"?"Formula / derivation":"Notes"}<textarea rows={9} value={body} onChange={e=>setBody(e.target.value)} placeholder={tab==="formulas"?"Write the formula, define symbols, add units and conditions...":"Write a derivation, concept summary, doubt or explanation..."}/></label>
   <div className="button-row"><Button type="submit"><Check size={15}/>{editId?"Save changes":"Save entry"}</Button>{editId&&<Button variant="ghost" onClick={()=>{setEditId(undefined);setTitle("");setBody("");}}>Cancel</Button>}</div>
  </form></Card><Card><div className="card-head"><div><small>{tab==="formulas"?"PERSONAL FORMULA BOOK":"STUDY NOTEBOOK"}</small><h3>{tab==="formulas"?"Saved formulas":"Saved notes"}</h3></div><Pill>{filtered.length} entries</Pill></div><div className="search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find an entry"/></div><div className="note-list">{filtered.length===0?<Empty title="No entries found" detail="Create a note or formula to build your personal library."/>:filtered.map(n=><button className="note-item" key={n.id} onClick={()=>edit(n)}><FileText size={17}/><span><b>{n.title}</b><small>{subjectLabel(state.profile.exam,n.subjectId)} • {n.chapter||"No chapter"} • {new Date(n.updatedAt).toLocaleDateString()}</small><p>{n.body.slice(0,100)||"No content"}</p></span><ChevronRight size={15}/></button>)}</div></Card></div>:
  tab==="mistakes"?<Card><div className="card-head"><div><small>PERSONAL ERROR ANALYSIS</small><h3>Incorrect question notebook</h3></div><Pill tone="amber">{mistakes.length} incorrect attempts</Pill></div><div className="search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search chapter or mistake type"/></div>{mistakes.length===0?<Empty title="No matching mistakes" detail="Incorrect attempts recorded in PYQ Tracker and Mock Tests appear here."/>:mistakes.map(x=><div className="revision-row" key={x.id}><span><b>{x.topic||x.chapter}</b><small>{subjectLabel(state.profile.exam,x.subjectId)} • {x.examYear||"—"} • {x.mistakeCategory||x.mistake||"Review"} • {x.seconds}s</small>{x.notes&&<small>{x.notes}</small>}</span><Pill tone="rose">Incorrect</Pill><button className="mini-button" title="Schedule revision" onClick={()=>addRevision({title:"Review mistake — "+x.chapter,subjectId:x.subjectId,chapter:x.chapter,dueDate:tomorrow()})}><RefreshCw size={14}/></button></div>)}</Card>:
  <div className="two-col"><Card><small>CREATE FLASHCARD</small><h3>Active recall card</h3><form className="form-stack" onSubmit={e=>{e.preventDefault();if(!front.trim()||!back.trim())return;addFlashcard({front,back,subjectId:flashSubject,chapter:flashChapter,intervalDays:0,repetitions:0,ease:2.5});setFront("");setBack("");}}><label>Subject<select value={flashSubject} onChange={e=>setFlashSubject(e.target.value)}>{CURRICULA[state.profile.exam].map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Chapter<select value={flashChapter} onChange={e=>setFlashChapter(e.target.value)}>{chaptersFor(state.profile.exam,flashSubject).map(x=><option key={x}>{x}</option>)}</select></label><label>Front / question<input value={front} onChange={e=>setFront(e.target.value)} placeholder="Ask yourself a question"/></label><label>Back / answer<textarea rows={4} value={back} onChange={e=>setBack(e.target.value)} placeholder="Write the answer or key concept"/></label><Button type="submit"><Plus size={15}/> Create flashcard</Button></form></Card><Card><div className="card-head"><div><small>SPACED ACTIVE RECALL</small><h3>Review flashcards</h3></div><Pill tone="blue">{dueCards.length} due</Pill></div>{state.flashcards.length===0?<Empty title="No flashcards yet" detail="Create a question-and-answer card to practise retrieval."/>:state.flashcards.map(card=>{const show=flipped.includes(card.id);return <div className="flashcard" key={card.id}><small>{subjectLabel(state.profile.exam,card.subjectId)} • {card.chapter} • {card.dueAt&&card.dueAt>today()?"Scheduled "+dateLabel(card.dueAt):"Due for review"}</small><b>{show?card.back:card.front}</b><Button variant="secondary" onClick={()=>setFlipped(v=>show?v.filter(x=>x!==card.id):v.concat(card.id))}>{show?"Show question":"Reveal answer"}</Button>{show&&<div className="button-row"><Button variant="danger" onClick={()=>reviewFlashcard(card.id,false)}>Again</Button><Button onClick={()=>reviewFlashcard(card.id,true)}>Got it</Button></div>}</div>;})}</Card></div>}
 </div>;
}
function Health({state,update}:{state:AppState;update:(fn:(s:AppState)=>AppState)=>void}){
 const h=state.health;const change=(k:"sleep"|"water"|"exercise"|"meditation",v:number)=>update(s=>({...s,health:{...s.health,[k]:v,date:today()}}));
 return <div className="page-stack"><div className="health-banner"><HeartPulse size={24}/><span><b>Preparation is a marathon, not a sprint.</b><small>Track simple habits that support attention, recovery and consistency.</small></span></div><div className="health-grid"><HealthMetric title="Sleep" value={h.sleep} unit="hours" min={0} max={14} step={.5} icon={Clock3} change={v=>change("sleep",v)} detail="Adjust to your needs"/><HealthMetric title="Water" value={h.water} unit="litres" min={0} max={6} step={.25} icon={Activity} change={v=>change("water",v)} detail="Adjust to climate and activity"/><HealthMetric title="Movement" value={h.exercise} unit="minutes" min={0} max={240} step={5} icon={Heart} change={v=>change("exercise",v)} detail="Add movement breaks"/><HealthMetric title="Meditation" value={h.meditation} unit="minutes" min={0} max={120} step={5} icon={Brain} change={v=>change("meditation",v)} detail="Short daily practice"/></div><Card><small>DAILY BALANCE</small><h3>Protect your energy</h3><ul className="check-list"><li>Take short breaks between demanding study blocks and rest your eyes.</li><li>Keep a consistent sleep schedule instead of relying on late-night catch-up.</li><li>Use this tracker for awareness, not as a medical assessment.</li></ul></Card></div>;
}
function HealthMetric(p:{title:string;value:number;unit:string;min:number;max:number;step:number;icon:React.ElementType;change:(v:number)=>void;detail:string}){
 const Icon=p.icon;return <Card className="health-metric"><i><Icon size={19}/></i><h3>{p.title}</h3><b>{p.value}<small>{p.unit}</small></b><input type="range" min={p.min} max={p.max} step={p.step} value={p.value} onChange={e=>p.change(Number(e.target.value))}/><span>{p.detail}</span></Card>;
}
function Mentor({messages,input,setInput,send,busy}:{messages:ChatMessage[];input:string;setInput:(s:string)=>void;send:(s:string,files?:PendingChatFile[])=>void;busy:boolean}){
 const [files,setFiles]=useState<PendingChatFile[]>([]);
 const [fileError,setFileError]=useState("");
 const inputRef=useRef<HTMLInputElement>(null);
 const bottom=useRef<HTMLDivElement>(null);
 useEffect(()=>bottom.current?.scrollIntoView({behavior:"smooth"}),[messages,busy]);
 const addFiles=(list:FileList|null)=>{
  if(!list)return;
  setFileError("");
  const incoming=Array.from(list);
  const allowed=incoming.filter(f=>f.type.startsWith("image/")||f.type==="application/pdf");
  if(allowed.length!==incoming.length)setFileError("Only image files and PDF documents are supported.");
  const room=3-files.length;
  const chosen=allowed.slice(0,Math.max(0,room));
  if(allowed.length>room)setFileError("Attach up to 3 files per message.");
  let size=files.reduce((n,x)=>n+x.file.size,0);
  const accepted:PendingChatFile[]=[];
  for(const file of chosen){
   if(file.size>2_500_000||size+file.size>3_000_000){setFileError("Each file must be under 2.5 MB and total attachments under 3 MB.");continue;}
   accepted.push({file,previewUrl:file.type.startsWith("image/")?URL.createObjectURL(file):undefined});
   size+=file.size;
  }
  if(accepted.length)setFiles(v=>v.concat(accepted));
  if(inputRef.current)inputRef.current.value="";
 };
 const removeFile=(index:number)=>{
  setFiles(v=>{const target=v[index];if(target?.previewUrl)URL.revokeObjectURL(target.previewUrl);return v.filter((_,i)=>i!==index);});
 };
 const submit=(e:React.FormEvent)=>{
  e.preventDefault();
  if(busy||(!input.trim()&&!files.length))return;
  send(input,files);setInput("");setFiles([]);setFileError("");
 };
 return <div className="mentor-layout"><Card className="mentor-chat"><div className="mentor-head"><i><Brain size={22}/></i><span><b>ACHIEVER AI Mentor</b><small><i className="live-dot"/> Local study coach • live AI optional</small></span><Pill tone="blue">JEE / NEET</Pill></div>
  <div className="chat-messages">{messages.map((m,i)=><div className={"chat-row "+m.role} key={i}><i>{m.role==="assistant"?<Sparkles size={15}/>:<GraduationCap size={15}/>}</i><div>{m.attachments?.length>0&&<div className="chat-attachments">{m.attachments.map((a,j)=><div className="chat-attachment" key={j}>{a.previewUrl?<img src={a.previewUrl} alt={a.name}/>:<FileText size={19}/>}<span>{a.name}</span></div>)}</div>}{m.text.split("\n").map((line,j)=><p key={j}>{line}</p>)}</div></div>)}{busy&&<div className="chat-row assistant"><i><Sparkles size={15}/></i><div>Preparing a response…</div></div>}<div ref={bottom}/></div>
  <form className="chat-composer" onSubmit={submit}>
   {files.length>0&&<div className="pending-files">{files.map((f,i)=><div className="pending-file" key={i}>{f.previewUrl?<img src={f.previewUrl} alt={f.file.name}/>:<FileText size={17}/>}<span>{f.file.name}</span><button type="button" onClick={()=>removeFile(i)} aria-label={"Remove "+f.file.name}><X size={14}/></button></div>)}</div>}
   {fileError&&<div className="file-error">{fileError}</div>}
   <div className="composer-row"><input ref={inputRef} type="file" hidden multiple accept="image/*,application/pdf" onChange={e=>addFiles(e.target.files)}/><button type="button" className="attach-button" title="Attach question image or PDF" onClick={()=>inputRef.current?.click()} disabled={busy}><Paperclip size={18}/><span>Attach image / PDF</span></button><textarea rows={2} value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask a doubt or attach a question image / PDF..."/><Button type="submit" disabled={busy||(!input.trim()&&!files.length)}><Send size={16}/> Send</Button></div>
  </form>
  <small className="disclaimer">Images and PDFs are sent only when you press Send. Live attachment analysis requires the server-side AI provider; without it, the local coach cannot read files.</small>
 </Card><Card><small>TRY ASKING</small><h3>Study prompts</h3>{["Make my study plan for today","Which subject needs more attention?","How can I improve question accuracy?","Explain a concept step by step"].map(x=><button className="prompt" key={x} onClick={()=>send(x,[])}>{x}<ArrowRight size={13}/></button>)}<p className="disclaimer">The mentor uses your selected examination and locally recorded preparation data.</p></Card></div>;
}
function Analytics({state,stats,syllabusPct,accuracy,studyMinutes,analytics}:{state:AppState;stats:ReturnType<typeof subjectStats>;syllabusPct:number;accuracy:number;studyMinutes:number;analytics:ReturnType<typeof buildAnalytics>}){
 const max=Math.max(1,...analytics.daily.map(x=>x.minutes));const mistakes=Object.entries(analytics.mistakes).sort((a,b)=>b[1]-a[1]);
 return <div className="page-stack">
  <div className="stats-grid"><Stat label="PREPARATION PROGRESS" value={syllabusPct+"%"} detail="Manually completed starter-map chapters" icon={GraduationCap}/><Stat label="PRACTICE ACCURACY" value={accuracy+"%"} detail={state.attempts.length+" all-time attempts" } icon={Target} tone="green"/><Stat label="ALL-TIME FOCUS TIME" value={(studyMinutes/60).toFixed(1)+"h"} detail="Manual + verified session records" icon={Clock3} tone="purple"/><Stat label="AVG QUESTION TIME" value={analytics.averageSeconds?analytics.averageSeconds+"s":"—"} detail="Last 30 days, counted attempts" icon={Timer} tone="amber"/></div>
  <div className="two-col"><Card><div className="card-head"><div><small>LAST 30 DAYS</small><h3>Study time by day</h3></div><Pill tone="blue">{(analytics.totalMinutes/60).toFixed(1)}h total</Pill></div><div className="bar-chart">{analytics.daily.slice(-14).map(d=><div className="bar-column" key={d.date}><small>{d.minutes?Math.round(d.minutes/60*10)/10+"h":""}</small><div className="bar-rail"><i style={{height:Math.max(3,d.minutes/max*100)+"%"}}/></div><span>{new Date(d.date+"T12:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</span></div>)}</div><div className="metric"><span>Verified focus time (30 days)</span><b>{(analytics.verifiedMinutes/60).toFixed(1)}h</b></div><div className="metric"><span>Manual focus time (30 days)</span><b>{(analytics.manualMinutes/60).toFixed(1)}h</b></div><div className="metric"><span>Last 7 days vs previous 7 days</span><b>{analytics.weekDeltaMinutes>=0?"+":""}{analytics.weekDeltaMinutes} min</b></div></Card>
   <Card><small>SUBJECT-WISE PERFORMANCE</small><h3>Accuracy and syllabus completion</h3>{analytics.subjects.map(s=><div className="analytics-subject" key={s.id}><b>{s.name}</b><small>{s.attempts} counted attempts • {s.progress}% manual chapter completion</small><div className="metric"><span>Accuracy</span><Progress value={s.accuracy}/><b>{s.attempts?s.accuracy+"%":"—"}</b></div><div className="metric"><span>Coverage</span><Progress value={s.progress} color="#1bb88e"/><b>{s.progress}%</b></div></div>)}
   {analytics.weakest?<div className="insight"><Target size={18}/><div><b>Evidence-based review priority: {analytics.weakest.name}</b><p>{analytics.weakest.accuracy}% accuracy across {analytics.weakest.attempts} counted attempts. Use the mistake notebook to plan corrective practice.</p></div></div>:<p className="disclaimer">Weak-subject analysis is withheld until each subject has at least five counted attempts.</p>}</Card></div>
  <div className="two-col"><Card><small>MISTAKE PATTERNS</small><h3>Incorrect answer categories</h3>{mistakes.length?mistakes.map(([name,count])=><div className="metric" key={name}><span>{name}</span><b>{count}</b></div>):<Empty title="No classified mistakes yet" detail="Record an incorrect attempt and choose a mistake category in PYQ Tracker."/>}</Card>
   <Card><small>MOCK TEST HISTORY</small><h3>Recent test records</h3>{state.tests.length===0?<Empty title="No test data yet" detail="Attempt a starter drill or import/record a verified test to unlock trend analysis."/>:state.tests.slice(0,8).map(t=><div className="history-row" key={t.id}><span><b>{t.title}</b><small>{dateLabel(t.date)} • {t.correct} correct / {t.incorrect} incorrect • {t.examTrack||t.exam}</small></span><strong>{t.score}/{t.maxScore} {t.scoreUnit==="raw correct"?"correct":""}</strong></div>)}</Card></div>
  <Card><small>RECENT STUDY SESSIONS</small><h3>Source-aware focus history</h3>{state.sessions.length===0?<Empty title="No saved focus sessions" detail="Use AI Focus to record study sessions."/>:state.sessions.slice(0,15).map(s=><div className="session-row" key={s.id}><span>{dateLabel(s.date)}</span><Progress value={s.minutes/Math.max(1,...state.sessions.slice(0,15).map(x=>x.minutes))*100}/><b>{s.minutes}m</b><small>{s.mode} • {subjectLabel(state.profile.exam,s.subjectId)} • {s.origin==="verified"&&s.verificationStatus==="verified"?"Verified":"Manual / unverified"}</small></div>)}</Card>
  <div className="notice amber"><Lightbulb size={17}/> These are descriptive summaries of records entered in this workspace, not rank or percentile predictions. A robust rank estimate would require representative mock data, test difficulty and cohort/rank distributions.</div>
 </div>;
}
function Strategy({state,stats}:{state:AppState;stats:ReturnType<typeof subjectStats>}){
 const jee=state.profile.exam==="JEE";const tips=jee?[["Physics","Link every formula to its underlying concept. After a derivation, solve conceptual and numerical problems."],["Chemistry","Keep Physical, Organic and Inorganic revision methods distinct. Use prescribed syllabus resources and reaction maps."],["Mathematics","Prioritize accurate setup and algebraic execution. Understand why a method works, not only the final answer."],["Mock analysis","Classify lost marks as concept, calculation, time, misread or guess; then reattempt after a gap."]]:[["Biology","Use active recall with prescribed textbook diagrams, tables, definitions and line-by-line revision."],["Chemistry","Combine textbook recall with repeated numerical practice and reaction / exception revision."],["Physics","Write the governing equation first, check units and practise timed numericals with full error review."],["OMR discipline","Practise deliberate option marking and question selection during timed sessions."]];
 const weak=stats.slice().sort((a,b)=>a.accuracy-b.accuracy)[0];
 return <div className="page-stack"><div className="strategy-hero"><small>EXAM-SPECIFIC PLAYBOOK</small><h2>{jee?"JEE preparation strategy":"NEET preparation strategy"}</h2><p>Use a balanced cycle: learn → retrieve → practise → analyse → revise.</p></div><div className="two-col"><Card><small>SUBJECT PLAYBOOK</small><h3>High-value habits</h3>{tips.map((t,i)=><div className="strategy-row" key={t[0]}><i>{i+1}</i><span><b>{t[0]}</b><p>{t[1]}</p></span></div>)}</Card><Card><small>PERSONAL FOCUS</small><h3>One area to review</h3><div className="insight"><Target size={19}/><div><b>{state.attempts.length?weak.name:"Start collecting practice data"}</b><p>{weak.attempts?"Recorded accuracy: "+weak.accuracy+"%. Revisit repeated errors and retry a short timed set.":"Log attempts across subjects before drawing conclusions about strengths or weaknesses."}</p></div></div><ul className="check-list"><li>Update priorities weekly using fresh evidence.</li><li>Protect sleep and avoid unsustainable targets.</li><li>Use official syllabus and examination documents as the source of truth.</li></ul></Card></div></div>;
}
function SettingsPage({state,update,notify}:{state:AppState;update:(fn:(s:AppState)=>AppState)=>void;notify:(s:string)=>void}){
 const [profile,setProfile]=useState(state.profile);const importRef=useRef<HTMLInputElement>(null);
 useEffect(()=>setProfile(state.profile),[state.profile]);
 const exportData=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="achiever-jee-neet-backup-"+today()+".json";a.click();URL.revokeObjectURL(url);};
 const restore=async(file:File)=>{
  try{
   const parsed=JSON.parse(await file.text()) as Partial<AppState>;
   if(!parsed.profile||!Array.isArray(parsed.completedChapters)||!Array.isArray(parsed.lectures)||!Array.isArray(parsed.attempts))throw new Error("This file does not look like an ACHIEVER backup.");
   if(!confirm("Replace the current browser workspace with the imported backup? Export the current data first if you may need it."))return;
   const base=loadState();
   update(()=>({...base,...parsed,profile:{...base.profile,...parsed.profile},schemaVersion:2}));
   notify("Backup restored into this browser.");
  }catch(e){notify(e instanceof Error?"Restore failed: "+e.message:"Could not restore this backup.");}
 };
 const tracks=tracksForExam(profile.exam);
 const changeExam=(exam:ExamKey)=>setProfile(p=>({...p,exam,examTrack:DEFAULT_TRACK[exam],selectedExams:tracksForExam(exam),examDate:""}));
 return <div className="two-col"><Card><small>STUDENT PROFILE & EXAMINATION</small><h3>Your preparation details</h3><form className="form-stack" onSubmit={e=>{e.preventDefault();update(s=>({...s,profile}));notify("Profile updated.");}}>
  <label>Student name<input value={profile.name} onChange={e=>setProfile(p=>({...p,name:e.target.value}))}/></label>
  <div className="form-grid"><label>Examination family<select value={profile.exam} onChange={e=>changeExam(e.target.value as ExamKey)}><option value="JEE">JEE</option><option value="NEET">NEET UG</option></select></label><label>Exam track<select value={profile.examTrack} onChange={e=>{const t=e.target.value as ExamTrack;setProfile(p=>({...p,examTrack:t,exam:t==="neet-ug"?"NEET":"JEE",selectedExams:t==="neet-ug"?["neet-ug"]:p.selectedExams.includes("jee-advanced")?["jee-main","jee-advanced"]:["jee-main"]}));}}>{tracks.map(t=><option key={t} value={t}>{formatExamTrack(t)}</option>)}</select></label></div>
  {profile.exam==="JEE"&&<label className="inline-check"><input type="checkbox" checked={profile.selectedExams.includes("jee-advanced")} onChange={e=>setProfile(p=>({...p,selectedExams:e.target.checked?["jee-main","jee-advanced"]:["jee-main"]}))}/> Preparing for JEE Advanced too</label>}
  <div className="form-grid"><label>Class / status<select value={profile.classLevel} onChange={e=>setProfile(p=>({...p,classLevel:e.target.value}))}><option>Class 11</option><option>Class 12</option><option>Dropper</option><option>Other</option></select></label><label>Target year<input value={profile.targetYear} onChange={e=>setProfile(p=>({...p,targetYear:e.target.value}))}/></label></div>
  <div className="form-grid"><label>Preparation mode<select value={profile.preparationMode} onChange={e=>setProfile(p=>({...p,preparationMode:e.target.value as AppState["profile"]["preparationMode"]}))}><option>Self-study</option><option>Coaching</option><option>Hybrid</option></select></label><label>Learning medium<select value={profile.learningMedium} onChange={e=>setProfile(p=>({...p,learningMedium:e.target.value as AppState["profile"]["learningMedium"]}))}><option>English</option><option>Hindi</option><option>Bilingual</option></select></label></div>
  <div className="form-grid"><label>Preparation target<input value={profile.target} onChange={e=>setProfile(p=>({...p,target:e.target.value}))}/></label><label>Target rank / score<input value={profile.targetRank} onChange={e=>setProfile(p=>({...p,targetRank:e.target.value}))}/></label></div>
  <div className="form-grid"><label>Target institution<input value={profile.targetCollege} onChange={e=>setProfile(p=>({...p,targetCollege:e.target.value}))}/></label><label>Preferred branch / course<input value={profile.targetBranch} onChange={e=>setProfile(p=>({...p,targetBranch:e.target.value}))}/></label></div>
  <div className="form-grid"><label>Daily target (hours)<input type="number" min="1" max="18" value={profile.dailyHours} onChange={e=>setProfile(p=>({...p,dailyHours:Number(e.target.value)}))}/></label><label>Personal exam date (optional)<input type="date" value={profile.examDate} onChange={e=>setProfile(p=>({...p,examDate:e.target.value}))}/></label></div>
  <label>Current preparation stage<select value={profile.currentStatus} onChange={e=>setProfile(p=>({...p,currentStatus:e.target.value as AppState["profile"]["currentStatus"]}))}><option>Starting</option><option>In progress</option><option>Revision</option><option>Mock-test phase</option></select></label>
  <Button type="submit"><Check size={15}/> Save profile</Button>
 </form></Card><div className="page-stack">
  <Card><small>DATA PORTABILITY</small><h3>Backup and restore</h3><p className="muted">Export profile, syllabus marks, lectures, manual and verified focus records, attempts, tests, revision items, tasks, notes, formulas, flashcards and imported questions.</p><Button variant="secondary" onClick={exportData}><Download size={15}/> Export complete workspace</Button><input ref={importRef} type="file" hidden accept=".json,application/json" onChange={e=>{const f=e.target.files?.[0];if(f)void restore(f);e.currentTarget.value="";}}/><Button variant="ghost" onClick={()=>importRef.current?.click()}><FileText size={15}/> Restore from JSON backup</Button></Card>
  <Card><small>ACTIVE EXAM PATTERN</small><h3>{EXAM_TRACKS[profile.examTrack].name}</h3><div className="metric"><span>Pattern status</span><b>{EXAM_TRACKS[profile.examTrack].status}</b></div><div className="metric"><span>Exam date information</span><b>{EXAM_TRACKS[profile.examTrack].dateLabel}</b></div><a className="text-link" href={EXAM_TRACKS[profile.examTrack].officialSource} target="_blank" rel="noreferrer">Open official source <ArrowRight size={14}/></a></Card>
  <Card><small>APPLICATION STATUS</small><h3>Current workspace mode</h3><div className="metric"><span>Saved storage</span><b>This browser / device</b></div><div className="metric"><span>Cloud authentication</span><b>Not connected</b></div><div className="metric"><span>Cross-device sync</span><b>Not connected</b></div><div className="metric"><span>Webcam verification</span><b>Not enabled</b></div><div className="metric"><span>AI model provider</span><b>Optional server configuration</b></div><p className="disclaimer">This version is not yet a multi-user production service. Connect a dedicated Firebase project, owner-only rules, authenticated server requests and file storage before onboarding external students.</p></Card>
  <Card><small>RESET</small><h3>Clear local workspace</h3><Button variant="danger" onClick={()=>{if(confirm("This clears all ACHIEVER data stored in this browser. Export a backup first. Continue?")){localStorage.removeItem("achiever-jee-neet-v1");localStorage.removeItem(FOCUS_KEY);localStorage.removeItem("achiever-onboarded");location.reload();}}}><Trash2 size={15}/> Reset local data</Button></Card>
 </div></div>;
}
function Jarvis({state,onClose,onNavigate,onAsk}:{state:AppState;onClose:()=>void;onNavigate:(p:PageKey)=>void;onAsk:(message:string)=>Promise<string>}){
 const [listening,setListening]=useState(false);const [said,setSaid]=useState("");const [reply,setReply]=useState("Namaste. I am J.A.R.V.I.S. Tell me how I can help with your preparation.");const recognition=useRef<any>(null);
 const speak=(text:string)=>{if("speechSynthesis" in window){speechSynthesis.cancel();const v=new SpeechSynthesisUtterance(text);v.lang="en-IN";v.rate=.96;speechSynthesis.speak(v);}};
 const handle=async(text:string)=>{
  const m=text.toLowerCase();
  if(m.includes("timer")||m.includes("focus")||m.includes("start study"))onNavigate("focus");
  else if(m.includes("mock")||m.includes("test"))onNavigate("mocks");
  else if(m.includes("analytics")||m.includes("weak")||m.includes("accuracy")||m.includes("progress"))onNavigate("analytics");
  else if(m.includes("roadmap")||m.includes("syllabus"))onNavigate("roadmap");
  setSaid(text);
  setReply("Let me check your preparation context…");
  try{const answer=await onAsk(text);setReply(answer);speak(answer);}
  catch{const answer="I couldn't reach the mentor service right now. Please try again or open AI Mentor.";setReply(answer);speak(answer);}
 };
 const listen=()=>{const w=window as any;const Api=w.SpeechRecognition||w.webkitSpeechRecognition;if(!Api){setReply("Voice recognition is not available in this browser. Open AI Mentor to type a message.");return;}try{const r=new Api();r.lang="en-IN";r.interimResults=false;r.maxAlternatives=1;r.onresult=(e:any)=>handle(e.results[0][0].transcript);r.onend=()=>setListening(false);r.onerror=()=>setListening(false);recognition.current=r;r.start();setListening(true);}catch{setListening(false);}};
 useEffect(()=>()=>{recognition.current?.stop();speechSynthesis?.cancel();},[]);
 return <div className="jarvis-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div className="jarvis-window"><div className="jarvis-head"><b><Brain size={17}/> J.A.R.V.I.S.</b><small>Personal study assistant</small><button onClick={onClose}><X size={18}/></button></div><div className="jarvis-orb-wrap"><div className={"jarvis-orb "+(listening?"listening":"")}><Mic size={31}/></div><span>{listening?"Listening…":"Ready when you are"}</span></div><div className="jarvis-message"><small>ASSISTANT</small><p>{reply}</p>{said&&<em>You said: “{said}”</em>}</div><div className="jarvis-actions"><Button onClick={listen}><Mic size={15}/>{listening?"Listening":"Speak to JARVIS"}</Button><Button variant="secondary" onClick={()=>speak(reply)}><Volume2 size={15}/> Repeat</Button><Button variant="ghost" onClick={()=>{onClose();onNavigate("mentor");}}>Open AI Mentor</Button></div><small className="jarvis-note">Uses your browser's speech features. Live AI answers require provider configuration.</small></div></div>;
}
