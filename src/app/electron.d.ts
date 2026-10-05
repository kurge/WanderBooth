export {};

declare global {
  interface Window {
    wanderBooth?: {
      printCurrentWindow: () => Promise<{
        success: boolean;
        failureReason: string | null;
      }>;
    };
  }
}
