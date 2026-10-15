import { useCallback, useEffect, useState } from "react";

import { hostHttpUrl } from "./useBoothConnection";

export type DirectXm5Status = {
  available: boolean;
  capturing: boolean;
  lastError: string | null;
  lastFileName: string | null;
  ready: boolean;
  verifiedAt: string | null;
};

const emptyStatus: DirectXm5Status = {
  available: false,
  capturing: false,
  lastError: null,
  lastFileName: null,
  ready: false,
  verifiedAt: null,
};

const responseError = async (response: Response, fallback: string) => {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return new Error(body?.error ?? fallback);
};

export function useDirectXm5Camera(active: boolean) {
  const [status, setStatus] = useState<DirectXm5Status>(emptyStatus);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`${hostHttpUrl}/api/direct-xm5-camera`);
      if (!response.ok) throw await responseError(response, "X-M5 status could not be checked.");
      const nextStatus = (await response.json()) as DirectXm5Status;
      setStatus(nextStatus);
      setError(nextStatus.lastError);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "X-M5 status failed.");
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), 4_000);
    return () => window.clearInterval(timer);
  }, [active, refresh]);

  const testCapture = useCallback(async () => {
    setTesting(true);
    setMessage("Taking one full-resolution X-M5 test photo…");
    setError(null);
    try {
      const response = await fetch(`${hostHttpUrl}/api/direct-xm5-camera/test`, {
        method: "POST",
      });
      if (!response.ok) throw await responseError(response, "The X-M5 test photo failed.");
      const result = (await response.json()) as {
        filename: string;
        status: DirectXm5Status;
      };
      setStatus(result.status);
      setMessage(`Automatic capture verified with ${result.filename}. Camera copy retained.`);
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : "The X-M5 test photo failed.");
      setMessage(null);
      await refresh();
    } finally {
      setTesting(false);
    }
  }, [refresh]);

  return { error, message, refresh, status, testing, testCapture };
}
