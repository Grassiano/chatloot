export interface MessageMetadata {
  isForwarded: boolean;
  isDeleted: boolean;
  isEdited: boolean;
  quotedText: string | null;
  isConsecutive: boolean;
  hasLink: boolean;
  hasQuestion: boolean;
  wordCount: number;
}

export interface ParsedMessage {
  date: Date;
  author: string | null;
  message: string;
  attachment?: {
    fileName: string;
  };
  meta: MessageMetadata;
}

export interface ChatMember {
  displayName: string;
  messageCount: number;
  firstMessage: Date;
  lastMessage: Date;
  aliases: string[];
}

export interface MemberStats {
  totalMessages: number;
  textMessages: number;
  mediaMessages: number;
  averageMessageLength: number;
  mostActiveHour: number;
  mostActiveDay: string;
  emojiCount: number;
  topEmojis: Array<{ emoji: string; count: number }>;
  longestMessage: string;
  responseTimeAvg: number;
  nightMessages: number;
  morningMessages: number;
  afternoonMessages: number;
  eveningMessages: number;
  burstCount: number;
  questionCount: number;
  deletedCount: number;
  forwardedCount: number;
  editedCount: number;
  conversationStarts: number;
  longestGhostDays: number;
  linkCount: number;
  topWords: Array<{ word: string; count: number }>;
  averageWordsPerMessage: number;
}

export interface ChatStats {
  totalMessages: number;
  totalMembers: number;
  dateRange: {
    start: Date;
    end: Date;
  };
  mediaCount: number;
  systemMessageCount: number;
  members: Map<string, MemberStats>;
  peakHour: number;
  busiestDay: string;
  conversationCount: number;
  totalDays: number;
  messagesPerDay: number;
}

export interface MediaFile {
  fileName: string;
  blob: Blob;
  url: string; // object URL for display
  type: "image" | "video" | "voice" | "sticker" | "document";
}

export type ExtractionStage =
  | "reading_zip"
  | "finding_chat"
  | "parsing_messages"
  | "extracting_media";

export interface ExtractionProgress {
  stage: ExtractionStage;
  current: number;
  total: number;
}

export interface ParsedChat {
  messages: ParsedMessage[];
  members: ChatMember[];
  stats: ChatStats;
  groupName: string | null;
  media: Map<string, MediaFile>; // fileName -> MediaFile
}

/**
 * Safely convert a value that may be a Map or a plain object (after JSON roundtrip)
 * into a Map. Use this when accessing ParsedChat fields that were stored in the DB.
 */
export function asMap<V>(mapOrObj: Map<string, V> | Record<string, V> | undefined | null): Map<string, V> {
  if (!mapOrObj) return new Map();
  if (mapOrObj instanceof Map) return mapOrObj;
  return new Map(Object.entries(mapOrObj));
}
