"use client";

import { useCallback, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import type { ParsedChat } from "@/lib/parser/types";
import type { AnalysisResult } from "@/lib/ai/analyze-chat";
import type { WhoSaidItQuestion } from "@/lib/game/types";
import { useWizard } from "@/hooks/use-wizard";
import { GroupReveal } from "./group-reveal";
import { MemberCards } from "./member-cards";
import { HighlightsReview } from "./highlights-review";

interface GmSetupProps {
  chat: ParsedChat;
  analysis: AnalysisResult | null;
  onComplete: (questions: WhoSaidItQuestion[], memberPhotos: Map<string, string>) => void;
}

export function GmSetup({ chat, analysis, onComplete }: GmSetupProps) {
  const wizard = useWizard();

  // Initialize wizard when mounted
  useEffect(() => {
    if (analysis) {
      wizard.init(chat, analysis);
    } else {
      wizard.initFallback(chat);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRevealComplete = useCallback(() => {
    wizard.goToStep(2);
  }, [wizard]);

  const handleMembersComplete = useCallback(() => {
    if (wizard.state.highlights.length > 0) {
      wizard.goToStep(3);
    } else {
      // No AI highlights — go straight to game with fallback questions
      const questions = wizard.buildFinalQuestions();
      const photos = wizard.getMemberPhotoMap();
      wizard.revokeWizardPhotos();
      onComplete(questions, photos);
    }
  }, [wizard, onComplete]);

  const handleHighlightsComplete = useCallback(() => {
    const questions = wizard.buildFinalQuestions();
    const photos = wizard.getMemberPhotoMap();
    onComplete(questions, photos);
  }, [wizard, onComplete]);

  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      <AnimatePresence mode="wait">
        {wizard.state.currentStep === 1 && (
          <GroupReveal
            key="reveal"
            chat={chat}
            onComplete={handleRevealComplete}
          />
        )}

        {wizard.state.currentStep === 2 && (
          <MemberCards
            key="members"
            profiles={wizard.state.profiles}
            chat={chat}
            onSetNickname={wizard.setNickname}
            onSetPhoto={wizard.setMemberPhoto}
            onTagPhoto={wizard.tagPhoto}
            onComplete={handleMembersComplete}
          />
        )}

        {wizard.state.currentStep === 3 && (
          <HighlightsReview
            key="highlights"
            highlights={wizard.state.highlights}
            onToggleApproval={wizard.toggleApproval}
            onEditGmNote={wizard.editGmNote}
            onSetCategory={wizard.setCategory}
            onApproveAll={wizard.approveAll}
            onComplete={handleHighlightsComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
