import { useCallback, useEffect, useState } from "react";

import type { CanonCameraStatus } from "../shared/canonCamera";
import { hostHttpUrl } from "./useBoothConnection";

const emptyStatus: CanonCameraStatus = {
  available: false,
  connected: false,
  model: null,
  busy: false,
  capturing: false,
  previewing: false,
  ready: false,
  verifiedAt: null,
  lastError: null,
  lastPhoto: null,
};

export function useCanonCamera(active: boolean) {
  const [status, setStatus] = useState(emptyStatus);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testPhotoUrl, setTestPhotoUrl] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`${hostHttpUrl}/api/canon-camera`);
      if (!response.ok) throw new Error("Canon status could not be checked.");
      setStatus((await response.json()) as CanonCameraStatus);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Canon status failed.");
    }
  }, []);
  useEffect(() => {
    if (!active) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2_000);
    return () => window.clearInterval(timer);
  }, [active, refresh]);

  const action = useCallback(
    async (name: "connect" | "disconnect" | "test") => {
      setWorking(true);
      setError(null);
      if (name !== "test") setTestPhotoUrl(null);
      try {
        const response = await fetch(`${hostHttpUrl}/api/canon-camera/${name}`, { method: "POST" });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Canon setup failed.");
        setStatus(body as CanonCameraStatus);
        if (name === "test")
          setTestPhotoUrl(`${hostHttpUrl}/api/canon-camera/test-photo?t=${Date.now()}`);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Canon setup failed.");
        await refresh();
      } finally {
        setWorking(false);
      }
    },
    [refresh],
  );
  return { status, working, error, testPhotoUrl, action };
}
