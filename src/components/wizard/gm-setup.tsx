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
  onComplete: (
    questions: WhoSaidItQuestion[],
    memberPhotos: Map<string, string>
  ) => void;
}

export function GmSetup({ chat, analysis, onComplete }: GmSetupProps) {
  const wizard = useWizard();

  // Always start immediately without AI — inject analysis later when it arrives
  useEffect(() => {
    wizard.initFallback(chat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Inject AI results when they arrive (from background polling)
  useEffect(() => {
    if (analysis && !wizard.state.isAiEnhanced) {
      wizard.injectAnalysis(analysis);
    }
  }, [analysis, wizard]);

  const handleRevealComplete = useCallback(() => {
    wizard.goToStep(2);
  }, [wizard]);

  const finishWizard = useCallback(() => {
    const questions = wizard.buildFinalQuestions();
    const photos = wizard.getMemberPhotoMap();
    wizard.revokeWizardPhotos();
    onComplete(questions, photos);
  }, [wizard, onComplete]);

  // Try to advance to highlights, or finish if no AI
  const tryAdvanceToHighlightsOrFinish = useCallback(() => {
    if (wizard.state.highlights.length > 0) {
      wizard.goToStep(4);
    } else {
      finishWizard();
    }
  }, [wizard, finishWizard]);

  // After member review → highlights or finish
  const handleMembersComplete = useCallback(() => {
    tryAdvanceToHighlightsOrFinish();
  }, [tryAdvanceToHighlightsOrFinish]);

  const handleHighlightsComplete = useCallback(() => {
    finishWizard();
  }, [finishWizard]);

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

        {wizard.state.currentStep === 4 && (
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
