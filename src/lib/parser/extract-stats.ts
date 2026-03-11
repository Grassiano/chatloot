import type { ParsedMessage, ChatMember, ChatStats, MemberStats } from "./types";
import { isMediaMessage } from "./parse-chat";

const EMOJI_REGEX =
  /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}]/gu;

const DAY_NAMES_HE = [
  "ראשון",
  "שני",
  "שלישי",
  "רביעי",
  "חמישי",
  "שישי",
  "שבת",
];

interface ExtendedStats extends MemberStats {
  _hourCounts: number[];
  _dayCounts: number[];
  _emojiMap: Map<string, number>;
}

export function extractStats(
  messages: ParsedMessage[],
  members: ChatMember[]
): ChatStats {
  const memberStatsMap = new Map<string, ExtendedStats>();
  let mediaCount = 0;
  let systemMessageCount = 0;

  // Initialize stats for each member
  for (const member of members) {
    memberStatsMap.set(member.displayName, createEmptyStats());
  }

  // Single pass over all messages — accumulate everything at once
  for (const msg of messages) {
    if (!msg.author) {
      systemMessageCount++;
      continue;
    }

    const stats = memberStatsMap.get(msg.author);
    if (!stats) continue;

    stats.totalMessages++;

    if (isMediaMessage(msg.message)) {
      stats.mediaMessages++;
      mediaCount++;
    } else {
      stats.textMessages++;
      stats.averageMessageLength += msg.message.length;

      if (msg.message.length > stats.longestMessage.length) {
        stats.longestMessage = msg.message;
      }

      // Count emojis — accumulate per-member in single pass
      const emojis = msg.message.match(EMOJI_REGEX) ?? [];
      stats.emojiCount += emojis.length;
      for (const emoji of emojis) {
        stats._emojiMap.set(emoji, (stats._emojiMap.get(emoji) ?? 0) + 1);
      }
    }

    // Time of day distribution + hour/day counts
    const hour = msg.date.getHours();
    const day = msg.date.getDay();
    stats._hourCounts[hour]++;
    stats._dayCounts[day]++;

    if (hour >= 0 && hour < 5) stats.nightMessages++;
    else if (hour >= 5 && hour < 12) stats.morningMessages++;
    else if (hour >= 12 && hour < 18) stats.afternoonMessages++;
    else stats.eveningMessages++;
  }

  // Derive final stats from accumulated data — no second pass needed
  const finalMap = new Map<string, MemberStats>();

  for (const [name, stats] of memberStatsMap) {
    if (stats.textMessages > 0) {
      stats.averageMessageLength = Math.round(
        stats.averageMessageLength / stats.textMessages
      );
    }

    // Most active hour & day
    stats.mostActiveHour = stats._hourCounts.indexOf(Math.max(...stats._hourCounts));
    stats.mostActiveDay =
      DAY_NAMES_HE[stats._dayCounts.indexOf(Math.max(...stats._dayCounts))];

    // Top emojis
    stats.topEmojis = Array.from(stats._emojiMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([emoji, count]) => ({ emoji, count }));

    // Strip internal fields for the final output
    const { _hourCounts: _, _dayCounts: __, _emojiMap: ___, ...memberStats } = stats;
    finalMap.set(name, memberStats);
  }

  // Date range
  const authoredMessages = messages.filter((m) => m.author !== null);
  const dates = authoredMessages.map((m) => m.date);
  const dateRange = {
    start: new Date(Math.min(...dates.map((d) => d.getTime()))),
    end: new Date(Math.max(...dates.map((d) => d.getTime()))),
  };

  return {
    totalMessages: messages.length,
    totalMembers: members.length,
    dateRange,
    mediaCount,
    systemMessageCount,
    members: finalMap,
  };
}

function createEmptyStats(): ExtendedStats {
  return {
    totalMessages: 0,
    textMessages: 0,
    mediaMessages: 0,
    averageMessageLength: 0,
    mostActiveHour: 0,
    mostActiveDay: "ראשון",
    emojiCount: 0,
    topEmojis: [],
    longestMessage: "",
    responseTimeAvg: null,
    nightMessages: 0,
    morningMessages: 0,
    afternoonMessages: 0,
    eveningMessages: 0,
    _hourCounts: new Array(24).fill(0),
    _dayCounts: new Array(7).fill(0),
    _emojiMap: new Map(),
  };
}
