import {applicationDefault,cert,getApps,initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {FieldValue,getFirestore} from "firebase-admin/firestore";

type IncomingAttachment={name?:string;mimeType?:string;dataUrl?:string};
type RequestLike={
 method?:string;
 headers?:Record<string,string|string[]|undefined>;
 body?:{message?:string;context?:string;attachments?:IncomingAttachment[]};
};
type ResponseLike={status:(code:number)=>ResponseLike;json:(data:unknown)=>void};
let adminAuth:ReturnType<typeof getAuth>|null=null;
let adminDb:ReturnType<typeof getFirestore>|null=null;

function getAdmin(){
 if(adminAuth&&adminDb)return {auth:adminAuth,db:adminDb};
 const encoded=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
 const credential=encoded?cert(JSON.parse(encoded)):applicationDefault();
 const app=getApps()[0]||initializeApp({credential});
 adminAuth=getAuth(app);adminDb=getFirestore(app);
 return {auth:adminAuth,db:adminDb};
}
function header(req:RequestLike,name:string){
 const value=req.headers?.[name.toLowerCase()]??req.headers?.[name];
 return Array.isArray(value)?value[0]:value;
}
function indiaDate(){
 const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
 const map=Object.fromEntries(parts.map(p=>[p.type,p.value]));
 return map.year+"-"+map.month+"-"+map.day;
}
async function consumeQuota(db:ReturnType<typeof getFirestore>,uid:string){
 const date=indiaDate();
 const dailyLimit=Math.max(1,Math.min(200,Number(process.env.AI_MENTOR_DAILY_LIMIT||60)));
 const minuteLimit=Math.max(1,Math.min(20,Number(process.env.AI_MENTOR_PER_MINUTE_LIMIT||5)));
 const minuteKey=Math.floor(Date.now()/60000);
 const dailyRef=db.doc("users/"+uid+"/usage/ai-mentor-"+date);
 const minuteRef=db.doc("users/"+uid+"/usage/ai-mentor-minute-"+minuteKey);
 return db.runTransaction(async tx=>{
  const [dailySnap,minuteSnap]=await Promise.all([tx.get(dailyRef),tx.get(minuteRef)]);
  const dailyCount=Number(dailySnap.data()?.count||0);
  const minuteCount=Number(minuteSnap.data()?.count||0);
  if(dailyCount>=dailyLimit||minuteCount>=minuteLimit)return {allowed:false,dailyRemaining:Math.max(0,dailyLimit-dailyCount),retryAfterSeconds:60-(Math.floor(Date.now()/1000)%60)};
  tx.set(dailyRef,{count:dailyCount+1,updatedAt:FieldValue.serverTimestamp()},{merge:true});
  tx.set(minuteRef,{count:minuteCount+1,updatedAt:FieldValue.serverTimestamp(),expiresAt:new Date(Date.now()+2*60*1000)},{merge:true});
  return {allowed:true,dailyRemaining:dailyLimit-dailyCount-1,retryAfterSeconds:0};
 });
}

export default async function handler(req:RequestLike,res:ResponseLike){
 if(req.method!=="POST"){res.status(405).json({error:"Method not allowed"});return;}
 const key=process.env.OPENAI_API_KEY;
 if(!key){res.status(503).json({error:"AI provider is not configured. Add OPENAI_API_KEY to the server environment."});return;}
 const authorization=header(req,"authorization")||"";
 const match=authorization.match(/^Bearer\s+(.+)$/i);
 if(!match){res.status(401).json({error:"Sign in to your ACHIEVER account before using the live AI Mentor."});return;}
 try{
  const {auth,db}=getAdmin();
  const decoded=await auth.verifyIdToken(match[1]);
  const quota=await consumeQuota(db,decoded.uid);
  if(!quota.allowed){res.status(429).json({error:"AI Mentor usage limit reached. Please try again later.",dailyRemaining:quota.dailyRemaining,retryAfterSeconds:quota.retryAfterSeconds});return;}
  const message=String(req.body?.message||"").trim().slice(0,5000);
  const context=String(req.body?.context||"").slice(0,12000);
  if(!message&&!req.body?.attachments?.length){res.status(400).json({error:"Enter a question or attach a supported file."});return;}
  const attachments=Array.isArray(req.body?.attachments)?req.body!.attachments!.slice(0,3):[];
  const content:Array<Record<string,unknown>>=[{type:"input_text",text:"STUDENT CONTEXT:\n"+context+"\n\nSTUDENT MESSAGE:\n"+message}];
  let totalBytes=0;
  for(const attachment of attachments){
   const name=String(attachment.name||"attachment").replace(/[^a-zA-Z0-9._-]/g,"_").slice(0,100);
   const mime=String(attachment.mimeType||"").toLowerCase();
   const dataUrl=String(attachment.dataUrl||"");
   const comma=dataUrl.indexOf(",");
   if(comma<0||!dataUrl.startsWith("data:"+mime+";base64,")){res.status(400).json({error:"An attachment could not be read. Please reselect the file."});return;}
   const base64=dataUrl.slice(comma+1);
   const bytes=Buffer.byteLength(base64,"base64");totalBytes+=bytes;
   if(mime==="application/pdf"){
    content.push({type:"input_file",filename:name,file_data:dataUrl});
   }else if(["image/jpeg","image/png","image/webp","image/gif"].includes(mime)){
    content.push({type:"input_image",image_url:dataUrl});
   }else{
    res.status(400).json({error:"Only JPEG, PNG, WEBP, GIF images and PDF documents are supported."});return;
   }
  }
  if(attachments.length>3||totalBytes>3_000_000){res.status(413).json({error:"Attach up to 3 files with a combined size under 3 MB."});return;}
  const endpoint=process.env.OPENAI_BASE_URL||"https://api.openai.com/v1/responses";
  const upstream=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+key},body:JSON.stringify({
   model:process.env.OPENAI_MODEL||"gpt-4o-mini",
   instructions:"You are ACHIEVER, a careful JEE/NEET academic mentor. Explain at the student's selected examination level. For attached images, read the question carefully, preserve symbols and units, and solve step by step. For PDFs, use relevant pages and mention if any text is unclear. Never invent official exam rules, claim a rank guarantee, or pretend an unverified question is a PYQ. Use supplied student context when making study recommendations. If context is insufficient, say so. Identify assumptions before solving ambiguous diagrams or unreadable text.",
   input:[{role:"user",content}],
   max_output_tokens:1800
  })});
  const data=await upstream.json();
  if(!upstream.ok){res.status(502).json({error:data?.error?.message||"AI provider request failed"});return;}
  const reply=data?.output_text||data?.output?.flatMap((item:any)=>item.content||[]).filter((part:any)=>part.type==="output_text").map((part:any)=>part.text).join("\n")||"I could not generate a response.";
  res.status(200).json({reply,dailyRemaining:quota.dailyRemaining});
 }catch(error){
  const detail=error instanceof Error?error.message:"AI request failed";
  if(detail.includes("FIREBASE_SERVICE_ACCOUNT_JSON")||detail.includes("Could not load the default credentials")){
   res.status(503).json({error:"AI Mentor authentication backend is not configured. Add FIREBASE_SERVICE_ACCOUNT_JSON to the server environment."});return;
  }
  res.status(401).json({error:"The account session could not be verified. Sign in again and retry."});
 }
}
