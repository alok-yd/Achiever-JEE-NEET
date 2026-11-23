import type {AppState} from "../store";
import {subjectStats} from "../store";
import {SAMPLE_QUESTIONS} from "../data";

const dateKey=(date:Date)=>date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0")+"-"+String(date.getDate()).padStart(2,"0");
export function buildAnalytics(state:AppState,days=30){
 const today=new Date();const from=new Date(today);from.setDate(today.getDate()-days+1);
 const todayKey=dateKey(today);const fromKey=dateKey(from);
 const inRange=(date:string)=>date>=fromKey&&date<=todayKey;
 const sessions=state.sessions.filter(x=>inRange(x.date));
 const attempts=state.attempts.filter(x=>inRange(x.date));
 const counted=attempts.filter(x=>x.result!=="skipped");
 const correct=counted.filter(x=>x.result==="correct").length;
 const daily=Array.from({length:days},(_,i)=>{
  const d=new Date(from);d.setDate(from.getDate()+i);const key=dateKey(d);
  const daySessions=sessions.filter(s=>s.date===key);
  return {date:key,minutes:daySessions.reduce((n,x)=>n+x.minutes,0),
   verifiedMinutes:daySessions.filter(x=>x.origin==="verified"&&x.verificationStatus==="verified").reduce((n,x)=>n+x.minutes,0),
   manualMinutes:daySessions.filter(x=>x.origin!=="verified").reduce((n,x)=>n+x.minutes,0),
   attempts:attempts.filter(x=>x.date===key).length};
 });
 const mistakes:Record<string,number>={};
 attempts.filter(x=>x.result==="incorrect").forEach(x=>{const k=x.mistakeCategory||x.mistake||"Unclassified";mistakes[k]=(mistakes[k]||0)+1;});
 const averageSeconds=counted.length?Math.round(counted.reduce((n,x)=>n+x.seconds,0)/counted.length):0;
 const allSubjects=subjectStats(state);
 const subjects=allSubjects.map(subject=>{
  const subjectAttempts=counted.filter(x=>x.subjectId===subject.id);
  const subjectCorrect=subjectAttempts.filter(x=>x.result==="correct").length;
  return {...subject,attempts:subjectAttempts.length,correct:subjectCorrect,
   accuracy:subjectAttempts.length?Math.round(subjectCorrect/subjectAttempts.length*100):0};
 });
 const sufficientlySampled=subjects.filter(x=>x.attempts>=5);
 const weakest=sufficientlySampled.slice().sort((a,b)=>a.accuracy-b.accuracy)[0]||null;
 const totalMinutes=sessions.reduce((n,x)=>n+x.minutes,0);
 const weekMinutes=daily.slice(-7).reduce((n,x)=>n+x.minutes,0);
 const previousWeekMinutes=daily.slice(-14,-7).reduce((n,x)=>n+x.minutes,0);
 return {rangeDays:days,totalMinutes,verifiedMinutes:sessions.filter(x=>x.origin==="verified"&&x.verificationStatus==="verified").reduce((n,x)=>n+x.minutes,0),
  manualMinutes:sessions.filter(x=>x.origin!=="verified").reduce((n,x)=>n+x.minutes,0),daily,weekMinutes,previousWeekMinutes,
  weekDeltaMinutes:weekMinutes-previousWeekMinutes,attemptCount:attempts.length,accuracy:counted.length?Math.round(correct/counted.length*100):0,
  averageSeconds,mistakes,subjects,weakest};
}
const STOP_WORDS=new Set(["the","and","for","with","from","this","that","what","which","when","where","how","does","can","you","your","explain","please","question","solve","help","about","into","are","was","were","have","has","its","their","then","than"]);
const terms=(value:string)=>Array.from(new Set(value.toLowerCase().replace(/[^a-z0-9+.-]/g," ").split(/\s+/).filter(x=>x.length>2&&!STOP_WORDS.has(x))));
function retrieveStudentKnowledge(state:AppState,query:string,limit=5){
 const queryTerms=terms(query);if(!queryTerms.length)return [];
 const questions=[...SAMPLE_QUESTIONS[state.profile.exam],...state.customQuestions.filter(q=>q.examTrack===state.profile.examTrack||!q.examTrack)];
 const candidates:Array<{kind:string;subject:string;chapter:string;source:string;text:string;terms:string[]}>=[];
 state.notes.forEach(note=>candidates.push({kind:note.kind==="formula"?"Formula note":"Student note",subject:note.subjectId,chapter:note.chapter||"",source:"Student-authored",text:(note.title+"\n"+note.body).slice(0,1600),terms:terms(note.title+" "+note.body+" "+(note.chapter||""))}));
 state.flashcards.forEach(card=>candidates.push({kind:"Flashcard",subject:card.subjectId,chapter:card.chapter,source:"Student-authored",text:"Front: "+card.front+"\nBack: "+card.back,terms:terms(card.front+" "+card.back+" "+card.chapter)}));
 questions.forEach(q=>candidates.push({kind:"Question bank item",subject:q.subjectId,chapter:q.chapter,source:q.sourceLabel||q.sourceType||"Unknown source",text:q.prompt+"\nOptions: "+q.options.join(" | ")+"\nExplanation: "+q.explanation,terms:terms(q.prompt+" "+q.chapter+" "+(q.topic||"")+" "+q.explanation)}));
 state.attempts.filter(a=>a.result==="incorrect").slice(0,80).forEach(a=>candidates.push({kind:"Previous mistake",subject:a.subjectId,chapter:a.chapter,source:a.sourceLabel||"Attempt history",text:"Incorrect attempt: "+(a.topic||a.chapter)+". Mistake category: "+(a.mistakeCategory||a.mistake||"Unclassified")+". Notes: "+(a.notes||"No notes recorded"),terms:terms((a.topic||"")+" "+a.chapter+" "+(a.mistakeCategory||"")+" "+(a.notes||""))}));
 state.revisions.filter(x=>!x.done).forEach(x=>candidates.push({kind:"Pending revision",subject:x.subjectId,chapter:x.chapter,source:x.source,text:x.title+"\n"+(x.notes||""),terms:terms(x.title+" "+x.chapter+" "+(x.notes||""))}));
 return candidates.map(item=>{
  const overlap=queryTerms.filter(term=>item.terms.includes(term)).length;
  const score=overlap/(Math.sqrt(queryTerms.length)*Math.sqrt(Math.max(1,item.terms.length)));
  return {...item,score};
 }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,limit)
  .map((x,i)=>({rank:i+1,kind:x.kind,subject:x.subject,chapter:x.chapter,source:x.source,text:x.text,score:Number(x.score.toFixed(3))}));
}

