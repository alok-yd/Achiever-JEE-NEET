type IncomingAttachment = { name?: string; mimeType?: string; dataUrl?: string };
type RequestLike = { method?: string; body?: { message?: string; context?: string; attachments?: IncomingAttachment[] } };
type ResponseLike = { status: (code:number)=>ResponseLike; json:(data:unknown)=>void };

export default async function handler(req:RequestLike,res:ResponseLike){
 if(req.method!=="POST"){res.status(405).json({error:"Method not allowed"});return;}
 const key=process.env.OPENAI_API_KEY;
 if(!key){res.status(503).json({error:"AI provider is not configured. Add OPENAI_API_KEY in the deployment environment."});return;}
 const message=String(req.body?.message||"").slice(0,5000);
 const context=String(req.body?.context||"").slice(0,12000);
 const attachments=Array.isArray(req.body?.attachments)?req.body!.attachments!.slice(0,3):[];
 const totalBytes=attachments.reduce((n,a)=>n+(typeof a.dataUrl==="string"?a.dataUrl.length:0),0);
 if(totalBytes>4_000_000){res.status(413).json({error:"Attachments are too large. Reduce the combined file size and try again."});return;}
 const content:Array<Record<string,unknown>>=[{type:"input_text",text:"STUDENT CONTEXT:\n"+context+"\n\nSTUDENT MESSAGE:\n"+message}];
 for(const a of attachments){
  const name=String(a.name||"attachment").replace(/[^a-zA-Z0-9._-]/g,"_").slice(0,100);
  const mime=String(a.mimeType||"");
  const dataUrl=String(a.dataUrl||"");
  if(!dataUrl.startsWith("data:")||!dataUrl.includes(";base64,")){res.status(400).json({error:"An attachment could not be read. Please reselect the file."});return;}
  if(mime.startsWith("image/")){
   content.push({type:"input_image",image_url:dataUrl});
  }else if(mime==="application/pdf"){
   content.push({type:"input_file",filename:name,file_data:dataUrl});
  }else{
   res.status(400).json({error:"Only image files and PDFs are supported."});return;
  }
 }
 try{
  const endpoint=process.env.OPENAI_BASE_URL||"https://api.openai.com/v1/responses";
  const upstream=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+key},body:JSON.stringify({
   model:process.env.OPENAI_MODEL||"gpt-4o-mini",
   instructions:"You are ACHIEVER, a careful JEE/NEET academic mentor. Explain at the student's selected examination level. For attached images, read the question carefully, preserve symbols and units, and solve step by step. For PDFs, use the relevant pages and mention if text is unclear. Never invent official exam rules, claim a rank guarantee, or pretend an unverified question is a PYQ. Use supplied student context when making study recommendations. If context is insufficient, say so.",
   input:[{role:"user",content}]
  })});
  const data=await upstream.json();
  if(!upstream.ok){res.status(502).json({error:data?.error?.message||"AI provider request failed"});return;}
  const reply=data?.output_text||data?.output?.flatMap((item:any)=>item.content||[]).filter((part:any)=>part.type==="output_text").map((part:any)=>part.text).join("\n")||"I could not generate a response.";
  res.status(200).json({reply});
 }catch(e){res.status(502).json({error:e instanceof Error?e.message:"AI request failed"});}
}
