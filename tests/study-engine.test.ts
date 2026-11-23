import {describe,it,expect} from "vitest";
import {defaultState,subjectStats,type Attempt} from "../src/store";
import {buildAnalytics,buildStudentContext} from "../src/services/analytics-engine";
import {createMistakeRevision,markAttemptWithRevision,scheduleChapterRevision} from "../src/services/study-engine";
import {EXAM_TRACKS,scoreForTrack} from "../src/exam-config";

const localDate=(offset=0)=>{
 const d=new Date();d.setDate(d.getDate()+offset);
 return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
};
const attempt=(overrides:Partial<Attempt>={}):Attempt=>({
 id:"attempt-1",questionId:"q-1",subjectId:"physics",chapter:"Kinematics",
 result:"incorrect",difficulty:"Moderate",seconds:75,date:localDate(),
 mistakeCategory:"Conceptual",attemptType:"Practice",examTrack:"jee-main",
 ...overrides
});

describe("ACHIEVER study record engine",()=>{
 it("creates the six spaced revision dates from the configured intervals",()=>{
  const rows=scheduleChapterRevision("physics","Kinematics","Review","2027-01-01");
  expect(rows).toHaveLength(6);
  expect(rows.map(x=>x.dueDate)).toEqual(["2027-01-01","2027-01-02","2027-01-04","2027-01-08","2027-01-16","2027-01-31"]);
  expect(rows.map(x=>x.intervalDay)).toEqual([0,1,3,7,15,30]);
 });
 it("creates mistake review metadata from an incorrect attempt",()=>{
  const row=createMistakeRevision(attempt());
  expect(row.source).toBe("mistake");
  expect(row.chapter).toBe("Kinematics");
  expect(row.notes).toBe("Conceptual");
  expect(row.dueDate).toBe(localDate(1));
 });
 it("adds an incorrect attempt, review item and event in one state transition",()=>{
  const state=defaultState();
  const next=markAttemptWithRevision(state,attempt());
  expect(next.attempts).toHaveLength(1);
  expect(next.revisions).toHaveLength(1);
  expect(next.events[0].type).toBe("attempt_logged");
 });
 it("excludes skipped attempts from subject accuracy",()=>{
  const state=defaultState();
  state.attempts=[attempt({result:"correct"}),attempt({id:"a2",result:"incorrect"}),attempt({id:"a3",result:"skipped"})];
  const physics=subjectStats(state).find(x=>x.id==="physics");
  expect(physics?.attempts).toBe(2);
  expect(physics?.accuracy).toBe(50);
 });
});

describe("analytics",()=>{
 it("computes per-subject accuracy using only attempts in the selected time window",()=>{
  const state=defaultState();
  state.attempts=[
   attempt({id:"recent-1",result:"correct",date:localDate()}),
   attempt({id:"recent-2",result:"incorrect",date:localDate()}),
   attempt({id:"old-1",result:"incorrect",date:localDate(-50)}),
   attempt({id:"old-2",result:"incorrect",date:localDate(-50)}),
   attempt({id:"old-3",result:"incorrect",date:localDate(-50)}),
   attempt({id:"old-4",result:"incorrect",date:localDate(-50)}),
   attempt({id:"old-5",result:"incorrect",date:localDate(-50)})
  ];
  const result=buildAnalytics(state,30);
  const physics=result.subjects.find(x=>x.id==="physics");
  expect(result.attemptCount).toBe(2);
  expect(physics?.attempts).toBe(2);
  expect(physics?.accuracy).toBe(50);
  expect(result.weakest).toBeNull();
 });
 it("does not expose any question-bank content in generic context without a query",()=>{
  const state=defaultState();
  expect(buildStudentContext(state)).not.toContain("Question bank item");
 });
 it("retrieves relevant student notes when a matching topic is asked",()=>{
  const state=defaultState();
  state.notes=[{id:"n1",title:"Newton laws",body:"Momentum conservation and free body diagrams",subjectId:"physics",chapter:"Laws of Motion",updatedAt:new Date().toISOString(),kind:"note"}];
  expect(buildStudentContext(state,"momentum free body")).toContain("Newton laws");
 });
});

describe("exam configuration",()=>{
 it("keeps JEE Main scoring separate from JEE Advanced variable scoring",()=>{
  expect(scoreForTrack("jee-main",10,2)).toEqual({score:38,maxScore:48,scoreUnit:"marks"});
  expect(scoreForTrack("jee-advanced",10,2)).toEqual({score:10,maxScore:12,scoreUnit:"raw correct"});
  expect(EXAM_TRACKS["jee-advanced"].correctMarks).toBeNull();
 });
 it("retains the NEET answerable question limit in its configuration",()=>{
  expect(EXAM_TRACKS["neet-ug"].questionCount).toBe(200);
  expect(EXAM_TRACKS["neet-ug"].answerableCount).toBe(180);
 });
});
