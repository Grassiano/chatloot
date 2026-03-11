import { describe, it, expect } from "vitest";
import { assignPersonalities } from "./personality";
import type { ChatMember, MemberStats } from "@/lib/parser/types";

function makeMemberStats(overrides: Partial<MemberStats> = {}): MemberStats {
  return {
    totalMessages: 100,
    textMessages: 80,
    mediaMessages: 20,
    averageMessageLength: 30,
    mostActiveHour: 14,
    mostActiveDay: "Monday",
    emojiCount: 10,
    topEmojis: [],
    longestMessage: "hello world",
    responseTimeAvg: 5,
    nightMessages: 5,
    morningMessages: 20,
    afternoonMessages: 40,
    eveningMessages: 35,
    burstCount: 3,
    questionCount: 5,
    deletedCount: 0,
    forwardedCount: 0,
    editedCount: 0,
    conversationStarts: 2,
    longestGhostDays: 1,
    linkCount: 3,
    topWords: [],
    averageWordsPerMessage: 5,
    ...overrides,
  };
}

const MEMBERS: ChatMember[] = [
  {
    displayName: "Alice",
    messageCount: 200,
    firstMessage: new Date(),
    lastMessage: new Date(),
    aliases: [],
  },
  {
    displayName: "Bob",
    messageCount: 50,
    firstMessage: new Date(),
    lastMessage: new Date(),
    aliases: [],
  },
];

describe("assignPersonalities", () => {
  it("works with a real Map", () => {
    const statsMap = new Map<string, MemberStats>();
    statsMap.set("Alice", makeMemberStats({ totalMessages: 200 }));
    statsMap.set("Bob", makeMemberStats({ totalMessages: 50, nightMessages: 40 }));

    const result = assignPersonalities(MEMBERS, statsMap);

    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(2);
    expect(result.get("Alice")).toBeDefined();
    expect(result.get("Alice")!.emoji).toBeTruthy();
    expect(result.get("Bob")).toBeDefined();
  });

  it("works with a plain object (JSON roundtrip)", () => {
    const statsMap = new Map<string, MemberStats>();
    statsMap.set("Alice", makeMemberStats({ totalMessages: 200 }));
    statsMap.set("Bob", makeMemberStats({ totalMessages: 50, nightMessages: 40 }));

    // Simulate JSON roundtrip — Map becomes a plain object
    const serialized = JSON.parse(
      JSON.stringify(Object.fromEntries(statsMap))
    ) as Record<string, MemberStats>;

    const result = assignPersonalities(MEMBERS, serialized);

    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(2);
    expect(result.get("Alice")).toBeDefined();
    expect(result.get("Alice")!.emoji).toBeTruthy();
    expect(result.get("Bob")).toBeDefined();
  });

  it("returns empty map when no members have stats", () => {
    const emptyMap = new Map<string, MemberStats>();
    const result = assignPersonalities(MEMBERS, emptyMap);
    expect(result.size).toBe(0);
  });

  it("handles undefined/null via plain empty object", () => {
    // asMap handles null/undefined → empty Map
    const result = assignPersonalities(MEMBERS, {} as Record<string, MemberStats>);
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });
});
