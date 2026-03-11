import type { ChatMember, MemberStats, ParsedChat } from "@/lib/parser/types";
import { isMediaMessage, isSystemMessage } from "@/lib/parser/parse-chat";

export interface Personality {
  title: string;
  emoji: string;
  summary: string;
}

interface PersonalityTemplate {
  key: string;
  title: string;
  emoji: string;
  getValue: (s: MemberStats) => number;
  minThreshold: number;
  summaryFn: (s: MemberStats) => string;
  isInverse?: boolean; // true = lowest value wins (e.g. ghost)
}

const PERSONALITY_TEMPLATES: PersonalityTemplate[] = [
  {
    key: "king",
    title: "מלך הקבוצה",
    emoji: "👑",
    getValue: (s) => s.totalMessages,
    minThreshold: 0,
    summaryFn: (s) => `שולט בצ׳אט עם ${s.totalMessages.toLocaleString()} הודעות.`,
  },
  {
    key: "nightOwl",
    title: "ינשוף הלילה",
    emoji: "🦉",
    getValue: (s) => s.nightMessages,
    minThreshold: 5,
    summaryFn: (s) => `${s.nightMessages} הודעות אחרי חצות. מי צריך שינה?`,
  },
  {
    key: "emojiKing",
    title: "מלך האימוג׳י",
    emoji: "😂",
    getValue: (s) => s.emojiCount,
    minThreshold: 10,
    summaryFn: (s) => {
      const top = s.topEmojis[0]?.emoji ?? "😂";
      return `${s.emojiCount} אימוג׳ים, האהוב: ${top}. מדבר בסמיילים.`;
    },
  },
  {
    key: "philosopher",
    title: "הפילוסוף",
    emoji: "📜",
    getValue: (s) => s.averageMessageLength,
    minThreshold: 30,
    summaryFn: (s) => `ממוצע ${s.averageMessageLength} תווים להודעה. כותב מגילות.`,
  },
  {
    key: "photographer",
    title: "הצלם",
    emoji: "📸",
    getValue: (s) => s.mediaMessages,
    minThreshold: 10,
    summaryFn: (s) => `${s.mediaMessages} תמונות וסרטונים. מתעד הכל.`,
  },
  {
    key: "spammer",
    title: "ספאמר מקצועי",
    emoji: "🔥",
    getValue: (s) => s.burstCount,
    minThreshold: 3,
    summaryFn: (s) => `${s.burstCount} פעמים שלח 5+ הודעות ברצף. אין עצירה.`,
  },
  {
    key: "curious",
    title: "סקרן כרוני",
    emoji: "❓",
    getValue: (s) => s.questionCount,
    minThreshold: 10,
    summaryFn: (s) => `${s.questionCount} שאלות. תמיד רוצה לדעת.`,
  },
  {
    key: "deleter",
    title: "מוחק הראיות",
    emoji: "🗑️",
    getValue: (s) => s.deletedCount,
    minThreshold: 3,
    summaryFn: (s) => `מחק ${s.deletedCount} הודעות. מה הסתיר?`,
  },
  {
    key: "broadcaster",
    title: "השדרן",
    emoji: "📡",
    getValue: (s) => s.forwardedCount,
    minThreshold: 5,
    summaryFn: (s) => `העביר ${s.forwardedCount} הודעות. המקור לכל הסרטונים.`,
  },
  {
    key: "reviver",
    title: "מחיה המתים",
    emoji: "⚡",
    getValue: (s) => s.conversationStarts,
    minThreshold: 5,
    summaryFn: (s) => `החיה את הצ׳אט ${s.conversationStarts} פעמים.`,
  },
  {
    key: "vanisher",
    title: "הנעלם",
    emoji: "🕵️",
    getValue: (s) => s.longestGhostDays,
    minThreshold: 7,
    summaryFn: (s) => `נעלם ל-${s.longestGhostDays} ימים. חזר כאילו כלום.`,
  },
  {
    key: "linkMaster",
    title: "מפיץ הלינקים",
    emoji: "🔗",
    getValue: (s) => s.linkCount,
    minThreshold: 5,
    summaryFn: (s) => `${s.linkCount} לינקים. אנציקלופדיה מהלכת.`,
  },
  {
    key: "perfectionist",
    title: "הפרפקציוניסט",
    emoji: "✏️",
    getValue: (s) => s.editedCount,
    minThreshold: 3,
    summaryFn: (s) => `ערך ${s.editedCount} הודעות. כי המילה הנכונה חשובה.`,
  },
  {
    key: "earlyBird",
    title: "הציפור המוקדמת",
    emoji: "🐦",
    getValue: (s) => s.morningMessages,
    minThreshold: 10,
    summaryFn: (s) => `${s.morningMessages} הודעות לפני הצהריים. קם מוקדם, כותב מוקדם.`,
  },
  {
    key: "eveningPerson",
    title: "יצור הערב",
    emoji: "🌙",
    getValue: (s) => s.eveningMessages,
    minThreshold: 10,
    summaryFn: (s) => `${s.eveningMessages} הודעות בערב. פורח בחושך.`,
  },
  {
    key: "wordsmith",
    title: "בעל המילים",
    emoji: "📝",
    getValue: (s) => s.averageWordsPerMessage,
    minThreshold: 8,
    summaryFn: (s) => `ממוצע ${s.averageWordsPerMessage} מילים להודעה. לא חוסך במילים.`,
  },
  {
    key: "ghost",
    title: "הרוח הרפאים",
    emoji: "👻",
    getValue: (s) => s.totalMessages,
    minThreshold: 0,
    summaryFn: (s) => `רק ${s.totalMessages} הודעות. אבל כשמופיע — שווה.`,
    isInverse: true,
  },
];

