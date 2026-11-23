import type {AppState,Attempt} from "../store";
import {subjectStats} from "../store";

const dateKey=(date:Date)=>date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0")+"-"+String(date.getDate()).padStart(2,"0");
export function buildAnalytics(state:AppState,days=30){
 const today=new Date();const from=new Date(today);from.setDate(today.getDate()-days+1);
 const inRange=(date:string)=>{const d=new Date(date+"T12:00:00");return d>=from&&d<=today;};
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
 const subjects=subjectStats(state);
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
export function buildStudentContext(state:AppState){
 const a=buildAnalytics(state,30);
 const due=state.revisions.filter(x=>!x.done&&x.dueDate<=dateKey(new Date())).length;
 const nextTasks=state.dailyTasks.filter(x=>!x.done).sort((x,y)=>x.date.localeCompare(y.date)).slice(0,5);
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
  "Weakest sampled subject: "+(a.weakest?a.weakest.name+" at "+a.weakest.accuracy+"% across "+a.weakest.attempts+" counted attempts":"insufficient data (minimum five counted attempts per subject)"),
  "Mistake categories: "+Object.entries(a.mistakes).map(([k,v])=>k+": "+v).join(", "),
  "Mock tests: "+state.tests.length+"; pending revisions due: "+due,
  "Upcoming tasks: "+nextTasks.map(x=>x.date+" "+x.title).join("; "),
  "Subject summary: "+a.subjects.map(x=>x.name+": "+x.progress+"% manually completed chapters, "+x.attempts+" attempts, "+x.accuracy+"% accuracy, "+x.lectureCount+" lectures").join("; "),
  "No rank or percentile prediction should be inferred from this data unless representative mock and cohort data are available."
 ].join("\n");
}
