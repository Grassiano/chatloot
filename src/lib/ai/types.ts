import { z } from "zod";

/** Message data sent to the AI for analysis */
export const AnalyzeMessageSchema = z.object({
  id: z.number(),
  author: z.string(),
  message: z.string(),
  date: z.string(),
});

/** Member summary sent to the AI */
export const AnalyzeMemberSchema = z.object({
  displayName: z.string(),
  messageCount: z.number(),
  avgMessageLength: z.number(),
  topEmojis: z.array(z.string()),
});

/** Full request to /api/analyze */
export const AnalyzeRequestSchema = z.object({
  messages: z.array(AnalyzeMessageSchema),
  members: z.array(AnalyzeMemberSchema),
  groupName: z.string().nullable(),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

/** A single AI-ranked message */
export const AnalyzedMessageSchema = z.object({
  id: z.number(),
  score: z.number().min(1).max(10),
  reason: z.string(),
  distractors: z.array(z.string()).min(1).max(3),
  gmNote: z.string().optional(),
});

/** Full response from Claude */
export const AnalyzeResponseSchema = z.object({
  rankedMessages: z.array(AnalyzedMessageSchema),
});

export type AnalyzedMessage = z.infer<typeof AnalyzedMessageSchema>;
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;
