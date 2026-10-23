export type CanonCameraStatus = {
  available: boolean;
  connected: boolean;
  model: string | null;
  busy: boolean;
  capturing: boolean;
  previewing: boolean;
  ready: boolean;
  verifiedAt: string | null;
  lastError: string | null;
  lastPhoto: { filename: string; width: number; height: number } | null;
};
