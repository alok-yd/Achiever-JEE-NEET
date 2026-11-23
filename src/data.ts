export type ExamKey = "JEE" | "NEET";
export type Subject = { id: string; name: string; color: string; chapters: string[] };
export type PracticeQuestion = {
 id: string; subjectId: string; chapter: string; year: string;
 difficulty: "Easy"|"Moderate"|"Hard"; prompt: string; options: string[];
 answer: number; explanation: string; kind: "MCQ"|"Numerical";
 sourceType?: "illustrative"|"verified-pyq"|"custom";
 examTrack?: "jee-main"|"jee-advanced"|"neet-ug";
 topic?: string; sourceLabel?: string; examSession?:string; shift?:string; paper?:string; sourceUrl?:string; verifiedAt?:string; numericalTolerance?:number;
};
export const CURRICULA: Record<ExamKey, Subject[]> = {
 JEE: [
  {id:"physics",name:"Physics",color:"#4f78df",chapters:[
   "Units and Measurements","Kinematics","Laws of Motion","Work, Energy and Power","Rotational Motion","Gravitation",
   "Properties of Solids and Liquids","Thermodynamics","Kinetic Theory of Gases","Oscillations and Waves","Electrostatics",
   "Current Electricity","Magnetic Effects of Current and Magnetism","Electromagnetic Induction and Alternating Currents",
   "Electromagnetic Waves","Optics","Dual Nature of Matter and Radiation","Atoms and Nuclei","Electronic Devices","Experimental Skills"
  ]},
  {id:"chemistry",name:"Chemistry",color:"#15a884",chapters:[
   "Some Basic Concepts in Chemistry","Atomic Structure","Chemical Bonding and Molecular Structure","Chemical Thermodynamics",
   "Solutions","Equilibrium","Redox Reactions and Electrochemistry","Chemical Kinetics",
   "Classification of Elements and Periodicity in Properties","p-Block Elements","d- and f-Block Elements","Coordination Compounds",
   "Purification and Characterisation of Organic Compounds","Some Basic Principles of Organic Chemistry","Hydrocarbons",
   "Organic Compounds Containing Halogens","Organic Compounds Containing Oxygen","Organic Compounds Containing Nitrogen",
   "Biomolecules","Principles Related to Practical Chemistry"
  ]},
  {id:"mathematics",name:"Mathematics",color:"#b16bd6",chapters:[
   "Sets, Relations and Functions","Complex Numbers and Quadratic Equations","Matrices and Determinants","Permutations and Combinations",
   "Binomial Theorem and its Simple Applications","Sequence and Series","Limit, Continuity and Differentiability",
   "Integral Calculus","Differential Equations","Coordinate Geometry","Three-Dimensional Geometry","Vector Algebra",
   "Statistics and Probability","Trigonometry"
  ]}
 ],
 // NEET 2027 syllabus is not published on the current NTA NEET portal as of 23 Nov 2026.
 // These are editable planning headings, not an official 2027 syllabus claim.
 NEET: [
  {id:"physics",name:"Physics",color:"#4f78df",chapters:["Physics & Measurement","Kinematics","Laws of Motion","Work, Energy & Power","Rotational Motion","Gravitation","Properties of Solids & Liquids","Thermodynamics","Kinetic Theory","Oscillations & Waves","Electrostatics","Current Electricity","Magnetic Effects of Current","Electromagnetic Induction","Alternating Current","Electromagnetic Waves","Optics","Dual Nature","Atoms & Nuclei","Electronic Devices"]},
  {id:"chemistry",name:"Chemistry",color:"#15a884",chapters:["Some Basic Concepts","Atomic Structure","Chemical Bonding","Chemical Thermodynamics","Solutions","Equilibrium","Redox & Electrochemistry","Chemical Kinetics","Periodic Classification","p-Block Elements","d- and f-Block Elements","Coordination Compounds","Organic Chemistry Basics","Hydrocarbons","Haloalkanes & Haloarenes","Alcohols, Phenols & Ethers","Aldehydes, Ketones & Carboxylic Acids","Amines","Biomolecules"]},
  {id:"botany",name:"Botany",color:"#20a77a",chapters:["The Living World","Biological Classification","Plant Kingdom","Morphology of Flowering Plants","Anatomy of Flowering Plants","Cell: The Unit of Life","Biomolecules","Cell Cycle & Cell Division","Photosynthesis","Respiration in Plants","Plant Growth & Development","Sexual Reproduction in Flowering Plants","Principles of Inheritance","Molecular Basis of Inheritance","Evolution","Organisms & Populations","Ecosystem","Biodiversity & Conservation"]},
  {id:"zoology",name:"Zoology",color:"#d18b36",chapters:["Animal Kingdom","Structural Organisation in Animals","Breathing & Exchange of Gases","Body Fluids & Circulation","Excretory Products & Elimination","Locomotion & Movement","Neural Control & Coordination","Chemical Coordination","Human Reproduction","Reproductive Health","Human Health & Disease","Microbes in Human Welfare","Biotechnology Principles","Biotechnology Applications"]}
 ]
};
export const SYLLABUS_STATUS:Record<ExamKey,{status:"official-2027"|"provisional-2027";label:string;source:string;details:string}> = {
 JEE:{status:"official-2027",label:"NTA JEE Main 2027 Paper 1 unit headings",source:"https://jeemain.nta.nic.in/document/syllabus-2027/",details:"The NTA JEE Main 2027 syllabus listing is published. This Roadmap uses its 20 Physics, 20 Chemistry and 14 Mathematics unit headings. Verify the full subtopic wording against the official PDF; this screen tracks units, not every line item."},
 NEET:{status:"provisional-2027",label:"Provisional planning map — NEET UG 2027 bulletin pending",source:"https://neet.nta.nic.in/",details:"As of 23 November 2026, the NTA NEET portal lists 2026 information bulletin and syllabus documents, not a 2027 syllabus. These chapter labels are planning aids only. Do not assume the 2026 NEET syllabus or pattern is confirmed for 2027."}
};
export const SUBJECT_GROUPS:Record<ExamKey,Record<string,string[]>>={
 JEE:{
  physics:["Mechanics","Properties of Matter and Thermal Physics","Oscillations and Waves","Electromagnetism","Optics and Modern Physics","Electronics and Experimental Skills"],
  chemistry:["Physical Chemistry","Inorganic Chemistry","Organic Chemistry and Practical Chemistry"],
  mathematics:["Algebra","Calculus","Coordinate Geometry","Vectors and Three-Dimensional Geometry","Statistics and Trigonometry"]
 },
 NEET:{
  physics:["Mechanics","Properties of Matter & Thermal Physics","Oscillations and Waves","Electromagnetism","Optics and Modern Physics"],
  chemistry:["Physical Chemistry","Inorganic Chemistry","Organic Chemistry"],
  botany:["Diversity and Structure","Cell Biology and Plant Physiology","Plant Reproduction and Genetics","Ecology and Environment"],
  zoology:["Animal Diversity and Organisation","Human Physiology","Human Reproduction and Health","Biotechnology and Evolution"]
 }
};
export const CHAPTER_GROUPS:Record<ExamKey,Record<string,Record<string,string>>> = {
 JEE:{
  physics:{
   "Units and Measurements":"Mechanics","Kinematics":"Mechanics","Laws of Motion":"Mechanics","Work, Energy and Power":"Mechanics","Rotational Motion":"Mechanics","Gravitation":"Mechanics",
   "Properties of Solids and Liquids":"Properties of Matter and Thermal Physics","Thermodynamics":"Properties of Matter and Thermal Physics","Kinetic Theory of Gases":"Properties of Matter and Thermal Physics",
   "Oscillations and Waves":"Oscillations and Waves","Electrostatics":"Electromagnetism","Current Electricity":"Electromagnetism","Magnetic Effects of Current and Magnetism":"Electromagnetism",
   "Electromagnetic Induction and Alternating Currents":"Electromagnetism","Electromagnetic Waves":"Electromagnetism","Optics":"Optics and Modern Physics",
   "Dual Nature of Matter and Radiation":"Optics and Modern Physics","Atoms and Nuclei":"Optics and Modern Physics","Electronic Devices":"Electronics and Experimental Skills","Experimental Skills":"Electronics and Experimental Skills"
  },
  chemistry:{
   "Some Basic Concepts in Chemistry":"Physical Chemistry","Atomic Structure":"Physical Chemistry","Chemical Thermodynamics":"Physical Chemistry","Solutions":"Physical Chemistry","Equilibrium":"Physical Chemistry","Redox Reactions and Electrochemistry":"Physical Chemistry","Chemical Kinetics":"Physical Chemistry",
   "Classification of Elements and Periodicity in Properties":"Inorganic Chemistry","p-Block Elements":"Inorganic Chemistry","d- and f-Block Elements":"Inorganic Chemistry","Coordination Compounds":"Inorganic Chemistry","Chemical Bonding and Molecular Structure":"Inorganic Chemistry",
   "Purification and Characterisation of Organic Compounds":"Organic Chemistry and Practical Chemistry","Some Basic Principles of Organic Chemistry":"Organic Chemistry and Practical Chemistry","Hydrocarbons":"Organic Chemistry and Practical Chemistry","Organic Compounds Containing Halogens":"Organic Chemistry and Practical Chemistry","Organic Compounds Containing Oxygen":"Organic Chemistry and Practical Chemistry","Organic Compounds Containing Nitrogen":"Organic Chemistry and Practical Chemistry","Biomolecules":"Organic Chemistry and Practical Chemistry","Principles Related to Practical Chemistry":"Organic Chemistry and Practical Chemistry"
  },
  mathematics:{
   "Sets, Relations and Functions":"Algebra","Complex Numbers and Quadratic Equations":"Algebra","Matrices and Determinants":"Algebra","Permutations and Combinations":"Algebra","Binomial Theorem and its Simple Applications":"Algebra","Sequence and Series":"Algebra",
   "Limit, Continuity and Differentiability":"Calculus","Integral Calculus":"Calculus","Differential Equations":"Calculus",
   "Coordinate Geometry":"Coordinate Geometry","Three-Dimensional Geometry":"Vectors and Three-Dimensional Geometry","Vector Algebra":"Vectors and Three-Dimensional Geometry",
   "Statistics and Probability":"Statistics and Trigonometry","Trigonometry":"Statistics and Trigonometry"
  }
 },
 NEET:{
  physics:{"Physics & Measurement":"Mechanics","Kinematics":"Mechanics","Laws of Motion":"Mechanics","Work, Energy & Power":"Mechanics","Rotational Motion":"Mechanics","Gravitation":"Mechanics","Properties of Solids & Liquids":"Properties of Matter & Thermal Physics","Thermodynamics":"Properties of Matter & Thermal Physics","Kinetic Theory":"Properties of Matter & Thermal Physics","Oscillations & Waves":"Oscillations and Waves","Electrostatics":"Electromagnetism","Current Electricity":"Electromagnetism","Magnetic Effects of Current":"Electromagnetism","Electromagnetic Induction":"Electromagnetism","Alternating Current":"Electromagnetism","Electromagnetic Waves":"Electromagnetism","Optics":"Optics and Modern Physics","Dual Nature":"Optics and Modern Physics","Atoms & Nuclei":"Optics and Modern Physics","Electronic Devices":"Optics and Modern Physics"},
  chemistry:{"Some Basic Concepts":"Physical Chemistry","Atomic Structure":"Physical Chemistry","Chemical Thermodynamics":"Physical Chemistry","Solutions":"Physical Chemistry","Equilibrium":"Physical Chemistry","Redox & Electrochemistry":"Physical Chemistry","Chemical Kinetics":"Physical Chemistry","Periodic Classification":"Inorganic Chemistry","p-Block Elements":"Inorganic Chemistry","d- and f-Block Elements":"Inorganic Chemistry","Coordination Compounds":"Inorganic Chemistry","Chemical Bonding":"Inorganic Chemistry","Organic Chemistry Basics":"Organic Chemistry","Hydrocarbons":"Organic Chemistry","Haloalkanes & Haloarenes":"Organic Chemistry","Alcohols, Phenols & Ethers":"Organic Chemistry","Aldehydes, Ketones & Carboxylic Acids":"Organic Chemistry","Amines":"Organic Chemistry","Biomolecules":"Organic Chemistry"},
  botany:{"The Living World":"Diversity and Structure","Biological Classification":"Diversity and Structure","Plant Kingdom":"Diversity and Structure","Morphology of Flowering Plants":"Diversity and Structure","Anatomy of Flowering Plants":"Diversity and Structure","Cell: The Unit of Life":"Cell Biology and Plant Physiology","Biomolecules":"Cell Biology and Plant Physiology","Cell Cycle & Cell Division":"Cell Biology and Plant Physiology","Photosynthesis":"Cell Biology and Plant Physiology","Respiration in Plants":"Cell Biology and Plant Physiology","Plant Growth & Development":"Cell Biology and Plant Physiology","Sexual Reproduction in Flowering Plants":"Plant Reproduction and Genetics","Principles of Inheritance":"Plant Reproduction and Genetics","Molecular Basis of Inheritance":"Plant Reproduction and Genetics","Evolution":"Plant Reproduction and Genetics","Organisms & Populations":"Ecology and Environment","Ecosystem":"Ecology and Environment","Biodiversity & Conservation":"Ecology and Environment"},
  zoology:{"Animal Kingdom":"Animal Diversity and Organisation","Structural Organisation in Animals":"Animal Diversity and Organisation","Breathing & Exchange of Gases":"Human Physiology","Body Fluids & Circulation":"Human Physiology","Excretory Products & Elimination":"Human Physiology","Locomotion & Movement":"Human Physiology","Neural Control & Coordination":"Human Physiology","Chemical Coordination":"Human Physiology","Human Reproduction":"Human Reproduction and Health","Reproductive Health":"Human Reproduction and Health","Human Health & Disease":"Human Reproduction and Health","Microbes in Human Welfare":"Human Reproduction and Health","Biotechnology Principles":"Biotechnology and Evolution","Biotechnology Applications":"Biotechnology and Evolution"}
 }
};
export const SAMPLE_QUESTIONS: Record<ExamKey, PracticeQuestion[]> = {
 JEE:[
  {id:"jee-p-01",subjectId:"physics",chapter:"Current Electricity",year:"Practice",difficulty:"Easy",kind:"MCQ",prompt:"Two resistors of 2 Ω and 3 Ω are connected in series. Their equivalent resistance is:",options:["1.2 Ω","5 Ω","6 Ω","2.5 Ω"],answer:1,explanation:"For series combination, resistances add: R = 2 + 3 = 5 Ω.",sourceType:"illustrative",sourceLabel:"ACHIEVER starter practice"},
  {id:"jee-p-02",subjectId:"physics",chapter:"Kinematics",year:"Practice",difficulty:"Easy",kind:"MCQ",prompt:"A body starts from rest and moves with uniform acceleration 2 m/s² for 3 s. Its final speed is:",options:["3 m/s","5 m/s","6 m/s","9 m/s"],answer:2,explanation:"Use v = u + at = 0 + 2 × 3 = 6 m/s.",sourceType:"illustrative",sourceLabel:"ACHIEVER starter practice"},
  {id:"jee-c-01",subjectId:"chemistry",chapter:"Some Basic Concepts in Chemistry",year:"Practice",difficulty:"Easy",kind:"MCQ",prompt:"The number of moles present in 18 g of H₂O is:",options:["0.5 mol","1 mol","2 mol","18 mol"],answer:1,explanation:"Molar mass of water is 18 g mol⁻¹. Moles = 18/18 = 1 mol.",sourceType:"illustrative",sourceLabel:"ACHIEVER starter practice"},
  {id:"jee-c-02",subjectId:"chemistry",chapter:"Chemical Bonding and Molecular Structure",year:"Practice",difficulty:"Moderate",kind:"MCQ",prompt:"The shape of an isolated methane (CH₄) molecule is:",options:["Square planar","Trigonal planar","Tetrahedral","Linear"],answer:2,explanation:"Four bond pairs around carbon arrange tetrahedrally to minimize repulsion.",sourceType:"illustrative",sourceLabel:"ACHIEVER starter practice"},
  {id:"jee-m-01",subjectId:"mathematics",chapter:"Limit, Continuity and Differentiability",year:"Practice",difficulty:"Easy",kind:"MCQ",prompt:"If f(x) = x², then f′(3) equals:",options:["3","6","9","12"],answer:1,explanation:"f′(x) = 2x, hence f′(3) = 6.",sourceType:"illustrative",sourceLabel:"ACHIEVER starter practice"},
  {id:"jee-m-02",subjectId:"mathematics",chapter:"Matrices and Determinants",year:"Practice",difficulty:"Moderate",kind:"MCQ",prompt:"The determinant of [[2, 1], [3, 4]] is:",options:["5","8","11","14"],answer:0,explanation:"For a 2×2 matrix, determinant = ad − bc = 2×4 − 1×3 = 5.",sourceType:"illustrative",sourceLabel:"ACHIEVER starter practice"}
 ],
 NEET:[
  {id:"neet-p-01",subjectId:"physics",chapter:"Kinematics",year:"Practice",difficulty:"Easy",kind:"MCQ",prompt:"A body starts from rest with acceleration 2 m/s². Its speed after 3 s is:",options:["3 m/s","5 m/s","6 m/s","9 m/s"],answer:2,explanation:"v = u + at = 0 + 2 × 3 = 6 m/s.",sourceType:"illustrative",sourceLabel:"ACHIEVER starter practice"},
  {id:"neet-c-01",subjectId:"chemistry",chapter:"Some Basic Concepts",year:"Practice",difficulty:"Easy",kind:"MCQ",prompt:"The number of moles in 18 g of water is:",options:["0.5","1","2","18"],answer:1,explanation:"Molar mass of H₂O = 18 g mol⁻¹, so n = 18/18 = 1 mol.",sourceType:"illustrative",sourceLabel:"ACHIEVER starter practice"},
  {id:"neet-b-01",subjectId:"botany",chapter:"Cell: The Unit of Life",year:"Practice",difficulty:"Easy",kind:"MCQ",prompt:"The site of photosynthesis in a plant cell is the:",options:["Mitochondrion","Chloroplast","Ribosome","Golgi apparatus"],answer:1,explanation:"Chloroplasts contain chlorophyll and the machinery for photosynthesis.",sourceType:"illustrative",sourceLabel:"ACHIEVER starter practice"},
  {id:"neet-z-01",subjectId:"zoology",chapter:"Body Fluids & Circulation",year:"Practice",difficulty:"Easy",kind:"MCQ",prompt:"The average life span of a human red blood cell is approximately:",options:["30 days","60 days","120 days","240 days"],answer:2,explanation:"Human erythrocytes circulate for about 120 days before being removed mainly by the spleen.",sourceType:"illustrative",sourceLabel:"ACHIEVER starter practice"},
  {id:"neet-b-02",subjectId:"botany",chapter:"Biomolecules",year:"Practice",difficulty:"Moderate",kind:"MCQ",prompt:"Which bond links amino acids in a polypeptide chain?",options:["Glycosidic bond","Peptide bond","Phosphodiester bond","Hydrogen bond"],answer:1,explanation:"A peptide bond forms between the carboxyl group of one amino acid and the amino group of another.",sourceType:"illustrative",sourceLabel:"ACHIEVER starter practice"},
  {id:"neet-z-02",subjectId:"zoology",chapter:"Neural Control & Coordination",year:"Practice",difficulty:"Moderate",kind:"MCQ",prompt:"The functional gap between two neurons is called a:",options:["Node of Ranvier","Synapse","Axon hillock","Myelin sheath"],answer:1,explanation:"A synapse is the functional junction through which a signal passes from one neuron to another.",sourceType:"illustrative",sourceLabel:"ACHIEVER starter practice"}
 ]
};
export const EXAM_RULES = {
 JEE:{label:"JEE Main Paper 1 (2027)",durationMinutes:180,questions:75,answerable:75,marksCorrect:4,marksWrong:-1,totalMarks:300,mode:"Computer-based test",note:"NTA JEE Main 2027: 75 compulsory questions, 25 each in Physics, Chemistry and Mathematics; 3 hours and 300 marks. Recheck the candidate-specific schedule and final bulletin."},
 NEET:{label:"NEET UG (2027)",durationMinutes:null,questions:null,answerable:null,marksCorrect:null,marksWrong:null,totalMarks:null,mode:"Pending official 2027 information bulletin",note:"The NTA NEET portal currently lists 2026 information bulletin and syllabus documents only. Date, duration, question count, answerable count, total marks and marking for NEET UG 2027 remain unconfirmed as of 23 November 2026."}
} as const;
export const EXAM_DATES: Record<ExamKey,string> = {JEE:"",NEET:""};
export const PAGE_ITEMS = [
 ["Dashboard","dashboard"],["Study Planner","planner"],["Roadmap","roadmap"],["AI Focus","focus"],["Lecture Tracker","lectures"],["PYQ Execution Tracker","pyq"],["Question Bank","questions"],["Mock Tests","mocks"],["Test Performance","performance"],["Revision","revision"],["Digital Notebook","notebook"],["Health Tracker","health"],["AI Mentor","mentor"],["AI Analytics","analytics"],["Strategy & Tips","strategy"],["Settings","settings"]
] as const;
