import { useCallback, useEffect, useState } from "react";

import { hostHttpUrl } from "./useBoothConnection";

export type TetherCameraStatus = {
  configured: boolean;
  downloadDirectory: string | null;
  lastError: string | null;
  lastFileName: string | null;
  ready: boolean;
  verifiedAt: string | null;
};

const emptyStatus: TetherCameraStatus = {
  configured: false,
  downloadDirectory: null,
  lastError: null,
  lastFileName: null,
  ready: false,
  verifiedAt: null,
};

const responseError = async (response: Response, fallback: string) => {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return new Error(body?.error ?? fallback);
};

export function useTetherCamera(active: boolean) {
  const [status, setStatus] = useState<TetherCameraStatus>(emptyStatus);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`${hostHttpUrl}/api/tether-camera`);
      if (!response.ok) throw await responseError(response, "Camera status could not be checked.");
      const nextStatus = (await response.json()) as TetherCameraStatus;
      setStatus(nextStatus);
      setError(nextStatus.lastError);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Camera status failed.");
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), 4_000);
    return () => window.clearInterval(timer);
  }, [active, refresh]);

  const chooseFolder = useCallback(async () => {
    setMessage(null);
    setError(null);
    if (!window.wanderBooth?.selectTetherFolder) {
      setError("Choose the Fujifilm folder from the installed WanderBooth desktop app.");
      return;
    }

    setLoading(true);
    try {
      const downloadDirectory = await window.wanderBooth.selectTetherFolder();
      if (!downloadDirectory) return;
      const response = await fetch(`${hostHttpUrl}/api/tether-camera`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ downloadDirectory }),
      });
      if (!response.ok)
        throw await responseError(response, "The camera folder could not be saved.");
      const nextStatus = (await response.json()) as TetherCameraStatus;
      setStatus(nextStatus);
      setMessage("Folder connected. Run one test transfer before serving guests.");
    } catch (folderError) {
      setError(folderError instanceof Error ? folderError.message : "Folder setup failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  const testTransfer = useCallback(async () => {
    setTesting(true);
    setError(null);
    setMessage("Waiting up to 30 seconds. Take one JPEG photo with the X-M5 now.");
    try {
      const response = await fetch(`${hostHttpUrl}/api/tether-camera/test`, { method: "POST" });
      if (!response.ok) throw await responseError(response, "No Fujifilm photo was received.");
      const result = (await response.json()) as {
        filename: string;
        status: TetherCameraStatus;
      };
      setStatus(result.status);
      setMessage(`Transfer verified with ${result.filename}.`);
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : "The transfer test failed.");
      setMessage(null);
      await refresh();
    } finally {
      setTesting(false);
    }
  }, [refresh]);

  return {
    chooseFolder,
    error,
    loading,
    message,
    refresh,
    status,
    testing,
    testTransfer,
  };
}