/**
 * Assign personality titles using distinctiveness scoring.
 * Each member gets the trait where they stand out MOST relative to the group.
 */
export function assignPersonalities(
  members: ChatMember[],
  statsMap: Map<string, MemberStats>
): Map<string, Personality> {
  const result = new Map<string, Personality>();
  const allStats = members
    .map((m) => statsMap.get(m.displayName))
    .filter((s): s is MemberStats => s != null);

  if (allStats.length === 0) return result;

  // Compute group averages for each template
  const groupAvgs = PERSONALITY_TEMPLATES.map((t) => {
    const values = allStats.map((s) => t.getValue(s));
    return values.reduce((a, b) => a + b, 0) / values.length;
  });

  // Score each member for each template (how distinctive they are)
  const memberScores: Array<{
    name: string;
    stats: MemberStats;
    scores: Array<{ templateIdx: number; score: number }>;
  }> = [];

  for (const member of members) {
    const stats = statsMap.get(member.displayName);
    if (!stats) continue;

    const scores: Array<{ templateIdx: number; score: number }> = [];

    for (let i = 0; i < PERSONALITY_TEMPLATES.length; i++) {
      const t = PERSONALITY_TEMPLATES[i];
      const value = t.getValue(stats);
      const avg = groupAvgs[i];

      // Skip if below minimum threshold
      if (!t.isInverse && value < t.minThreshold) continue;

      // Score: how far above average (ratio). Ghost (inverse) uses below average.
      let score: number;
      if (t.isInverse) {
        score = avg > 0 ? avg / Math.max(value, 1) : 0;
      } else {
        score = avg > 0 ? value / avg : value > 0 ? 10 : 0;
      }

      scores.push({ templateIdx: i, score });
    }

    // Sort by score descending — best trait first
    scores.sort((a, b) => b.score - a.score);
    memberScores.push({ name: member.displayName, stats, scores });
  }

  // Greedy assignment: members with most distinctive trait go first
  const usedTemplates = new Set<number>();
  const assigned = new Set<string>();

  // Sort members by their best score (most distinctive member first)
  memberScores.sort((a, b) => {
    const aTop = a.scores[0]?.score ?? 0;
    const bTop = b.scores[0]?.score ?? 0;
    return bTop - aTop;
  });

  for (const member of memberScores) {
    if (assigned.has(member.name)) continue;

    // Find best available template
    const best = member.scores.find((s) => !usedTemplates.has(s.templateIdx));
    if (!best) continue;

    const t = PERSONALITY_TEMPLATES[best.templateIdx];
    result.set(member.name, {
      title: t.title,
      emoji: t.emoji,
      summary: t.summaryFn(member.stats),
    });
    usedTemplates.add(best.templateIdx);
    assigned.add(member.name);
  }

  // Fallback for any unassigned members
  for (const member of members) {
    if (assigned.has(member.displayName)) continue;
    const stats = statsMap.get(member.displayName);
    result.set(member.displayName, {
      title: "חבר הקבוצה",
      emoji: "💬",
      summary: `${stats?.totalMessages ?? 0} הודעות, תמיד בתמונה.`,
    });
  }

  return result;
}

