export interface ParsedMessage {
  date: Date;
  author: string | null;
  message: string;
  attachment?: {
    fileName: string;
  };
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
  responseTimeAvg: number | null;
  nightMessages: number; // messages between 00:00-05:00
  morningMessages: number; // 05:00-12:00
  afternoonMessages: number; // 12:00-18:00
  eveningMessages: number; // 18:00-00:00
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
