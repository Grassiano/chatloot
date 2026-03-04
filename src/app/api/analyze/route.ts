import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { AnalyzeRequestSchema, AnalyzeResponseSchema } from "@/lib/ai/types";
import { buildAnalyzePrompt } from "@/lib/ai/prompt";

export async function POST(request: Request) {
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
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No text response from AI" },
        { status: 502 }
      );
    }

    // Extract JSON from Claude's response
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "AI response was not valid JSON" },
        { status: 502 }
      );
    }

    const aiResult = JSON.parse(jsonMatch[0]);
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
    return NextResponse.json(
      { error: "Analysis failed", message },
      { status: 500 }
    );
  }
}
