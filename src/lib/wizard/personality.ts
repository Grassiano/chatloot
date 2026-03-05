import type { ChatMember, MemberStats, ParsedChat } from "@/lib/parser/types";
import { isMediaMessage } from "@/lib/parser/parse-chat";

interface Personality {
  title: string;
  emoji: string;
  summary: string;
}

/**
 * Assign personality titles + template summaries based on stats.
 * Each member gets their most distinctive trait.
 */
export function assignPersonalities(
  members: ChatMember[],
  statsMap: Map<string, MemberStats>
): Map<string, Personality> {
  const result = new Map<string, Personality>();

  // Calculate relative rankings
  const rankings = members.map((m) => {
    const s = statsMap.get(m.displayName);
    return { name: m.displayName, stats: s };
  });

  // Track which members already got a title (each member gets their most extreme trait)
  const assigned = new Set<string>();

  // 1. Most messages → מלך/מלכת הקבוצה
  const mostMessages = rankings
    .filter((r) => r.stats)
    .sort((a, b) => (b.stats?.totalMessages ?? 0) - (a.stats?.totalMessages ?? 0));

  if (mostMessages[0]?.stats) {
    const r = mostMessages[0];
    const pct = Math.round(
      ((r.stats?.totalMessages ?? 0) /
        rankings.reduce((sum, x) => sum + (x.stats?.totalMessages ?? 0), 0)) *
        100
    );
    result.set(r.name, {
      title: "מלך הקבוצה",
      emoji: "👑",
      summary: `שולט בצ׳אט עם ${r.stats?.totalMessages} הודעות (${pct}%). הכי פעיל ביום ${r.stats?.mostActiveDay}.`,
    });
    assigned.add(r.name);
  }

  // 2. Most night messages → ינשוף הלילה
  const nightOwl = rankings
    .filter((r) => r.stats && !assigned.has(r.name))
    .sort((a, b) => (b.stats?.nightMessages ?? 0) - (a.stats?.nightMessages ?? 0));

  if (nightOwl[0]?.stats && (nightOwl[0].stats.nightMessages ?? 0) > 5) {
    const r = nightOwl[0];
    result.set(r.name, {
      title: "ינשוף הלילה",
      emoji: "🦉",
      summary: `${r.stats?.nightMessages} הודעות אחרי חצות. מי צריך שינה?`,
    });
    assigned.add(r.name);
  }

  // 3. Most emojis → מלך האימוג׳י
  const emojiKing = rankings
    .filter((r) => r.stats && !assigned.has(r.name))
    .sort((a, b) => (b.stats?.emojiCount ?? 0) - (a.stats?.emojiCount ?? 0));

  if (emojiKing[0]?.stats && (emojiKing[0].stats.emojiCount ?? 0) > 10) {
    const r = emojiKing[0];
    const topEmoji = r.stats?.topEmojis[0]?.emoji ?? "😂";
    result.set(r.name, {
      title: "מלך האימוג׳י",
      emoji: "😂",
      summary: `${r.stats?.emojiCount} אימוג׳ים, האהוב: ${topEmoji}. מדבר בסמיילים.`,
    });
    assigned.add(r.name);
  }

  // 4. Longest average message → הפילוסוף
  const philosopher = rankings
    .filter((r) => r.stats && !assigned.has(r.name))
    .sort(
      (a, b) =>
        (b.stats?.averageMessageLength ?? 0) - (a.stats?.averageMessageLength ?? 0)
    );

  if (philosopher[0]?.stats && (philosopher[0].stats.averageMessageLength ?? 0) > 30) {
    const r = philosopher[0];
    result.set(r.name, {
      title: "הפילוסוף",
      emoji: "📜",
      summary: `ממוצע ${r.stats?.averageMessageLength} תווים להודעה. כותב מגילות.`,
    });
    assigned.add(r.name);
  }

  // 5. Most media → הצלם
  const photographer = rankings
    .filter((r) => r.stats && !assigned.has(r.name))
    .sort((a, b) => (b.stats?.mediaMessages ?? 0) - (a.stats?.mediaMessages ?? 0));

  if (photographer[0]?.stats && (photographer[0].stats.mediaMessages ?? 0) > 10) {
    const r = photographer[0];
    result.set(r.name, {
      title: "הצלם",
      emoji: "📸",
      summary: `${r.stats?.mediaMessages} תמונות וסרטונים. מתעד הכל.`,
    });
    assigned.add(r.name);
  }

  // 6. Least active → הרוח הרפאים
  const ghost = rankings
    .filter((r) => r.stats && !assigned.has(r.name))
    .sort((a, b) => (a.stats?.totalMessages ?? 0) - (b.stats?.totalMessages ?? 0));

  if (ghost[0]?.stats) {
    const r = ghost[0];
    result.set(r.name, {
      title: "הרוח הרפאים",
      emoji: "👻",
      summary: `רק ${r.stats?.totalMessages} הודעות. אבל כשמופיע — שווה.`,
    });
    assigned.add(r.name);
  }

  // Fill remaining members with generic titles based on their best trait
  for (const r of rankings) {
    if (assigned.has(r.name) || !r.stats) continue;

    const hour = r.stats.mostActiveHour;
    if (hour >= 5 && hour < 12) {
      result.set(r.name, {
        title: "הציפור המוקדמת",
        emoji: "🐦",
        summary: `הכי פעיל בשעה ${hour}:00. קם מוקדם, כותב מוקדם.`,
      });
    } else if (hour >= 18 || hour < 5) {
      result.set(r.name, {
        title: "יצור הלילה",
        emoji: "🌙",
        summary: `הכי פעיל בשעה ${hour}:00. פורח בחושך.`,
      });
    } else {
      result.set(r.name, {
        title: "חבר הקבוצה",
        emoji: "💬",
        summary: `${r.stats.totalMessages} הודעות, תמיד בתמונה.`,
      });
    }
    assigned.add(r.name);
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
