// @vitest-environment node
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { getLayout } from "../shared/catalog";
import { type BoothState, initialBoothState } from "../shared/session";
import { prepareCustomOverlay } from "./customOverlay";
import { buildDeliverables } from "./deliverables";

const layoutId = "vertical-four-photo-2x6";
describe("four-shot strip output", () => {
  it("accepts single-strip 600×1800 artwork and rejects a full 4×6 sheet", async () => {
    const layout = getLayout(layoutId);
    if (!layout) throw new Error("Missing four-photo strip");
    const source = await sharp({
      create: { width: 600, height: 1800, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .png()
      .toBuffer();
    expect(
      await sharp(await prepareCustomOverlay(source, layout, "transparent_artwork")).metadata(),
    ).toMatchObject({ width: 600, height: 1800, hasAlpha: true });
    const wrong = await sharp(source).resize(1200, 1800, { fit: "fill" }).png().toBuffer();
    await expect(prepareCustomOverlay(wrong, layout, "transparent_artwork")).rejects.toThrow(
      "600×1800",
    );
  });

  it.each(["color", "custom"] as const)(
    "prints two pixel-identical copies of the same four photos with a %s frame",
    async (frameMode) => {
      const directory = await mkdtemp(join(tmpdir(), "wanderbooth-four-print-"));
      try {
        const layout = getLayout(layoutId);
        if (!layout) throw new Error("Missing four-photo strip");
        const colors = [
          [220, 20, 30],
          [20, 180, 40],
          [30, 40, 210],
          [190, 150, 20],
        ];
        const state: BoothState = {
          ...initialBoothState(),
          sessionId: "four-print",
          layoutId,
          requiredCaptureCount: 4,
          productId: "three-photo-strip",
          designId: frameMode === "color" ? "ruby-cream" : null,
          frameMode,
          overlayId: "none",
        };
        if (frameMode === "custom") {
          await sharp(
            Buffer.from(
              '<svg width="600" height="1800"><rect width="600" height="30" fill="red"/></svg>',
            ),
          )
            .png()
            .toFile(join(directory, "art.png"));
          state.overlayId = "four-art";
          state.customOverlays = [
            {
              id: "four-art",
              name: "Synthetic custom frame",
              description: "Test",
              kind: "custom",
              layoutIds: [layoutId],
              mediaUrl: "/media/art.png",
              importMode: "transparent_artwork",
              pixelWidth: 600,
              pixelHeight: 1800,
            },
          ];
        }
        for (const [index, [r, g, b]] of colors.entries()) {
          await sharp({ create: { width: 480, height: 360, channels: 3, background: { r, g, b } } })
            .png()
            .toFile(join(directory, `photo-${index}.png`));
          state.captures.push({
            slot: index + 1,
            revision: 1,
            capturedAt: "2026-10-23T00:00:00Z",
            mediaUrl: `/media/photo-${index}.png`,
          });
        }
        const files = await buildDeliverables(state, directory);
        expect(files.filter((file) => file.kind === "individual")).toHaveLength(4);
        const pathFor = (kind: string) => {
          const file = files.find((item) => item.kind === kind);
          if (!file) throw new Error(`Missing ${kind}`);
          return join(directory, file.mediaUrl.replace("/media/", ""));
        };
        const strip = pathFor("strip");
        const print = pathFor("print");
        expect(await sharp(strip).metadata()).toMatchObject({
          width: 600,
          height: 1800,
          density: 300,
        });
        expect(await sharp(print).metadata()).toMatchObject({
          width: 1200,
          height: 1800,
          density: 300,
        });
        const stripPixels = await sharp(strip).ensureAlpha().raw().toBuffer();
        for (const left of [0, 600]) {
          const copy = await sharp(print)
            .extract({ left, top: 0, width: 600, height: 1800 })
            .ensureAlpha()
            .raw()
            .toBuffer();
          expect(copy.equals(stripPixels)).toBe(true);
          for (const [index, slot] of layout.slots.entries()) {
            const pixel = await sharp(print)
              .extract({
                left: left + slot.x + slot.width / 2,
                top: slot.y + slot.height / 2,
                width: 1,
                height: 1,
              })
              .removeAlpha()
              .raw()
              .toBuffer();
            expect([...pixel]).toEqual(colors[index]);
          }
        }
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    },
    30_000,
  );
});
