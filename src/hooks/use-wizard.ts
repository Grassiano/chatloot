"use client";

import { useState, useCallback, useRef } from "react";
import type { ParsedChat } from "@/lib/parser/types";
import type { WhoSaidItQuestion } from "@/lib/game/types";
import type { AnalysisResult } from "@/lib/ai/analyze-chat";
import type {
  MemberProfile,
  HighlightCard,
  HighlightCategory,
  WizardState,
} from "@/lib/wizard/types";
import {
  assignPersonalities,
  pickSampleMessages,
  findMemberVoiceNote,
} from "@/lib/wizard/personality";

interface UseWizardReturn {
  state: WizardState;

  /** Initialize wizard from chat + AI results */
  init: (chat: ParsedChat, analysis: AnalysisResult) => void;
  /** Initialize wizard without AI (fallback) */
  initFallback: (chat: ParsedChat) => void;

  /** Navigation */
  goToStep: (step: 1 | 2 | 3 | 4) => void;

  /** Profile actions */
  setNickname: (displayName: string, nickname: string) => void;
  setMemberPhoto: (displayName: string, url: string, blob: Blob | null) => void;
  tagPhoto: (displayName: string, photoUrl: string) => void;
  removeTaggedPhoto: (displayName: string, photoUrl: string) => void;
  mergeMember: (source: string, target: string) => void;
  unmergeMember: (displayName: string) => void;

  /** Highlight actions */
  toggleApproval: (index: number) => void;
  editGmNote: (index: number, note: string) => void;
  setCategory: (index: number, category: HighlightCategory | null) => void;
  approveAll: () => void;

  /** AI progressive enhancement */
  updateAiSummaries: (summaries: Record<string, string>) => void;

  /** Final output */
  buildFinalQuestions: () => WhoSaidItQuestion[];
  getMemberPhotoMap: () => Map<string, string>;

  /** Cleanup */
  revokeWizardPhotos: () => void;
}

const EMPTY_STATE: WizardState = {
  profiles: [],
  highlights: [],
  currentStep: 1,
  isAiEnhanced: false,
};

