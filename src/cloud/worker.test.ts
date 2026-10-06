// @vitest-environment node

import { describe, expect, it } from "vitest";

import { isDeliveryToken, renderReadyPage } from "./worker";

describe("Cloudflare QR gallery", () => {
  it("accepts only the 192-bit URL-safe delivery token format", () => {
    expect(isDeliveryToken("abcdefghijklmnopqrstuvwxyzABCDEF")).toBe(true);
    expect(isDeliveryToken("short-token")).toBe(false);
    expect(isDeliveryToken("abcdefghijklmnopqrstuvwxyzABCDE!")).toBe(false);
  });

  it("renders only branded manifest files and escapes labels", () => {
    const page = renderReadyPage(
      "abcdefghijklmnopqrstuvwxyzABCDEF",
      [
        {
          file_id: "individual-1.png",
          kind: "individual",
          label: "Photo <One>",
          mime_type: "image/png",
          object_key: "token/individual-1.png",
          byte_size: 120,
          uploaded_at: "2026-10-06T00:04:00.000Z",
        },
      ],
      "2026-11-05T00:03:00.000Z",
    );

    expect(page).toContain("Your photos are ready");
    expect(page).toContain("Photo &lt;One&gt;");
    expect(page).not.toContain("Photo <One>");
    expect(page).toContain("download=1");
  });
});
