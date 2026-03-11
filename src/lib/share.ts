/**
 * Share card generator and native sharing utility.
 * Uses Canvas API — zero dependencies.
 */

interface ShareData {
  winner: { name: string; score: number };
  leaderboard: Array<{ name: string; score: number; rank: number }>;
  groupName: string | null;
  totalRounds: number;
}

const CARD_W = 600;
const CARD_H = 800;

/** Generate a share card as a PNG blob using Canvas */
export async function generateShareImage(data: ShareData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d")!;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, CARD_H);
  grad.addColorStop(0, "#1a1a2e");
  grad.addColorStop(1, "#0A0A0F");
  ctx.fillStyle = grad;
  roundRect(ctx, 0, 0, CARD_W, CARD_H, 24);
  ctx.fill();

  // Glass overlay
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  roundRect(ctx, 20, 20, CARD_W - 40, CARD_H - 40, 16);
  ctx.fill();

  ctx.textAlign = "center";

  // Crown
  ctx.font = "48px serif";
  ctx.fillText("👑", CARD_W / 2, 80);

  // Winner name
  ctx.fillStyle = "#F5C542";
  ctx.font = "bold 36px -apple-system, sans-serif";
  ctx.fillText(data.winner.name, CARD_W / 2, 130);

  // Winner score
  ctx.fillStyle = "#ffffff";
  ctx.font = "24px -apple-system, sans-serif";
  ctx.fillText(`${data.winner.score} נקודות`, CARD_W / 2, 170);

  // Divider
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, 200);
  ctx.lineTo(CARD_W - 80, 200);
  ctx.stroke();

  // Leaderboard
  let y = 250;
  ctx.textAlign = "right";
  const medals = ["👑", "🥈", "🥉"];

  for (const player of data.leaderboard.slice(0, 5)) {
    const medal = medals[player.rank - 1] ?? `${player.rank}`;

    // Row background
    if (player.rank === 1) {
      ctx.fillStyle = "rgba(245,197,66,0.1)";
      roundRect(ctx, 40, y - 25, CARD_W - 80, 45, 10);
      ctx.fill();
    }

    // Medal
    ctx.font = "20px serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(medal, 60, y + 5);

    // Name
    ctx.font = "18px -apple-system, sans-serif";
    ctx.fillStyle = player.rank === 1 ? "#F5C542" : "#ffffff";
    ctx.textAlign = "right";
    ctx.fillText(player.name, CARD_W - 120, y + 5);

    // Score
    ctx.fillStyle = "#F5C542";
    ctx.font = "bold 18px -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(String(player.score), CARD_W - 100, y + 5);

    y += 55;
  }

  // Group name + rounds
  ctx.textAlign = "center";
  ctx.fillStyle = "#8B949E";
  ctx.font = "14px -apple-system, sans-serif";
  if (data.groupName) {
    ctx.fillText(`"${data.groupName}" · ${data.totalRounds} סיבובים`, CARD_W / 2, CARD_H - 80);
  } else {
    ctx.fillText(`${data.totalRounds} סיבובים`, CARD_W / 2, CARD_H - 80);
  }

  // Watermark
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "bold 13px -apple-system, sans-serif";
  ctx.fillText("chatloot.app", CARD_W / 2, CARD_H - 40);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas toBlob failed"));
    }, "image/png");
  });
}

/** Share using native share API (mobile) or clipboard fallback (desktop) */
export async function shareResults(data: ShareData): Promise<"shared" | "copied" | "failed"> {
  try {
    const blob = await generateShareImage(data);
    const file = new File([blob], "chatloot-results.png", { type: "image/png" });

    // Try native share (mobile)
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        text: `🎮 ${data.winner.name} ניצח/ה ב-ChatLoot!`,
        files: [file],
      });
      return "shared";
    }

    // Desktop fallback: copy image to clipboard
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);
    return "copied";
  } catch {
    return "failed";
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
