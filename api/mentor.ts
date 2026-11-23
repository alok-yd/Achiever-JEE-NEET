type RequestLike = { method?: string; body?: { message?: string; context?: string } };
type ResponseLike = { status: (code:number)=>ResponseLike; json:(data:unknown)=>void };
export default async function handler(req:RequestLike,res:ResponseLike){
 if(req.method!=="POST"){res.status(405).json({error:"Method not allowed"});return;}
 const key=process.env.OPENAI_API_KEY;
 if(!key){res.status(503).json({error:"AI provider is not configured. Add OPENAI_API_KEY in the deployment environment."});return;}
 const message=String(req.body?.message||"").slice(0,5000);
 const context=String(req.body?.context||"").slice(0,12000);
 try{
  const endpoint=process.env.OPENAI_BASE_URL||"https://api.openai.com/v1/chat/completions";
  const upstream=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+key},body:JSON.stringify({model:process.env.OPENAI_MODEL||"gpt-4o-mini",temperature:0.35,messages:[{role:"system",content:"You are ACHIEVER, a careful JEE/NEET academic mentor. Explain at the student's selected examination level. Never invent official exam rules, claim a rank guarantee, or pretend an unverified question is a PYQ. Use the supplied student context to make recommendations. If context is insufficient, say so."},{role:"user",content:"STUDENT CONTEXT:\n"+context+"\n\nSTUDENT MESSAGE:\n"+message}]})});
  const data=await upstream.json();
  if(!upstream.ok){res.status(502).json({error:data?.error?.message||"AI provider request failed"});return;}
  res.status(200).json({reply:data?.choices?.[0]?.message?.content||"I could not generate a response."});
 }catch(e){res.status(502).json({error:e instanceof Error?e.message:"AI request failed"});}
}
