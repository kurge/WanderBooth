import { describe, expect, it } from "vitest";
import { photoCrop } from "./photoFraming";

describe("landscape 4:3 framing", () => {
  it.each([
    [1200, 900, { left: 0, top: 0, width: 1200, height: 900 }],
    [1920, 1080, { left: 240, top: 0, width: 1440, height: 1080 }],
    [5184, 3456, { left: 288, top: 0, width: 4608, height: 3456 }],
    [900, 1200, { left: 0, top: 262, width: 900, height: 675 }],
    [900, 900, { left: 0, top: 112, width: 900, height: 675 }],
    [1921, 1081, { left: 240, top: 0, width: 1440, height: 1080 }],
  ])("centers %s × %s without stretching", (width, height, expected) => {
    expect(photoCrop(width, height)).toEqual(expected);
  });
  it.each([
    [0, 0],
    [3, 10],
    [10, 2],
    [Infinity, 1080],
    [1920.5, 1080],
  ])("rejects invalid dimensions %s × %s", (width, height) =>
    expect(() => photoCrop(width, height)).toThrow(),
  );
});