/**
 * Pick 3 representative sample messages for a member.
 * Prefers medium-length, interesting messages.
 */
export function pickSampleMessages(
  chat: ParsedChat,
  memberName: string
): string[] {
  const eligible = chat.messages.filter((m) => {
    if (m.author !== memberName) return false;
    if (isMediaMessage(m.message)) return false;
    if (isSystemMessage(m.message)) return false;
    if (m.meta.isDeleted || m.meta.isForwarded) return false;
    if (m.message.length < 15 || m.message.length > 200) return false;
    if (m.message.startsWith("http")) return false;
    return true;
  });

  if (eligible.length === 0) return [];

  // Pick from different parts of the chat (beginning, middle, end)
  const picks: string[] = [];
  const step = Math.max(1, Math.floor(eligible.length / 3));

  for (let i = 0; i < eligible.length && picks.length < 3; i += step) {
    picks.push(eligible[i].message);
  }

  return picks;
}

/**
 * Find a voice note URL for a member from the media map.
 * Returns the URL of a short voice note (prefers 2-10s range).
 */
export function findMemberVoiceNote(
  chat: ParsedChat,
  memberName: string
): { url: string; count: number } | null {
  // Find messages with voice attachments from this member
  const voiceMessages = chat.messages.filter((m) => {
    if (m.author !== memberName) return false;
    if (!m.attachment) return false;
    const media = chat.media.get(m.attachment.fileName);
    return media?.type === "voice";
  });

  if (voiceMessages.length === 0) return null;

  // Pick the first voice note that exists in media
  for (const msg of voiceMessages) {
    if (!msg.attachment) continue;
    const media = chat.media.get(msg.attachment.fileName);
    if (media) {
      return { url: media.url, count: voiceMessages.length };
    }
  }

  return null;
}

/**
 * Generate a fun one-liner roast for the Group Reveal screen.
 * Uses chat stats to find the most entertaining fact.
 */
export function generateGroupRoast(chat: ParsedChat): string {
  const members = chat.members;
  const statsMap = chat.stats.members;

  // Most active member percentage
  if (members.length > 0) {
    const top = members[0]; // already sorted by messageCount desc
    const total = members.reduce((sum, m) => sum + m.messageCount, 0);
    const pct = Math.round((top.messageCount / total) * 100);
    if (pct > 40) {
      return `${top.displayName} שלח ${pct}% מההודעות 👀`;
    }
  }

  // Night owl stat
  let maxNight = 0;
  let nightOwlName = "";
  for (const [name, stats] of statsMap) {
    if (stats.nightMessages > maxNight) {
      maxNight = stats.nightMessages;
      nightOwlName = name;
    }
  }
  if (maxNight > 50) {
    return `${nightOwlName} שלח ${maxNight} הודעות אחרי חצות 🦉`;
  }

  // Emoji count
  let maxEmoji = 0;
  let emojiName = "";
  for (const [name, stats] of statsMap) {
    if (stats.emojiCount > maxEmoji) {
      maxEmoji = stats.emojiCount;
      emojiName = name;
    }
  }
  if (maxEmoji > 100) {
    return `${emojiName} השתמש ב-${maxEmoji} אימוג׳ים. חולה.`;
  }

  // Media count
  const mediaCount = chat.stats.mediaCount;
  if (mediaCount > 500) {
    return `${mediaCount} קבצי מדיה? אתם חולים.`;
  }

  // Default
  return `${chat.stats.totalMessages.toLocaleString()} הודעות של שטויות. בואו נשחק.`;
}
