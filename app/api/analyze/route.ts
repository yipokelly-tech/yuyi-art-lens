import { NextResponse } from "next/server";
export const runtime = "nodejs";
const MODEL=process.env.CLOUDFLARE_AI_MODEL||"@cf/meta/llama-3.2-11b-vision-instruct";
const fail=(error_code:string,detail:string,status=500,extra:Record<string,unknown>={})=>NextResponse.json({ok:false,error_code,detail,...extra},{status});
export async function GET(){return NextResponse.json({ok:true,provider:"cloudflare-workers-ai",configured:Boolean(process.env.CLOUDFLARE_ACCOUNT_ID&&process.env.CLOUDFLARE_AUTH_TOKEN)})}
export async function POST(req:Request){try{
 const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_AUTH_TOKEN;
 if(!account||!token)return fail("AI_NOT_CONFIGURED","CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_AUTH_TOKEN is missing",503);
 let body:{image?:unknown};try{body=await req.json()}catch{return fail("INVALID_JSON","Request body is not valid JSON",400)}
 const image=body.image;if(typeof image!=="string"||!image.startsWith("data:image/"))return fail("INVALID_IMAGE","Expected a data:image/... payload",400);if(image.length>5000000)return fail("IMAGE_TOO_LARGE","Image payload exceeds 5,000,000 characters",413);
 const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${MODEL}`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({messages:[{role:"system",content:"你是專業藝術鑑賞家，請用繁體中文回答。"},{role:"user",content:"分析這張畫作，只回傳 JSON，不要 Markdown：{\"subject\":\"人物|風景|靜物|動物|抽象\",\"style\":\"藝術風格\",\"score\":0到100的美學分數,\"description\":\"約80字作品說明\"}。依主要畫面判斷 subject，不能確定時選抽象。"}],image})});
 if(!response.ok){const detail=(await response.text()).slice(0,1000);const code=response.status===401||response.status===403?"CLOUDFLARE_AUTH_OR_LICENSE_ERROR":"CLOUDFLARE_HTTP_ERROR";return fail(code,`Cloudflare returned HTTP ${response.status}`,502,{provider_status:response.status,provider_detail:detail,model:MODEL});}
 const json=await response.json() as any;const text=typeof json?.result==="string"?json.result:json?.result?.response||json?.result?.text||"";const match=String(text).match(/\{[\s\S]*\}/);if(!match)return fail("AI_INVALID_RESPONSE","No JSON found in Cloudflare response",502,{provider_text:String(text).slice(0,500)});try{return NextResponse.json(JSON.parse(match[0]))}catch{return fail("AI_INVALID_JSON","Cloudflare JSON could not be parsed",502,{provider_text:match[0].slice(0,500)})}
}catch(error){return fail("CLOUDFLARE_FETCH_FAILED",error instanceof Error?error.message:String(error),502)}}
