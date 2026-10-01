import { useCallback, useEffect, useRef, useState } from "react";

import type { BoothState, Command } from "../shared/session";
import { hostHttpUrl } from "./useBoothConnection";

export type CameraStatus = "off" | "requesting" | "ready" | "error";

const cameraErrorMessage = (error: unknown) => {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "Camera access was not allowed. Enable WanderBooth in System Settings → Privacy & Security → Camera, then try again.";
  }
  if (error instanceof DOMException && error.name === "NotFoundError") {
    return "No camera was found on this Mac.";
  }
  if (error instanceof Error) return error.message;
  return "The MacBook camera could not be started.";
};

const waitForVideo = (video: HTMLVideoElement) =>
  new Promise<void>((resolve, reject) => {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
      resolve();
      return;
    }

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("The camera preview did not become ready in time."));
    }, 8_000);
    const ready = () => {
      cleanup();
      resolve();
    };
    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener("loadeddata", ready);
    };
    video.addEventListener("loadeddata", ready, { once: true });
  });

const videoFrameToJpeg = async (video: HTMLVideoElement) => {
  await waitForVideo(video);
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("The camera frame could not be prepared.");
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("The camera frame could not be saved."))),
      "image/jpeg",
      0.94,
    );
  });
};

const previewFrameToJpeg = async (video: HTMLVideoElement) => {
  await waitForVideo(video);
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 540;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("The preview frame could not be prepared.");

  const targetAspect = canvas.width / canvas.height;
  const sourceAspect = video.videoWidth / video.videoHeight;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = video.videoWidth;
  let sourceHeight = video.videoHeight;
  if (sourceAspect > targetAspect) {
    sourceWidth = video.videoHeight * targetAspect;
    sourceX = (video.videoWidth - sourceWidth) / 2;
  } else if (sourceAspect < targetAspect) {
    sourceHeight = video.videoWidth / targetAspect;
    sourceY = (video.videoHeight - sourceHeight) / 2;
  }

  context.translate(canvas.width, 0);
  context.scale(-1, 1);
  context.drawImage(
    video,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("The preview frame failed."))),
      "image/jpeg",
      0.66,
    );
  });
};

export function useMacBookCamera({
  active,
  state,
  sendCommand,
}: {
  active: boolean;
  state: BoothState | null;
  sendCommand: (command: Command) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handledCaptureRef = useRef<string | null>(null);
  const [status, setStatus] = useState<CameraStatus>("off");
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("off");
  }, []);

  const startCamera = useCallback(async (requestedDeviceId?: string) => {
    setStatus("requesting");
    setError(null);

    try {
      for (const track of streamRef.current?.getTracks() ?? []) track.stop();

      let nextStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: requestedDeviceId
          ? {
              deviceId: { exact: requestedDeviceId },
              height: { ideal: 1080 },
              width: { ideal: 1920 },
            }
          : { height: { ideal: 1080 }, width: { ideal: 1920 } },
      });

      const videoDevices = (await navigator.mediaDevices.enumerateDevices()).filter(
        (device) => device.kind === "videoinput",
      );
      setDevices(videoDevices);

      if (!requestedDeviceId) {
        const builtIn = videoDevices.find((device) =>
          /facetime|built-in|macbook/i.test(device.label),
        );
        const currentDeviceId = nextStream.getVideoTracks()[0]?.getSettings().deviceId;
        if (builtIn?.deviceId && builtIn.deviceId !== currentDeviceId) {
          for (const track of nextStream.getTracks()) track.stop();
          nextStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              deviceId: { exact: builtIn.deviceId },
              height: { ideal: 1080 },
              width: { ideal: 1920 },
            },
          });
        }
      }

      streamRef.current = nextStream;
      const track = nextStream.getVideoTracks()[0];
      setSelectedDeviceId(track?.getSettings().deviceId ?? null);
      track?.addEventListener(
        "ended",
        () => {
          setStatus("error");
          setError("The selected camera disconnected.");
        },
        { once: true },
      );

      if (!videoRef.current) throw new Error("The camera preview is not available.");
      videoRef.current.srcObject = nextStream;
      await videoRef.current.play();
      await waitForVideo(videoRef.current);
      setStatus("ready");
    } catch (cameraError) {
      for (const track of streamRef.current?.getTracks() ?? []) track.stop();
      streamRef.current = null;
      setStatus("error");
      setError(cameraErrorMessage(cameraError));
    }
  }, []);

  useEffect(() => {
    if (!active) {
      stopCamera();
      setError(null);
      setDevices([]);
      setSelectedDeviceId(null);
      handledCaptureRef.current = null;
    }
  }, [active, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  useEffect(() => {
    if (!active || status !== "ready" || !videoRef.current) return;

    let cancelled = false;
    let timer: number | undefined;
    const publishPreview = async () => {
      try {
        if (!videoRef.current || cancelled) return;
        const frame = await previewFrameToJpeg(videoRef.current);
        await fetch(`${hostHttpUrl}/api/camera-preview`, {
          method: "POST",
          headers: { "Content-Type": "image/jpeg" },
          body: frame,
        });
      } catch {
        // A preview interruption must not fail or duplicate the full-resolution capture workflow.
      } finally {
        if (!cancelled) timer = window.setTimeout(publishPreview, 200);
      }
    };

    void publishPreview();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [active, status]);

  useEffect(() => {
    const pending = state?.pendingCapture;
    if (!active || state?.phase !== "capturing" || !pending || !state.sessionId) return;

    const captureKey = `${state.sessionId}:${pending.kind}:${pending.slot}:${pending.revision}`;
    if (handledCaptureRef.current === captureKey) return;

    if (status === "error") {
      handledCaptureRef.current = captureKey;
      sendCommand({
        type: "CAMERA_CAPTURE_FAILED",
        message: error ?? "The selected camera is not available.",
      });
      return;
    }
    if (status !== "ready" || !videoRef.current) return;

    handledCaptureRef.current = captureKey;
    const capture = async () => {
      try {
        await new Promise((resolve) => window.setTimeout(resolve, 180));
        if (!videoRef.current) throw new Error("The camera preview closed before capture.");
        const jpeg = await videoFrameToJpeg(videoRef.current);
        const response = await fetch(`${hostHttpUrl}/api/camera-captures`, {
          method: "POST",
          headers: {
            "Content-Type": "image/jpeg",
            "X-Session-Id": state.sessionId ?? "",
          },
          body: jpeg,
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "The Host could not save the captured photo.");
        }
      } catch (captureError) {
        sendCommand({ type: "CAMERA_CAPTURE_FAILED", message: cameraErrorMessage(captureError) });
      }
    };
    void capture();
  }, [active, error, sendCommand, state, status]);

  return {
    devices,
    error,
    selectedDeviceId,
    startCamera,
    status,
    stopCamera,
    videoRef,
  };
}
