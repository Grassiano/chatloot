"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRoomContext } from "@/components/room/room-provider";
import { t } from "@/lib/i18n/he";

/** Room hub — redirects based on current phase and role */
export default function RoomHubPage() {
  const router = useRouter();
  const { room, isGm, isLoading, error } = useRoomContext();

  useEffect(() => {
    if (!room || isLoading) return;

    const base = `/room/${room.code}`;

    switch (room.phase) {
      case "setup":
        if (isGm) {
          router.replace(`${base}/setup`);
        } else {
          router.replace(`${base}/lobby`);
        }
        break;
      case "lobby":
        router.replace(`${base}/lobby`);
        break;
      case "playing":
        router.replace(`${base}/game`);
        break;
      case "results":
        router.replace(`${base}/results`);
        break;
    }
  }, [room, isGm, isLoading, router]);

  if (error === "room_not_found") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#FAFAFE]">
        <p className="text-xl font-bold text-loot-ink">{t("room.not_found")}</p>
        <button
          onClick={() => router.push("/")}
          className="rounded-xl bg-[#8B5CF6] px-6 min-h-[44px] flex items-center justify-center font-bold text-white"
        >
          {t("common.back")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAFE]">
      <p className="text-loot-ink-secondary">{t("common.loading")}</p>
    </div>
  );
}
