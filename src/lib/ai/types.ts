import { z } from "zod";

/** Message data sent to the AI for analysis */
export const AnalyzeMessageSchema = z.object({
  id: z.number(),
  author: z.string().max(100),
  message: z.string().max(500),
  date: z.string().max(50),
});

/** Member summary sent to the AI */
export const AnalyzeMemberSchema = z.object({
  displayName: z.string().max(100),
  messageCount: z.number(),
  avgMessageLength: z.number(),
  topEmojis: z.array(z.string().max(10)).max(10),
});

/** Full request to /api/analyze */
export const AnalyzeRequestSchema = z.object({
  messages: z.array(AnalyzeMessageSchema).max(300),
  members: z.array(AnalyzeMemberSchema).max(50),
  groupName: z.string().max(200).nullable(),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

/** A single AI-ranked message */
export const AnalyzedMessageSchema = z.object({
  id: z.number(),
  score: z.number().min(1).max(10),
  reason: z.string().max(500),
  distractors: z.array(z.string().max(100)).min(1).max(3),
  gmNote: z.string().max(300).optional(),
});

/** Per-member personality profile from Claude */
export const MemberProfileAiSchema = z.object({
  displayName: z.string().max(100),
  summary: z.string().max(500),
});

/** Full response from Claude */
export const AnalyzeResponseSchema = z.object({
  rankedMessages: z.array(AnalyzedMessageSchema),
  memberProfiles: z.array(MemberProfileAiSchema).optional(),
});

export type AnalyzedMessage = z.infer<typeof AnalyzedMessageSchema>;
export type MemberProfileAi = z.infer<typeof MemberProfileAiSchema>;
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;
