import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

import sharp from "sharp";

const palettes = [
  ["#ddf426", "#3572c4", "#fffaf2"],
  ["#3572c4", "#fffc02", "#fffaf2"],
  ["#da6319", "#290942", "#fffaf2"],
];

const xml = (value: string) =>
  value.replace(/[<>&'"]/g, (character) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;",
    };
    return entities[character];
  });

export type SimulatedCaptureResult = {
  absolutePath: string;
  mediaUrl: string;
  capturedAt: string;
};

export async function takeSimulatedPhoto(input: {
  dataDirectory: string;
  eventId?: string | null;
  sessionId: string;
  slot: number;
  revision: number;
}): Promise<SimulatedCaptureResult> {
  const palette = palettes[(input.slot - 1) % palettes.length];
  const relativePath = join(
    ...(input.eventId ? ["events", input.eventId, "sessions"] : ["sessions"]),
    input.sessionId,
    "captures",
    `photo-${input.slot}-r${input.revision}.png`,
  );
  const absolutePath = join(input.dataDirectory, relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });

  const capturedAt = new Date().toISOString();
  const svg = `
    <svg width="1200" height="800" viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${palette[0]}" />
          <stop offset="0.55" stop-color="${palette[2]}" />
          <stop offset="1" stop-color="#fffaf2" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#background)" />
      <circle cx="170" cy="140" r="170" fill="${palette[1]}" opacity="0.92" />
      <circle cx="1090" cy="700" r="230" fill="${palette[0]}" opacity="0.78" />
      <path d="M800 50 C970 85 1010 260 930 350 C850 440 655 390 660 230 C665 120 710 35 800 50Z" fill="${palette[1]}" opacity="0.2" />
      <rect x="330" y="210" width="540" height="380" rx="190" fill="#fffaf2" opacity="0.78" />
      <text x="600" y="330" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="700" fill="#290942">SIMULATED CAMERA</text>
      <text x="600" y="442" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="128" font-weight="800" fill="${palette[1]}">${input.slot}</text>
      <text x="600" y="512" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="27" fill="#30385e">Photo ${input.slot} · Take ${input.revision}</text>
      <text x="600" y="700" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="#290942">WanderBooth prototype · ${xml(capturedAt)}</text>
    </svg>
  `;

  await sharp(Buffer.from(svg)).png().toFile(absolutePath);

  return {
    absolutePath,
    mediaUrl: `/media/${relativePath.split("\\").join("/")}`,
    capturedAt,
  };
}
