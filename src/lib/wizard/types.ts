import type { WhoSaidItQuestion } from "@/lib/game/types";

export interface MemberProfile {
  // Identity
  displayName: string;
  nickname: string;
  photoUrl: string | null;
  photoBlob: Blob | null;

  // Stats
  messageCount: number;
  avgMessageLength: number;
  topEmojis: Array<{ emoji: string; count: number }>;
  mostActiveHour: number;
  nightMessages: number;
  mediaMessages: number;

  // Personality (template → Claude-enhanced)
  personalityTitle: string;
  personalityEmoji: string;
  personalitySummary: string;
  aiSummary: string | null;

  // Media
  taggedPhotos: string[];
  voiceNoteCount: number;
  sampleVoiceUrl: string | null;

  // Content
  sampleMessages: string[];

  // Merge
  mergedInto: string | null;
}

export type HighlightCategory = "funny" | "iconic" | "cringe" | "emotional";

export interface HighlightCard {
  question: WhoSaidItQuestion;
  aiScore: number;
  aiReason: string;
  approved: boolean;
  gmNoteEdited: string;
  category: HighlightCategory | null;
  priority: number;
}

export interface WizardState {
  profiles: MemberProfile[];
  highlights: HighlightCard[];
  currentStep: 1 | 2 | 3;
  isAiEnhanced: boolean;
}
