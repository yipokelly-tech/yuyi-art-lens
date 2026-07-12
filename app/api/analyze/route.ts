
import { NextResponse } from "next/server";
export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "AI_NOT_CONFIGURED" }, { status: 503 });
  const { image } = await req.json();
  if (typeof image !== "string" || !image.includes(",")) return NextResponse.json({ error: "INVALID_IMAGE" }, { status: 400 });
  const [header, data] = image.split(",", 2);
  const mimeType = header.match(/data:([^;]+)/)?.[1] || "image/jpeg";
  const prompt = `你是專業藝術鑑賞家。請分析這張畫作，只回傳 JSON，不要 Markdown：{"subject":"人物|風景|靜物|動物|抽象","style":"藝術風格（繁體中文）","score":0到100的美學分數,"description":"約80字繁體中文說明"}。subject 必須依畫面主要內容判斷，style 請說明媒材或藝術流派。`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data } }] }] }) });
  if (!response.ok) return NextResponse.json({ error: "AI_REQUEST_FAILED" }, { status: 502 });
  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  try { const clean = text.replace(/```json|```/g, "").trim(); return NextResponse.json(JSON.parse(clean)); }
  catch { return NextResponse.json({ error: "AI_INVALID_RESPONSE" }, { status: 502 }); }
}