export function buildStudentContext(state:AppState,query=""){
 const a=buildAnalytics(state,30);
 const due=state.revisions.filter(x=>!x.done&&x.dueDate<=dateKey(new Date())).length;
 const nextTasks=state.dailyTasks.filter(x=>!x.done).sort((x,y)=>x.date.localeCompare(y.date)).slice(0,5);
 const retrieved=query.trim()?retrieveStudentKnowledge(state,query):[];
 return [
  "Student: "+state.profile.name,
  "Examination: "+state.profile.examTrack+" / "+state.profile.targetYear,
  "Class/status: "+state.profile.classLevel+"; preparation mode: "+state.profile.preparationMode+"; medium: "+state.profile.learningMedium,
  "Target: "+state.profile.target+"; rank goal: "+state.profile.targetRank+"; college: "+state.profile.targetCollege+"; branch: "+state.profile.targetBranch,
  "Daily study goal: "+state.profile.dailyHours+" hours; self-reported status: "+state.profile.currentStatus,
  "Manual chapter completions: "+state.completedChapters.length,
  "Recorded lectures: "+state.lectures.length+"; completed lectures: "+state.lectures.filter(x=>x.completed).length,
  "Recorded focus minutes (all-time): "+state.sessions.reduce((n,x)=>n+x.minutes,0),
  "Last 30 days focus minutes: "+a.totalMinutes+" (verified: "+a.verifiedMinutes+", manual: "+a.manualMinutes+")",
  "Last 30 days question attempts: "+a.attemptCount+"; accuracy: "+a.accuracy+"%; average attempt time: "+a.averageSeconds+" seconds",
  "Weakest sampled subject: "+(a.weakest?a.weakest.name+" at "+a.weakest.accuracy+"% across "+a.weakest.attempts+" counted attempts":"insufficient data (minimum five counted attempts per subject in the last 30 days)"),
  "Mistake categories: "+Object.entries(a.mistakes).map(([k,v])=>k+": "+v).join(", "),
  "Mock tests: "+state.tests.length+"; pending revisions due: "+due,
  "Upcoming tasks: "+nextTasks.map(x=>x.date+" "+x.title).join("; "),
  "Subject summary (last 30 days): "+a.subjects.map(x=>x.name+": "+x.progress+"% manually completed chapters, "+x.attempts+" recent attempts, "+x.accuracy+"% recent accuracy, "+x.lectureCount+" lectures").join("; "),
  "No rank or percentile prediction should be inferred from this data unless representative mock and cohort data are available.",
  retrieved.length?"Relevant saved study material (keyword retrieval; source labels are retained and unverified content is not promoted to official PYQ):\n"+retrieved.map(x=>x.rank+". "+x.kind+" | "+x.subject+" | "+x.chapter+" | "+x.source+"\n"+x.text).join("\n\n"):""
 ].filter(Boolean).join("\n");
}
