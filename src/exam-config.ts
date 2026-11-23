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
  id:"neet-ug",name:"NEET UG (2027)",exam:"NEET",year:"2027",
  patternVersion:"NTA-NEET-UG-2027-not-yet-published",
  durationMinutes:null,questionCount:null,answerableCount:null,totalMarks:null,mode:"Pending 2027 information bulletin",
  status:"pending-bulletin",correctMarks:null,wrongMarks:null,unansweredMarks:0,
  sections:[{id:"physics",label:"Physics",questionCount:null},{id:"chemistry",label:"Chemistry",questionCount:null},{id:"biology",label:"Biology",questionCount:null}],
  dateLabel:"Not confirmed on the official NTA NEET portal as of 23 November 2026. The portal currently links to NEET UG 2026 information only; wait for the 2027 bulletin before fixing date, duration, question count or marking.",
  officialSource:"https://neet.nta.nic.in/",
  notes:"NEET UG 2027 exam date, question structure, answerable count, duration, marks, marking scheme and syllabus are not confirmed in the currently published official NTA portal content. The portal currently lists a NEET UG 2026 bulletin and syllabus. Do not reuse the 2026 pattern as a confirmed 2027 pattern. Update this versioned configuration when NTA publishes the 2027 information bulletin."
}
 }
};
export const DEFAULT_TRACK:Record<ExamKey,ExamTrack>={JEE:"jee-main",NEET:"neet-ug"};
export const tracksForExam=(exam:ExamKey):ExamTrack[]=>exam==="JEE"?["jee-main","jee-advanced"]:["neet-ug"];
export const formatExamTrack=(track:ExamTrack)=>EXAM_TRACKS[track].name;
export const scoreForTrack=(track:ExamTrack,correct:number,incorrect:number)=>{
 const config=EXAM_TRACKS[track];
 if(config.correctMarks===null||config.wrongMarks===null)return {score:correct,maxScore:correct+incorrect,scoreUnit:"raw correct" as const};
 return {score:correct*config.correctMarks+incorrect*config.wrongMarks,maxScore:(correct+incorrect+0)*config.correctMarks,scoreUnit:"marks" as const};
};
