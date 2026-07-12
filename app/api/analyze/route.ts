import { NextResponse } from "next/server";
export async function GET(){return NextResponse.json({ok:true,provider:"openrouter",configured:Boolean(process.env.OPENROUTER_API_KEY)})}
const fail = (error_code: string, detail: string, status = 500, extra: Record<string, unknown> = {}) => NextResponse.json({ ok: false, error_code, detail, ...extra }, { status });
export async function POST(req: Request) {
  try {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) return fail("AI_NOT_CONFIGURED", "OPENROUTER_API_KEY is missing in the deployment", 503);
    let body: { image?: unknown };
    try { body = await req.json(); } catch { return fail("INVALID_JSON", "Request body is not valid JSON", 400); }
    const image = body.image;
    if (typeof image !== "string" || !image.startsWith("data:image/")) return fail("INVALID_IMAGE", "Expected a data:image/... payload", 400);
    if (image.length > 5_000_000) return fail("IMAGE_TOO_LARGE", `Image payload is ${image.length} characters; maximum is 5,000,000`, 413);
    const prompt = `你是專業藝術鑑賞家。請分析圖片中的畫作，只回傳 JSON，不要 Markdown：{"subject":"人物|風景|靜物|動物|抽象","style":"藝術風格（繁體中文）","score":0到100的美學分數,"description":"約80字繁體中文說明"}。subject 必須依畫面主要內容判斷；若無法確定請選抽象。`;
    let response: Response;
    try {
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "HTTP-Referer": "https://yuyi-art-lens-rho.vercel.app", "X-Title": "羽儀畫作解析" }, body: JSON.stringify({ model: "meta-llama/llama-3.2-11b-vision-instruct:free", messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: image } }] }], temperature: 0.2 }) });
    } catch (error) { return fail("OPENROUTER_FETCH_FAILED", error instanceof Error ? error.message : String(error), 502); }
    if (!response.ok) { const providerBody = (await response.text()).slice(0, 500); return fail("OPENROUTER_HTTP_ERROR", `Provider returned HTTP ${response.status}`, 502, { provider_status: response.status, provider_detail: providerBody }); }
    let json: any; try { json = await response.json(); } catch { return fail("OPENROUTER_INVALID_JSON", "Provider response was not valid JSON", 502); }
    const text = json?.choices?.[0]?.message?.content;
    if (typeof text !== "string") return fail("OPENROUTER_EMPTY_RESPONSE", "Provider returned no message content", 502);
    const clean = text.replace(/```json|```/g, "").trim();
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) return fail("AI_INVALID_RESPONSE", "No JSON object found in provider response", 502, { provider_text: clean.slice(0, 500) });
    try { return NextResponse.json(JSON.parse(match[0])); } catch { return fail("AI_INVALID_JSON", "JSON object from provider could not be parsed", 502, { provider_text: match[0].slice(0, 500) }); }
  } catch (error) { return fail("ANALYZE_UNHANDLED", error instanceof Error ? error.message : String(error), 500); }
}


