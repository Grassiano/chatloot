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

const STOPWORDS = new Set([
  "את", "של", "על", "עם", "זה", "לא", "אני", "גם", "כל", "יש",
  "מה", "אם", "אבל", "כי", "הוא", "היא", "אנחנו", "הם", "לי",
  "שלי", "היה", "אז", "פה", "שם", "טוב", "רוצה", "צריך", "יודע",
  "בסדר", "ואני", "שאני", "אותי", "ולא", "כן", "אותו", "עוד",
  "the", "and", "is", "to", "in", "it", "of", "for", "that",
  "you", "this", "was", "are", "not", "with", "but", "have",
  "lol", "haha", "yeah", "yes", "no", "ok", "okay",
]);

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const BURST_THRESHOLD = 5;

interface ExtendedStats extends MemberStats {
  _hourCounts: number[];
  _dayCounts: number[];
  _emojiMap: Map<string, number>;
  _responseTimes: number[];
  _currentBurst: number;
  _lastOwnMessage: Date | null;
  _maxGhostMs: number;
  _wordMap: Map<string, number>;
  _totalWordCount: number;
}

export function extractStats(
  messages: ParsedMessage[],
  members: ChatMember[]
): ChatStats {
  const memberStatsMap = new Map<string, ExtendedStats>();
  let mediaCount = 0;
  let systemMessageCount = 0;
  let conversationCount = 0;

  // Global hour/day counts for ChatStats peaks
  const globalHourCounts = new Array(24).fill(0) as number[];
  const globalDayCounts = new Array(7).fill(0) as number[];

  // Loop-scoped variables for burst + response time + conversation tracking
  let prevAuthor: string | null = null;
  let prevTime: Date | null = null;
  let currentBurstAuthor: string | null = null;
  let currentBurstCount = 0;

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

    // --- Metadata-driven stats ---
    if (msg.meta.isDeleted) stats.deletedCount++;
    if (msg.meta.isForwarded) stats.forwardedCount++;
    if (msg.meta.isEdited) stats.editedCount++;
    if (msg.meta.hasQuestion) stats.questionCount++;
    if (msg.meta.hasLink) stats.linkCount++;

    // --- Conversation starts (4h+ gap) ---
    if (prevTime) {
      const gap = msg.date.getTime() - prevTime.getTime();
      if (gap > FOUR_HOURS_MS) {
        stats.conversationStarts++;
        conversationCount++;
      }
    }

    // --- Response time (when author changes) ---
    if (prevAuthor && prevTime && msg.author !== prevAuthor) {
      const responseMs = msg.date.getTime() - prevTime.getTime();
      if (responseMs > 0 && responseMs < TWENTY_FOUR_HOURS_MS) {
        stats._responseTimes.push(responseMs);
      }
    }

    // --- Burst tracking ---
    if (msg.author === currentBurstAuthor) {
      currentBurstCount++;
    } else {
      // Finalize previous burst
      if (currentBurstCount >= BURST_THRESHOLD && currentBurstAuthor) {
        const prevStats = memberStatsMap.get(currentBurstAuthor);
        if (prevStats) prevStats.burstCount++;
      }
      currentBurstAuthor = msg.author;
      currentBurstCount = 1;
    }

    // --- Ghost period (longest personal absence) ---
    if (stats._lastOwnMessage) {
      const gapMs = msg.date.getTime() - stats._lastOwnMessage.getTime();
      if (gapMs > stats._maxGhostMs) {
        stats._maxGhostMs = gapMs;
      }
    }
    stats._lastOwnMessage = msg.date;

    // --- Media vs text ---
    if (isMediaMessage(msg.message)) {
      stats.mediaMessages++;
      mediaCount++;
    } else if (!msg.meta.isDeleted) {
      stats.textMessages++;
      stats.averageMessageLength += msg.message.length;

      if (msg.message.length > stats.longestMessage.length) {
        stats.longestMessage = msg.message;
      }

      // Emoji counting
      const emojis = msg.message.match(EMOJI_REGEX) ?? [];
      stats.emojiCount += emojis.length;
      for (const emoji of emojis) {
        stats._emojiMap.set(emoji, (stats._emojiMap.get(emoji) ?? 0) + 1);
      }

      // Word frequency
      const words = msg.message.split(/\s+/).filter(Boolean);
      stats._totalWordCount += words.length;
      for (const raw of words) {
        const word = raw.toLowerCase().replace(/[.,!?;:"""''()[\]{}]/g, "");
        if (word.length < 3 || STOPWORDS.has(word)) continue;
        stats._wordMap.set(word, (stats._wordMap.get(word) ?? 0) + 1);
      }
    }

    // Time of day distribution + hour/day counts
    const hour = msg.date.getHours();
    const day = msg.date.getDay();
    stats._hourCounts[hour]++;
    stats._dayCounts[day]++;
    globalHourCounts[hour]++;
    globalDayCounts[day]++;

    if (hour >= 0 && hour < 5) stats.nightMessages++;
    else if (hour >= 5 && hour < 12) stats.morningMessages++;
    else if (hour >= 12 && hour < 18) stats.afternoonMessages++;
    else stats.eveningMessages++;

    prevAuthor = msg.author;
    prevTime = msg.date;
  }

  // Finalize last burst
  if (currentBurstCount >= BURST_THRESHOLD && currentBurstAuthor) {
    const lastStats = memberStatsMap.get(currentBurstAuthor);
    if (lastStats) lastStats.burstCount++;
  }

  // Derive final stats from accumulated data
  const finalMap = new Map<string, MemberStats>();

  for (const [name, stats] of memberStatsMap) {
    if (stats.textMessages > 0) {
      stats.averageMessageLength = Math.round(
        stats.averageMessageLength / stats.textMessages
      );
      stats.averageWordsPerMessage = Math.round(
        stats._totalWordCount / stats.textMessages
      );
    }

    // Response time (median, converted to minutes)
    if (stats._responseTimes.length > 0) {
      stats._responseTimes.sort((a, b) => a - b);
      const mid = Math.floor(stats._responseTimes.length / 2);
      const medianMs =
        stats._responseTimes.length % 2 === 0
          ? (stats._responseTimes[mid - 1] + stats._responseTimes[mid]) / 2
          : stats._responseTimes[mid];
      stats.responseTimeAvg = Math.round(medianMs / 60_000);
    }

    // Ghost days
    stats.longestGhostDays = Math.round(stats._maxGhostMs / 86_400_000);

    // Most active hour & day
    stats.mostActiveHour = stats._hourCounts.indexOf(
      Math.max(...stats._hourCounts)
    );
    stats.mostActiveDay =
      DAY_NAMES_HE[stats._dayCounts.indexOf(Math.max(...stats._dayCounts))];

    // Top emojis
    stats.topEmojis = Array.from(stats._emojiMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([emoji, count]) => ({ emoji, count }));

    // Top words
    stats.topWords = Array.from(stats._wordMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word, count]) => ({ word, count }));

    // Strip internal fields for the final output
    const {
      _hourCounts: _,
      _dayCounts: __,
      _emojiMap: ___,
      _responseTimes: ____,
      _currentBurst: _____,
      _lastOwnMessage: ______,
      _maxGhostMs: _______,
      _wordMap: ________,
      _totalWordCount: _________,
      ...memberStats
    } = stats;
    finalMap.set(name, memberStats);
  }

  // Date range
  const authoredMessages = messages.filter((m) => m.author !== null);
  const dates = authoredMessages.map((m) => m.date);
  const dateRange = {
    start: new Date(Math.min(...dates.map((d) => d.getTime()))),
    end: new Date(Math.max(...dates.map((d) => d.getTime()))),
  };

  const totalDays = Math.max(
    1,
    Math.round(
      (dateRange.end.getTime() - dateRange.start.getTime()) / 86_400_000
    )
  );

  return {
    totalMessages: messages.length,
    totalMembers: members.length,
    dateRange,
    mediaCount,
    systemMessageCount,
    members: finalMap,
    peakHour: globalHourCounts.indexOf(Math.max(...globalHourCounts)),
    busiestDay:
      DAY_NAMES_HE[globalDayCounts.indexOf(Math.max(...globalDayCounts))],
    conversationCount,
    totalDays,
    messagesPerDay: Math.round(authoredMessages.length / totalDays),
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
    responseTimeAvg: 0,
    nightMessages: 0,
    morningMessages: 0,
    afternoonMessages: 0,
    eveningMessages: 0,
    burstCount: 0,
    questionCount: 0,
    deletedCount: 0,
    forwardedCount: 0,
    editedCount: 0,
    conversationStarts: 0,
    longestGhostDays: 0,
    linkCount: 0,
    topWords: [],
    averageWordsPerMessage: 0,
    _hourCounts: new Array(24).fill(0),
    _dayCounts: new Array(7).fill(0),
    _emojiMap: new Map(),
    _responseTimes: [],
    _currentBurst: 0,
    _lastOwnMessage: null,
    _maxGhostMs: 0,
    _wordMap: new Map(),
    _totalWordCount: 0,
  };
}
