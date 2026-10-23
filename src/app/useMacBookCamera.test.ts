import { afterEach, describe, expect, it, vi } from "vitest";
import { previewFrameToJpeg, videoFrameToJpeg } from "./useMacBookCamera";

afterEach(() => vi.restoreAllMocks());
describe("browser camera frames", () => {
  it("sends the full unmirrored capture and full mirrored preview so templates can choose either crop", async () => {
    const drawImage = vi.fn();
    const translate = vi.fn();
    const scale = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage,
      translate,
      scale,
    } as unknown as CanvasRenderingContext2D);
    const sizes: number[][] = [];
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (
      this: HTMLCanvasElement,
      callback,
    ) {
      sizes.push([this.width, this.height]);
      callback(new Blob(["synthetic"], { type: "image/jpeg" }));
    });
    const video = document.createElement("video");
    Object.defineProperties(video, {
      readyState: { value: 2 },
      videoWidth: { value: 1920 },
      videoHeight: { value: 1080 },
    });
    await videoFrameToJpeg(video);
    expect(drawImage).toHaveBeenLastCalledWith(video, 0, 0, 1920, 1080);
    expect(scale).not.toHaveBeenCalled();
    await previewFrameToJpeg(video);
    expect(drawImage).toHaveBeenLastCalledWith(video, 0, 0, 1920, 1080, 0, 0, 960, 540);
    expect(translate).toHaveBeenCalledWith(960, 0);
    expect(scale).toHaveBeenCalledWith(-1, 1);
    expect(sizes).toEqual([
      [1920, 1080],
      [960, 540],
    ]);
  });
});