export function useWizard(): UseWizardReturn {
  const [state, setState] = useState<WizardState>(EMPTY_STATE);
  const photoUrlsRef = useRef<string[]>([]);

  const buildProfiles = useCallback(
    (
      chat: ParsedChat,
      aiSummaries?: Record<string, string>
    ): MemberProfile[] => {
      const personalities = assignPersonalities(
        chat.members,
        chat.stats.members
      );

      return chat.members.map((member) => {
        const stats = chat.stats.members.get(member.displayName);
        const personality = personalities.get(member.displayName);
        const samples = pickSampleMessages(chat, member.displayName);
        const voice = findMemberVoiceNote(chat, member.displayName);

        return {
          displayName: member.displayName,
          nickname: member.displayName,
          photoUrl: null,
          photoBlob: null,

          messageCount: member.messageCount,
          avgMessageLength: stats?.averageMessageLength ?? 0,
          topEmojis: stats?.topEmojis.slice(0, 5) ?? [],
          mostActiveHour: stats?.mostActiveHour ?? 0,
          nightMessages: stats?.nightMessages ?? 0,
          mediaMessages: stats?.mediaMessages ?? 0,

          personalityTitle: personality?.title ?? "חבר הקבוצה",
          personalityEmoji: personality?.emoji ?? "💬",
          personalitySummary: personality?.summary ?? "",
          aiSummary: aiSummaries?.[member.displayName] ?? null,

          taggedPhotos: [],
          voiceNoteCount: voice?.count ?? 0,
          sampleVoiceUrl: voice?.url ?? null,

          sampleMessages: samples,
          mergedInto: null,
        };
      });
    },
    []
  );

  const buildHighlights = useCallback(
    (analysis: AnalysisResult): HighlightCard[] => {
      return analysis.questions.map((q, i) => ({
        question: q,
        aiScore: analysis.scores[i]?.score ?? 5,
        aiReason: analysis.scores[i]?.reason ?? "",
        approved: true,
        gmNoteEdited: q.gmNote ?? "",
        category: null,
        priority: i,
      }));
    },
    []
  );

  const init = useCallback(
    (chat: ParsedChat, analysis: AnalysisResult) => {
      const profiles = buildProfiles(chat, analysis.memberSummaries);
      const highlights = buildHighlights(analysis);

      setState({
        profiles,
        highlights,
        currentStep: 1,
        isAiEnhanced: analysis.isAiEnhanced,
      });
    },
    [buildProfiles, buildHighlights]
  );

  const initFallback = useCallback(
    (chat: ParsedChat) => {
      const profiles = buildProfiles(chat);

      setState({
        profiles,
        highlights: [],
        currentStep: 1,
        isAiEnhanced: false,
      });
    },
    [buildProfiles]
  );

  const goToStep = useCallback((step: 1 | 2 | 3 | 4) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  }, []);

  // --- Profile actions ---

  const setNickname = useCallback(
    (displayName: string, nickname: string) => {
      setState((prev) => ({
        ...prev,
        profiles: prev.profiles.map((p) =>
          p.displayName === displayName ? { ...p, nickname } : p
        ),
      }));
    },
    []
  );

  const setMemberPhoto = useCallback(
    (displayName: string, url: string, blob: Blob | null) => {
      photoUrlsRef.current.push(url);
      setState((prev) => ({
        ...prev,
        profiles: prev.profiles.map((p) =>
          p.displayName === displayName
            ? { ...p, photoUrl: url, photoBlob: blob }
            : p
        ),
      }));
    },
    []
  );

  const tagPhoto = useCallback(
    (displayName: string, photoUrl: string) => {
      setState((prev) => ({
        ...prev,
        profiles: prev.profiles.map((p) => {
          if (p.displayName !== displayName) return p;
          if (p.taggedPhotos.includes(photoUrl)) return p;
          const tagged = [...p.taggedPhotos, photoUrl];
          return {
            ...p,
            taggedPhotos: tagged,
            // First tagged photo becomes avatar if none set
            photoUrl: p.photoUrl ?? photoUrl,
          };
        }),
      }));
    },
    []
  );

  const removeTaggedPhoto = useCallback(
    (displayName: string, photoUrl: string) => {
      setState((prev) => ({
        ...prev,
        profiles: prev.profiles.map((p) => {
          if (p.displayName !== displayName) return p;
          const tagged = p.taggedPhotos.filter((u) => u !== photoUrl);
          return {
            ...p,
            taggedPhotos: tagged,
            photoUrl:
              p.photoUrl === photoUrl ? tagged[0] ?? null : p.photoUrl,
          };
        }),
      }));
    },
    []
  );

  const mergeMember = useCallback(
    (source: string, target: string) => {
      setState((prev) => ({
        ...prev,
        profiles: prev.profiles.map((p) =>
          p.displayName === source ? { ...p, mergedInto: target } : p
        ),
      }));
    },
    []
  );

  const unmergeMember = useCallback((displayName: string) => {
    setState((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) =>
        p.displayName === displayName ? { ...p, mergedInto: null } : p
      ),
    }));
  }, []);

  // --- Highlight actions ---

  const toggleApproval = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      highlights: prev.highlights.map((h, i) =>
        i === index ? { ...h, approved: !h.approved } : h
      ),
    }));
  }, []);

  const editGmNote = useCallback((index: number, note: string) => {
    setState((prev) => ({
      ...prev,
      highlights: prev.highlights.map((h, i) =>
        i === index ? { ...h, gmNoteEdited: note } : h
      ),
    }));
  }, []);

  const setCategory = useCallback(
    (index: number, category: HighlightCategory | null) => {
      setState((prev) => ({
        ...prev,
        highlights: prev.highlights.map((h, i) =>
          i === index ? { ...h, category } : h
        ),
      }));
    },
    []
  );

  const approveAll = useCallback(() => {
    setState((prev) => ({
      ...prev,
      highlights: prev.highlights.map((h) => ({ ...h, approved: true })),
    }));
  }, []);

  // --- AI progressive enhancement ---

  const updateAiSummaries = useCallback(
    (summaries: Record<string, string>) => {
      setState((prev) => ({
        ...prev,
        isAiEnhanced: true,
        profiles: prev.profiles.map((p) => ({
          ...p,
          aiSummary: summaries[p.displayName] ?? p.aiSummary,
        })),
      }));
    },
    []
  );

  // --- Final output ---

  const buildFinalQuestions = useCallback((): WhoSaidItQuestion[] => {
    // Build merge map: source displayName → target displayName
    const mergeMap = new Map<string, string>();
    for (const p of state.profiles) {
      if (p.mergedInto) {
        mergeMap.set(p.displayName, p.mergedInto);
      }
    }

    // Build nickname map: displayName → nickname
    const nicknameMap = new Map<string, string>();
    for (const p of state.profiles) {
      if (!p.mergedInto) {
        nicknameMap.set(p.displayName, p.nickname);
      }
    }

    const resolveName = (name: string): string => {
      const merged = mergeMap.get(name);
      const resolved = merged ?? name;
      return nicknameMap.get(resolved) ?? resolved;
    };

    return state.highlights
      .filter((h) => h.approved)
      .map((h) => ({
        messageText: h.question.messageText,
        correctAuthor: resolveName(h.question.correctAuthor),
        options: h.question.options.map(resolveName),
        timestamp: h.question.timestamp,
        gmNote: h.gmNoteEdited || h.question.gmNote,
      }));
  }, [state.profiles, state.highlights]);

  const getMemberPhotoMap = useCallback((): Map<string, string> => {
    const map = new Map<string, string>();
    for (const p of state.profiles) {
      if (p.photoUrl && !p.mergedInto) {
        map.set(p.nickname, p.photoUrl);
      }
    }
    return map;
  }, [state.profiles]);

  const revokeWizardPhotos = useCallback(() => {
    for (const url of photoUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    photoUrlsRef.current = [];
  }, []);

  return {
    state,
    init,
    initFallback,
    goToStep,
    setNickname,
    setMemberPhoto,
    tagPhoto,
    removeTaggedPhoto,
    mergeMember,
    unmergeMember,
    toggleApproval,
    editGmNote,
    setCategory,
    approveAll,
    updateAiSummaries,
    buildFinalQuestions,
    getMemberPhotoMap,
    revokeWizardPhotos,
  };
}
