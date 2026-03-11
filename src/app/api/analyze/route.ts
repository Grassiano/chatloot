import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { AnalyzeRequestSchema, AnalyzeResponseSchema } from "@/lib/ai/types";
import { buildAnalyzePrompt } from "@/lib/ai/prompt";

// Simple in-memory rate limiter (per-IP, 5 requests per 60s)
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 5;
const GLOBAL_MAX_PER_MINUTE = 100;
const rateLimiter = new Map<string, number[]>();
let globalRequestCount = 0;

// Periodic cleanup: evict stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of rateLimiter) {
    const fresh = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
    if (fresh.length === 0) rateLimiter.delete(ip);
    else rateLimiter.set(ip, fresh);
  }
}, 5 * 60_000);

// Reset global counter every minute
setInterval(() => {
  globalRequestCount = 0;
}, 60_000);

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimiter.get(ip) ?? []).filter(
    (t) => now - t < RATE_WINDOW_MS
  );
  if (timestamps.length >= RATE_MAX_REQUESTS) {
    rateLimiter.set(ip, timestamps);
    return true;
  }
  timestamps.push(now);
  rateLimiter.set(ip, timestamps);
  return false;
}

export async function POST(request: Request) {
  // Global rate limit as a hard ceiling (defense against IP spoofing)
  if (++globalRequestCount > GLOBAL_MAX_PER_MINUTE) {
    return NextResponse.json(
      { error: "Service overloaded. Try again in a minute." },
      { status: 503 }
    );
  }

  // Prefer x-real-ip (set by reverse proxy, not spoofable), fall back to x-forwarded-for
  const ip =
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const parsed = AnalyzeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({ apiKey });
    const prompt = buildAnalyzePrompt(parsed.data);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No text response from AI" },
        { status: 502 }
      );
    }

    // Extract first balanced JSON object from Claude's response
    const jsonStart = textBlock.text.indexOf("{");
    if (jsonStart === -1) {
      return NextResponse.json(
        { error: "AI response was not valid JSON" },
        { status: 502 }
      );
    }

    let depth = 0;
    let jsonEnd = -1;
    for (let i = jsonStart; i < textBlock.text.length; i++) {
      if (textBlock.text[i] === "{") depth++;
      if (textBlock.text[i] === "}") depth--;
      if (depth === 0) {
        jsonEnd = i + 1;
        break;
      }
    }

    if (jsonEnd === -1) {
      return NextResponse.json(
        { error: "AI response was not valid JSON" },
        { status: 502 }
      );
    }

    const aiResult = JSON.parse(textBlock.text.slice(jsonStart, jsonEnd));
    const validated = AnalyzeResponseSchema.safeParse(aiResult);

    if (!validated.success) {
      return NextResponse.json(
        { error: "AI response failed validation" },
        { status: 502 }
      );
    }

    return NextResponse.json(validated.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Analysis failed:", message);
    return NextResponse.json(
      { error: "Analysis failed" },
      { status: 500 }
    );
  }
}
