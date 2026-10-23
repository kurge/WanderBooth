import { hostHttpUrl } from "./useBoothConnection";
import type { useCanonCamera } from "./useCanonCamera";

export function CanonCameraControls({
  camera,
  isIdle,
}: {
  camera: ReturnType<typeof useCanonCamera>;
  isIdle: boolean;
}) {
  const { status, working, error, action, testPhotoUrl } = camera;
  const disabled = !isIdle || working || status.busy;
  return (
    <div className="camera-control camera-control--tether">
      {status.previewing && (
        <img
          className="canon-camera-preview"
          src={`${hostHttpUrl}/api/camera-preview`}
          alt="Mirrored Canon live preview"
        />
      )}
      <ol>
        <li>Connect the Canon 60D to this Mac with its USB data cable and turn it on.</li>
        <li>Close EOS Utility, EOS Webcam Utility, Photos and Image Capture.</li>
        <li>
          Use still-photo mode, JPEG or RAW+JPEG, a writable SD card and Auto power off disabled.
        </li>
        <li>Connect live view, then take a test photo to check focus and preview recovery.</li>
      </ol>
      <p role="status">
        {status.ready
          ? "Ready · live view and test photo verified"
          : status.previewing
            ? "Live view connected · take a test photo"
            : status.connected
              ? "Camera detected · reconnect live view"
              : "Connect the camera to begin"}
      </p>
      {(error || status.lastError) && (
        <p className="camera-control__error" role="alert">
          {error || status.lastError}
        </p>
      )}
      <div className="camera-control__actions">
        <button
          type="button"
          className="button button--quiet button--tiny"
          disabled={disabled || !status.available}
          onClick={() => void action("connect")}
        >
          {working ? "Working…" : status.connected ? "Reconnect Canon" : "Connect Canon live view"}
        </button>
        <button
          type="button"
          className="button button--primary button--tiny"
          disabled={disabled || !status.previewing}
          onClick={() => void action("test")}
        >
          Take Canon test photo
        </button>
        {status.connected && (
          <button
            type="button"
            className="button button--quiet button--tiny"
            disabled={disabled}
            onClick={() => void action("disconnect")}
          >
            Disconnect Canon
          </button>
        )}
      </div>
      {testPhotoUrl && (
        <>
          <img
            className="canon-camera-preview"
            src={testPhotoUrl}
            alt="Full Canon test photograph, not mirrored"
          />
          <p>
            Test photo: {status.lastPhoto?.width} × {status.lastPhoto?.height}. Camera copy
            retained. This test is not added to a customer session.
          </p>
        </>
      )}
      <p>
        Experimental · Mac only. USB supplies live view and full-resolution photos. Preview pauses
        briefly during each photo, then resumes.
      </p>
    </div>
  );
}
