import type {Attempt,AppState,RevisionItem,StudyEvent} from "../store";
import {uid} from "../store";

const localDate=(offset=0)=>{
 const d=new Date();d.setDate(d.getDate()+offset);
 return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
};
export const REVISION_INTERVALS_DAYS=[0,1,3,7,15,30] as const;
export function scheduleChapterRevision(subjectId:string,chapter:string,titlePrefix="Revise",startDate=localDate()):RevisionItem[]{
 return REVISION_INTERVALS_DAYS.map((day,index)=>{
  const d=new Date(startDate+"T12:00:00");d.setDate(d.getDate()+day);
  const dueDate=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  return {id:uid(),title:titlePrefix+" "+chapter+(index===0?" — same day":" — "+day+" day review"),
   subjectId,chapter,dueDate,done:false,source:"chapter",intervalDay:day,stage:index};
 });
}
export function createMistakeRevision(a:Attempt):RevisionItem{
 return {id:uid(),title:"Review incorrect question — "+a.chapter,subjectId:a.subjectId,chapter:a.chapter,
  dueDate:localDate(1),done:false,source:"mistake",intervalDay:1,stage:1,notes:a.mistakeCategory||a.mistake};
}
export function chapterActivity(state:AppState,subjectId:string,chapter:string){
 const lectures=state.lectures.filter(x=>x.subjectId===subjectId&&x.chapter===chapter);
 const attempts=state.attempts.filter(x=>x.subjectId===subjectId&&x.chapter===chapter&&x.result!=="skipped");
 const correct=attempts.filter(x=>x.result==="correct").length;
 const revisions=state.revisions.filter(x=>x.subjectId===subjectId&&x.chapter===chapter);
 const manuallyComplete=state.completedChapters.includes(subjectId+"::"+chapter);
 const lectureDone=lectures.filter(x=>x.completed).length;
 const lecturePct=lectures.length?Math.round(lectureDone/lectures.length*100):0;
 const accuracy=attempts.length?Math.round(correct/attempts.length*100):0;
 // Activity score is a progress signal only; manual mastery remains explicitly controlled by the student.
 const activityPct=Math.round((lecturePct*0.4)+(Math.min(100,attempts.length*5)*0.4)+(revisions.some(x=>x.done)?20:0));
 return {lectures:lectures.length,lectureDone,lectureMinutes:lectures.reduce((n,x)=>n+(x.actualMinutes??x.minutes),0),
  attempts:attempts.length,correct,accuracy,revisions:revisions.length,revisionsDone:revisions.filter(x=>x.done).length,
  manuallyComplete,activityPct:manuallyComplete?100:Math.min(99,activityPct)};
}
export function eventRecord(type:StudyEvent["type"],summary:string,values:Partial<StudyEvent>={}):StudyEvent{
 return {id:uid(),type,date:localDate(),summary,...values};
}
export function markAttemptWithRevision(state:AppState,attempt:Attempt):AppState{
 const revisions=attempt.result==="incorrect"?[createMistakeRevision(attempt),...state.revisions]:state.revisions;
 return {...state,attempts:[attempt,...state.attempts],revisions,
  events:[eventRecord("attempt_logged","Logged "+attempt.result+" attempt in "+attempt.chapter,{subjectId:attempt.subjectId,chapter:attempt.chapter,refId:attempt.id}),...state.events]};
}
