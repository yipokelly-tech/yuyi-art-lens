import { NextResponse } from "next/server";
export async function POST(req: Request) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return NextResponse.json({ error: "AI_NOT_CONFIGURED" }, { status: 503 });
  const { image } = await req.json();
  if (typeof image !== "string" || !image.startsWith("data:")) return NextResponse.json({ error: "INVALID_IMAGE" }, { status: 400 });
  const prompt = `你是專業藝術鑑賞家。請分析圖片中的畫作，只回傳 JSON，不要 Markdown：{"subject":"人物|風景|靜物|動物|抽象","style":"藝術風格（繁體中文）","score":0到100的美學分數,"description":"約80字繁體中文說明"}。subject 必須依畫面主要內容判斷；若無法確定請選抽象。`;
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json", "HTTP-Referer": "https://yuyi-art-lens-rho.vercel.app", "X-Title": "羽儀畫作解析" }, body: JSON.stringify({ model: "openrouter/free", messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: image } }] }], temperature: 0.2 }) });
  if (!response.ok) { console.error("OpenRouter error", response.status, await response.text()); return NextResponse.json({ error: "AI_REQUEST_FAILED" }, { status: 502 }); }
  const json = await response.json();
  const text = json?.choices?.[0]?.message?.content || "";
  try { const clean = String(text).replace(/```json|```/g, "").trim(); return NextResponse.json(JSON.parse(clean)); }
  catch { return NextResponse.json({ error: "AI_INVALID_RESPONSE" }, { status: 502 }); }
}
