import type {ExamKey} from "./data";
export type ExamTrack="jee-main"|"jee-advanced"|"neet-ug";
export type ExamTrackConfig={
 id:ExamTrack;name:string;exam:ExamKey;year:string;patternVersion:string;
 durationMinutes:number|null;questionCount:number|null;answerableCount:number|null;
 totalMarks:number|null;mode:string;status:"published"|"variable"|"pending-bulletin";
 correctMarks:number|null;wrongMarks:number|null;unansweredMarks:number;
 sections:{id:string;label:string;questionCount:number|null}[];
 dateLabel:string;dateStart?:string;dateEnd?:string;dateList?:string[];exactDate?:string;
 officialSource:string;notes:string;
};
export const EXAM_TRACKS:Record<ExamTrack,ExamTrackConfig>={
 "jee-main":{
  id:"jee-main",name:"JEE Main Paper 1 (B.E./B.Tech)",exam:"JEE",year:"2027",
  patternVersion:"NTA-JEE-MAIN-2027-PAPER1-reviewed-2026-11-23",
  durationMinutes:180,questionCount:75,answerableCount:75,totalMarks:300,mode:"Computer-based test",
  status:"published",correctMarks:4,wrongMarks:-1,unansweredMarks:0,
  sections:[{id:"physics",label:"Physics",questionCount:25},{id:"chemistry",label:"Chemistry",questionCount:25},{id:"mathematics",label:"Mathematics",questionCount:25}],
  dateLabel:"Session 1 dates: 20, 21, 22, 23, 24 and 28 January 2027; Session 2: 2–7 April 2027. Candidate-specific shift/date is on the admit card.",
  dateStart:"2027-01-20",dateEnd:"2027-01-28",dateList:["2027-01-20","2027-01-21","2027-01-22","2027-01-23","2027-01-24","2027-01-28"],officialSource:"https://nta.gov.in/exams/jee/",
  notes:"NTA's current JEE Main 2027 page lists 75 compulsory questions (25 each in Physics, Chemistry and Mathematics), 3 hours, 300 marks and +4/−1/0. The NTA 2027 FAQ lists Session 1 dates as 20, 21, 22, 23, 24 and 28 January 2027, and Session 2 dates as 2–7 April 2027. Candidate-specific dates vary."
 },
 "jee-advanced":{
  id:"jee-advanced",name:"JEE Advanced",exam:"JEE",year:"2027",
  patternVersion:"JEE-ADVANCED-2027-pattern-pending-brochure",
  durationMinutes:null,questionCount:null,answerableCount:null,totalMarks:null,mode:"Computer-based examination (paper details pending)",
  status:"pending-bulletin",correctMarks:null,wrongMarks:null,unansweredMarks:0,
  sections:[{id:"physics",label:"Physics",questionCount:null},{id:"chemistry",label:"Chemistry",questionCount:null},{id:"mathematics",label:"Mathematics",questionCount:null}],
  dateLabel:"23 May 2027 (Sunday). 2027 question structure and marking scheme must be set from the official brochure.",
  exactDate:"2027-05-23",officialSource:"https://jeeadv.ac.in/",
  notes:"The official JEE Advanced 2027 site lists the examination on 23 May 2027. Its 2027 paper structure and marking scheme are deliberately not assumed here; configure them from the official information brochure when published."
 },
 "neet-ug":{
  id:"neet-ug",name:"NEET UG",exam:"NEET",year:"2027",
  patternVersion:"NTA-NEET-UG-2027-overview-bulletin-pending",
  durationMinutes:200,questionCount:200,answerableCount:180,totalMarks:720,mode:"Pen-and-paper (OMR-based test)",
  status:"pending-bulletin",correctMarks:4,wrongMarks:-1,unansweredMarks:0,
  sections:[{id:"physics",label:"Physics",questionCount:null},{id:"chemistry",label:"Chemistry",questionCount:null},{id:"biology",label:"Biology",questionCount:null}],
  dateLabel:"NTA's current 2027 overview indicates the first Sunday of May 2027 (2 May 2027 by calendar). Confirm the final schedule and instructions in the information bulletin expected in February 2027.",
  exactDate:"2027-05-02",officialSource:"https://nta.gov.in/exams/neet/",
  notes:"NTA's current NEET UG 2027 overview lists pen-and-paper OMR mode, 3 hours 20 minutes, 200 questions across Physics, Chemistry and Biology (180 to be answered), 720 marks and +4/−1/0. It indicates the first Sunday of May 2027; the detailed information bulletin is expected in February 2027. Subject-wise question counts and the 2027 syllabus PDF still need confirmation from the bulletin, so full-length mock simulation remains locked until the section structure is confirmed."
}
};
export const DEFAULT_TRACK:Record<ExamKey,ExamTrack>={JEE:"jee-main",NEET:"neet-ug"};
export const tracksForExam=(exam:ExamKey):ExamTrack[]=>exam==="JEE"?["jee-main","jee-advanced"]:["neet-ug"];
export const formatExamTrack=(track:ExamTrack)=>EXAM_TRACKS[track].name;
export function hasFullMockCoverage(track:ExamTrack,questions:Array<{subjectId:string}>):boolean{
 const config=EXAM_TRACKS[track];
 if(config.questionCount===null||config.answerableCount===null||config.totalMarks===null)return false;
 if(questions.length!==config.questionCount||config.sections.length===0)return false;
 if(config.sections.some(section=>section.questionCount===null))return false;
 return config.sections.every(section=>questions.filter(q=>q.subjectId===section.id).length===section.questionCount);
}
export const scoreForTrack=(track:ExamTrack,correct:number,incorrect:number)=>{
 const config=EXAM_TRACKS[track];
 if(config.correctMarks===null||config.wrongMarks===null)return {score:correct,maxScore:correct+incorrect,scoreUnit:"raw correct" as const};
 return {score:correct*config.correctMarks+incorrect*config.wrongMarks,maxScore:(correct+incorrect+0)*config.correctMarks,scoreUnit:"marks" as const};
};
