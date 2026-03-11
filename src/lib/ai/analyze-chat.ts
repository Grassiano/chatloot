import type { ParsedChat } from "@/lib/parser/types";
import type { WhoSaidItQuestion } from "@/lib/game/types";
import { AnalyzeResponseSchema } from "./types";
import { sampleMessagesForAnalysis } from "./sample-messages";
import { shuffleArray } from "@/lib/utils";

export interface AnalysisResult {
  questions: WhoSaidItQuestion[];
  scores: Array<{ score: number; reason: string }>;
  memberSummaries: Record<string, string>;
  isAiEnhanced: boolean;
}

/**
 * Analyze chat with Claude AI and return ranked questions.
 * Falls back gracefully — returns empty questions on any failure.
 */
export async function analyzeChat(
  chat: ParsedChat
): Promise<AnalysisResult> {
  try {
    const sampled = sampleMessagesForAnalysis(chat);

    if (sampled.length === 0) {
      return { questions: [], scores: [], memberSummaries: {}, isAiEnhanced: false };
    }

    const memberPayload = chat.members.map((m) => {
      const stats = chat.stats.members.get(m.displayName);
      return {
        displayName: m.displayName,
        messageCount: m.messageCount,
        avgMessageLength: stats?.averageMessageLength ?? 0,
        topEmojis:
          stats?.topEmojis.slice(0, 3).map((e) => e.emoji) ?? [],
      };
    });

    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: sampled,
        members: memberPayload,
        groupName: chat.groupName,
      }),
    });

    if (!response.ok) {
      return { questions: [], scores: [], memberSummaries: {}, isAiEnhanced: false };
    }

    const raw = await response.json();
    const parsed = AnalyzeResponseSchema.safeParse(raw);
    if (!parsed.success) {
      return { questions: [], scores: [], memberSummaries: {}, isAiEnhanced: false };
    }
    const data = parsed.data;

    const questions: WhoSaidItQuestion[] = [];
    const scores: Array<{ score: number; reason: string }> = [];

    for (const ranked of data.rankedMessages.sort((a, b) => b.score - a.score)) {
      const original = sampled[ranked.id];
      if (!original) continue;

      const validDistractors = ranked.distractors.filter(
        (d) => d !== original.author
      );

      const options = shuffleArray([
        original.author,
        ...validDistractors.slice(0, 3),
      ]);

      questions.push({
        type: "who_said_it",
        messageText: original.message,
        correctAuthor: original.author,
        correctAnswer: original.author,
        options,
        timestamp: new Date(original.date),
        gmNote: ranked.gmNote,
      });

      scores.push({ score: ranked.score, reason: ranked.reason });
    }

    // Extract member summaries from Claude
    const aiSummaries: Record<string, string> = {};
    if (data.memberProfiles) {
      for (const profile of data.memberProfiles) {
        aiSummaries[profile.displayName] = profile.summary;
      }
    }

    return {
      questions,
      scores,
      memberSummaries: aiSummaries,
      isAiEnhanced: questions.length > 0,
    };
  } catch {
    return { questions: [], scores: [], memberSummaries: {}, isAiEnhanced: false };
  }
}
