import { useEffect, useMemo } from "react";

import wanderPressSplashLogo from "../../assets/brand/source/wander-press-splash-shadow.png";
import {
  designs,
  getLayout,
  getProduct,
  type Layout,
  layouts,
  type Overlay,
  overlaySupportsLayout,
  overlays,
  products,
} from "../shared/catalog";
import type { Actor, BoothState, Command, OperationMode } from "../shared/session";
import { createId } from "./createId";
import { hostHttpUrl, useBoothConnection } from "./useBoothConnection";
import { type CameraStatus, useMacBookCamera } from "./useMacBookCamera";

type Surface = "operator" | "customer";

const surface = (new URLSearchParams(window.location.search).get("surface") ??
  "operator") as Surface;

const phaseLabels: Record<BoothState["phase"], string> = {
  idle: "Ready for a new guest",
  selecting: "Choose the experience",
  awaiting_cash: "Waiting for cash confirmation",
  ready: "Ready for the next photo",
  countdown: "Get ready…",
  capturing: "Capturing…",
  reviewing: "Review your photos",
  processing: "Building your WanderBooth set",
  complete: "Your photos are ready",
  error: "The booth needs attention",
};

const actorForSurface = (selectedSurface: Surface): Actor =>
  selectedSurface === "operator" ? "attendant" : "customer";

const mediaSource = (url: string) => `${hostHttpUrl}${url}`;

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-mark ${compact ? "brand-mark--compact" : ""}`}>
      <span className="brand-mark__splat" aria-hidden="true">
        <img src={wanderPressSplashLogo} alt="" />
      </span>
      <span>
        <strong>WanderBooth</strong>
        <small>by Wander Press PH</small>
      </span>
    </div>
  );
}

function ConnectionBadge({ connected }: { connected: boolean }) {
  return (
    <span className={`connection ${connected ? "connection--online" : "connection--offline"}`}>
      <i aria-hidden="true" />
      {connected ? "Host connected" : "Reconnecting"}
    </span>
  );
}

function ModeSelector({
  value,
  sendCommand,
}: {
  value: OperationMode;
  sendCommand: (command: Command) => void;
}) {
  return (
    <fieldset className="mode-selector">
      <legend>Who controls the session?</legend>
      <button
        className={value === "attendant" ? "mode-card mode-card--selected" : "mode-card"}
        type="button"
        onClick={() => sendCommand({ type: "SET_MODE", mode: "attendant" })}
      >
        <span className="mode-card__icon">A</span>
        <span>
          <strong>Attendant-operated</strong>
          <small>Staff chooses and retakes. The iPad presents the experience.</small>
        </span>
      </button>
      <button
        className={value === "self_service" ? "mode-card mode-card--selected" : "mode-card"}
        type="button"
        onClick={() => sendCommand({ type: "SET_MODE", mode: "self_service" })}
      >
        <span className="mode-card__icon">S</span>
        <span>
          <strong>Self-service</strong>
          <small>The guest chooses, captures, reviews, and approves on the iPad.</small>
        </span>
      </button>
    </fieldset>
  );
}

function CapturePreview({ state }: { state: BoothState }) {
  const slots = Array.from({ length: state.requiredCaptureCount || 3 }, (_, index) => index + 1);
  return (
    <section
      className="photo-grid"
      aria-label="Session photos"
      style={{ gridTemplateColumns: `repeat(${Math.min(slots.length, 4)}, minmax(0, 1fr))` }}
    >
      {slots.map((slot) => {
        const capture = state.captures.find((item) => item.slot === slot);
        return (
          <figure className={capture ? "photo-card photo-card--filled" : "photo-card"} key={slot}>
            {capture ? (
              <img src={mediaSource(capture.mediaUrl)} alt={`Capture ${slot}`} />
            ) : (
              <div className="photo-card__empty">
                <span>{slot}</span>
                <small>Waiting for photo</small>
              </div>
            )}
          </figure>
        );
      })}
    </section>
  );
}

function LayoutThumbnail({ layout }: { layout: Layout }) {
  return (
    <span
      className="layout-thumbnail"
      style={{ aspectRatio: `${layout.canvasWidth} / ${layout.canvasHeight}` }}
      aria-hidden="true"
    >
      {layout.slots.map((slot) => (
        <i
          className={`layout-thumbnail__slot layout-thumbnail__slot--${slot.shape}`}
          key={`${slot.captureIndex}-${slot.x}-${slot.y}`}
          style={{
            left: `${(slot.x / layout.canvasWidth) * 100}%`,
            top: `${(slot.y / layout.canvasHeight) * 100}%`,
            width: `${(slot.width / layout.canvasWidth) * 100}%`,
            height: `${(slot.height / layout.canvasHeight) * 100}%`,
          }}
        />
      ))}
      <b>{layout.printSize.replace("x", "×")}</b>
    </span>
  );
}

function OverlayThumbnail({ overlay }: { overlay: Overlay }) {
  return (
    <span className={`overlay-thumbnail overlay-thumbnail--${overlay.kind}`} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

function LiveCameraPreview({ state }: { state: BoothState }) {
  const countdown = state.phase === "countdown" ? state.captureSequence?.remaining : null;
  const isRetake = state.captureSequence?.kind === "retake";
  const activeSlot =
    state.captureSequence?.kind === "retake"
      ? state.captureSequence.slot
      : state.captures.length + 1;

  return (
    <section
      className={`live-camera ${state.cameraSourceId === "simulator" ? "live-camera--simulator" : ""}`}
      aria-label="Live camera preview"
    >
      {state.cameraSourceId === "macbook_camera" ? (
        <img src={`${hostHttpUrl}/api/camera-preview`} alt="Mirrored live camera preview" />
      ) : (
        <div className="live-camera__simulator">
          <span>TEST</span>
          <strong>Camera simulator</strong>
        </div>
      )}
      <div className="live-camera__guide" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <span className="live-camera__badge">
        {state.cameraSourceId === "macbook_camera" ? "Mirrored preview" : "Synthetic preview"}
      </span>
      {countdown && (
        <div className="countdown-overlay" role="status" aria-live="assertive">
          <small>
            {isRetake
              ? `Retake photo ${activeSlot}`
              : `Photo ${activeSlot} of ${state.requiredCaptureCount}`}
          </small>
          <strong key={`${activeSlot}-${countdown}`}>{countdown}</strong>
          <span>Look at the camera</span>
        </div>
      )}
      {state.phase === "capturing" && (
        <div className="capture-flash" role="status">
          <strong>Smile!</strong>
        </div>
      )}
    </section>
  );
}

function SelectionPanel({
  state,
  interactive,
  sendCommand,
}: {
  state: BoothState;
  interactive: boolean;
  sendCommand: (command: Command) => void;
}) {
  const selectedProduct = getProduct(state.productId);
  const selectedLayout = getLayout(state.layoutId);
  const availableLayouts = selectedProduct
    ? selectedProduct.layoutIds
        .map((layoutId) => layouts.find((layout) => layout.id === layoutId))
        .filter((layout): layout is Layout => Boolean(layout))
    : [];
  const availableOverlays = selectedLayout
    ? overlays.filter((overlay) => overlaySupportsLayout(overlay, selectedLayout.id))
    : [];
  const canSubmit = Boolean(
    state.productId && state.layoutId && state.designId && state.consentRecorded,
  );

  if (!interactive) {
    return (
      <section className="customer-message">
        <span className="eyebrow">Attendant-operated session</span>
        <h1>We’ll set everything up for you.</h1>
        <p>
          Your attendant is choosing the layout, frame, and overlay. You’ll see each photo here.
        </p>
        <div className="waiting-dots" role="status" aria-label="Waiting">
          <i />
          <i />
          <i />
        </div>
      </section>
    );
  }

  return (
    <section className="selection-panel">
      <div className="section-heading">
        <span className="eyebrow">Build your photo keepsake</span>
        <h1>Choose a product, layout, frame, and overlay.</h1>
        <p>
          Every layout sets its own photo count automatically. Pricing remains on the physical menu
          for now.
        </p>
      </div>

      <div className="catalog-section">
        <div className="catalog-section__heading">
          <span className="choice-summary__number">01</span>
          <div>
            <small>Product</small>
            <h2>Choose the photo experience</h2>
          </div>
        </div>
        <div className="product-grid">
          {products.map((product) => (
            <button
              className={
                state.productId === product.id
                  ? "catalog-card catalog-card--selected"
                  : "catalog-card"
              }
              type="button"
              key={product.id}
              onClick={() => sendCommand({ type: "SELECT_PRODUCT", productId: product.id })}
            >
              <strong>{product.name}</strong>
              <span>{product.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="catalog-section">
        <div className="catalog-section__heading">
          <span className="choice-summary__number">02</span>
          <div>
            <small>Layout</small>
            <h2>Choose how the photos are arranged</h2>
          </div>
        </div>
        <div className="layout-grid">
          {availableLayouts.map((layout) => (
            <button
              className={
                state.layoutId === layout.id ? "layout-card layout-card--selected" : "layout-card"
              }
              type="button"
              key={layout.id}
              onClick={() => sendCommand({ type: "SELECT_LAYOUT", layoutId: layout.id })}
            >
              <LayoutThumbnail layout={layout} />
              <span>
                <strong>{layout.name}</strong>
                <small>
                  {layout.requiredCaptureCount} photos · {layout.description}
                </small>
              </span>
            </button>
          ))}
          {!selectedProduct && <p className="catalog-empty">Choose a product first.</p>}
        </div>
      </div>

      <div className="catalog-section">
        <div className="catalog-section__heading">
          <span className="choice-summary__number">03</span>
          <div>
            <small>Frame</small>
            <h2>Choose the colors and frame style</h2>
          </div>
        </div>
        <div className="design-grid design-grid--frames">
          {designs.map((design) => (
            <button
              className={
                state.designId === design.id ? "design-card design-card--selected" : "design-card"
              }
              style={
                {
                  "--accent": design.accent,
                  "--background": design.background,
                } as React.CSSProperties
              }
              type="button"
              key={design.id}
              disabled={!state.layoutId}
              onClick={() => sendCommand({ type: "SELECT_DESIGN", designId: design.id })}
            >
              <span className="design-card__preview">
                <i />
                <i />
                <i />
              </span>
              <strong>{design.name}</strong>
              <small>{design.description}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="catalog-section">
        <div className="catalog-section__heading">
          <span className="choice-summary__number">04</span>
          <div>
            <small>Overlay</small>
            <h2>Add an optional foreground design</h2>
          </div>
        </div>
        <div className="overlay-grid">
          {availableOverlays.map((overlay) => (
            <button
              className={
                state.overlayId === overlay.id
                  ? "overlay-card overlay-card--selected"
                  : "overlay-card"
              }
              type="button"
              key={overlay.id}
              disabled={!state.designId}
              onClick={() => sendCommand({ type: "SELECT_OVERLAY", overlayId: overlay.id })}
            >
              <OverlayThumbnail overlay={overlay} />
              <span>
                <strong>{overlay.name}</strong>
                <small>{overlay.description}</small>
              </span>
            </button>
          ))}
          {!selectedLayout && <p className="catalog-empty">Choose a layout first.</p>}
        </div>
      </div>

      <div className="consent-row">
        <button
          className={state.consentRecorded ? "consent consent--checked" : "consent"}
          type="button"
          disabled={!state.designId}
          onClick={() => sendCommand({ type: "RECORD_CONSENT" })}
        >
          <span aria-hidden="true">{state.consentRecorded ? "✓" : ""}</span>I agree to have these
          photos processed for this session.
        </button>
        <button
          className="button button--primary button--large"
          type="button"
          disabled={!canSubmit}
          onClick={() => sendCommand({ type: "SUBMIT_SELECTION" })}
        >
          Continue to cash confirmation
        </button>
      </div>
    </section>
  );
}

function SessionPanel({
  state,
  interactive,
  isOperator,
  sendCommand,
}: {
  state: BoothState;
  interactive: boolean;
  isOperator: boolean;
  sendCommand: (command: Command) => void;
}) {
  if (state.phase === "selecting") {
    return <SelectionPanel state={state} interactive={interactive} sendCommand={sendCommand} />;
  }

  if (state.phase === "awaiting_cash") {
    return (
      <section className="center-stage">
        <span className="cash-icon" aria-hidden="true">
          ₱
        </span>
        <span className="eyebrow">Cash payment</span>
        <h1>
          {isOperator ? "Confirm payment when cash is received." : "Please see your attendant."}
        </h1>
        <p>No amount is displayed in this prototype. Use the physical menu for pricing.</p>
        {isOperator && (
          <button
            className="button button--primary button--large"
            type="button"
            onClick={() => sendCommand({ type: "CONFIRM_CASH" })}
          >
            Cash received · Continue
          </button>
        )}
      </section>
    );
  }

  if (["ready", "countdown", "capturing"].includes(state.phase)) {
    const isRetake = state.captureSequence?.kind === "retake";
    const nextPhoto =
      state.captureSequence?.kind === "retake"
        ? state.captureSequence.slot
        : state.captures.length + 1;
    const photosRemaining = Math.max(0, state.requiredCaptureCount - state.captures.length);
    const heading =
      state.phase === "ready"
        ? `One tap takes all ${state.requiredCaptureCount} photos.`
        : state.phase === "countdown"
          ? "Get ready…"
          : "Hold that pose…";
    return (
      <section className="capture-stage capture-stage--live">
        <div className="capture-stage__copy">
          <span className="eyebrow">
            {isRetake
              ? `Retake photo ${nextPhoto}`
              : `Photo ${Math.min(nextPhoto, state.requiredCaptureCount)} of ${state.requiredCaptureCount}`}
          </span>
          <h1>{heading}</h1>
          <p>
            {state.phase === "ready"
              ? "There is a three-second countdown before each photo, with a short pause between shots."
              : "Stay inside the guide. The saved photo is not mirrored."}
          </p>
          {interactive && state.phase === "ready" && (
            <button
              className="shutter"
              type="button"
              onClick={() => sendCommand({ type: "START_CAPTURE_SEQUENCE" })}
            >
              <span aria-hidden="true" />
              Start {photosRemaining}-photo sequence
            </button>
          )}
        </div>
        <div className="capture-stage__visual">
          <LiveCameraPreview state={state} />
          {state.captures.length > 0 && <CapturePreview state={state} />}
        </div>
      </section>
    );
  }

  if (state.phase === "reviewing") {
    return (
      <section className="review-stage">
        <div className="section-heading section-heading--horizontal">
          <div>
            <span className="eyebrow">Review</span>
            <h1>Keep these {state.requiredCaptureCount} photos?</h1>
          </div>
          <p>{state.retakesRemaining} retakes remaining</p>
        </div>
        <CapturePreview state={state} />
        {interactive ? (
          <>
            <div
              className="retake-row"
              style={{
                gridTemplateColumns: `repeat(${Math.min(state.captures.length, 4)}, minmax(0, 1fr))`,
              }}
            >
              {state.captures.map((capture) => (
                <button
                  className="button button--quiet"
                  type="button"
                  disabled={state.retakesRemaining === 0}
                  key={capture.slot}
                  onClick={() => sendCommand({ type: "RETAKE", slot: capture.slot })}
                >
                  Retake photo {capture.slot}
                </button>
              ))}
            </div>
            <div className="review-footer">
              <div className="mini-designs">
                <span>Frame</span>
                {designs.map((design) => (
                  <button
                    type="button"
                    key={design.id}
                    title={design.name}
                    aria-label={`Use ${design.name}`}
                    aria-pressed={state.designId === design.id}
                    style={{ background: design.background, borderColor: design.accent }}
                    onClick={() => sendCommand({ type: "SELECT_DESIGN", designId: design.id })}
                  />
                ))}
              </div>
              <div className="mini-overlays">
                <span>Overlay</span>
                {overlays
                  .filter(
                    (overlay) =>
                      Boolean(state.layoutId) &&
                      overlaySupportsLayout(overlay, state.layoutId ?? ""),
                  )
                  .map((overlay) => (
                    <button
                      type="button"
                      key={overlay.id}
                      title={overlay.name}
                      aria-label={`Use ${overlay.name}`}
                      aria-pressed={state.overlayId === overlay.id}
                      onClick={() => sendCommand({ type: "SELECT_OVERLAY", overlayId: overlay.id })}
                    >
                      <OverlayThumbnail overlay={overlay} />
                    </button>
                  ))}
              </div>
              <button
                className="button button--primary button--large"
                type="button"
                onClick={() => sendCommand({ type: "APPROVE" })}
              >
                Approve and make my set
              </button>
            </div>
          </>
        ) : (
          <div className="customer-message customer-message--compact">
            <p>Tell your attendant if you’d like to replace a photo.</p>
          </div>
        )}
      </section>
    );
  }

  if (state.phase === "processing") {
    return (
      <section className="center-stage">
        <div className="processing-orbit" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <span className="eyebrow">Nearly there</span>
        <h1>Making the branded photos, keepsake, and slideshow.</h1>
        <p>Everything is rendered on this Mac for the offline-first prototype.</p>
      </section>
    );
  }

  if (state.phase === "complete") {
    return (
      <section className="delivery-stage">
        <div className="section-heading">
          <span className="eyebrow">Session complete</span>
          <h1>Your WanderBooth set is ready.</h1>
          <p>
            These links are local to the booth. The private 30-day cloud QR page is the next
            delivery milestone.
          </p>
        </div>
        <div className="deliverable-grid">
          {state.deliverables.map((deliverable) => (
            <a
              className={`deliverable deliverable--${deliverable.kind}`}
              href={mediaSource(deliverable.mediaUrl)}
              target="_blank"
              rel="noreferrer"
              key={deliverable.mediaUrl}
            >
              <span>
                {deliverable.kind === "slideshow" ? "▶" : deliverable.kind === "strip" ? "▥" : "◫"}
              </span>
              <strong>{deliverable.label}</strong>
              <small>Open file</small>
            </a>
          ))}
        </div>
        {isOperator && (
          <button
            className="button button--dark button--large"
            type="button"
            onClick={() => sendCommand({ type: "RESET" })}
          >
            Finish and reset booth
          </button>
        )}
      </section>
    );
  }

  if (state.phase === "error") {
    return (
      <section className="center-stage">
        <span className="error-icon" aria-hidden="true">
          !
        </span>
        <span className="eyebrow">Operator action needed</span>
        <h1>{state.lastError ?? "Something interrupted the session."}</h1>
        {isOperator && (
          <button
            className="button button--dark"
            type="button"
            onClick={() => sendCommand({ type: "RESET" })}
          >
            Reset booth
          </button>
        )}
      </section>
    );
  }

  return null;
}

function OperatorSidebar({
  state,
  camera,
  customerUrls,
  sendCommand,
}: {
  state: BoothState;
  camera: {
    devices: MediaDeviceInfo[];
    error: string | null;
    selectedDeviceId: string | null;
    startCamera: (deviceId?: string) => Promise<void>;
    status: CameraStatus;
    stopCamera: () => void;
    videoRef: React.RefObject<HTMLVideoElement | null>;
  };
  customerUrls: string[];
  sendCommand: (command: Command) => void;
}) {
  const isIdle = state.phase === "idle";
  const macBookSelected = state.cameraSourceId === "macbook_camera";
  const selectedLayout = getLayout(state.layoutId);

  return (
    <aside className="operator-sidebar">
      <section>
        <span className="eyebrow">Pilot hardware</span>
        <h2>Camera source</h2>
        <button
          className={`device-card device-card--selectable ${
            state.cameraSourceId === "simulator" ? "device-card--ready device-card--selected" : ""
          }`}
          type="button"
          disabled={!isIdle}
          onClick={() => sendCommand({ type: "SET_CAMERA_SOURCE", cameraSourceId: "simulator" })}
        >
          <span className="device-card__status" />
          <div>
            <strong>Prototype simulator</strong>
            <small>
              {state.cameraSourceId === "simulator" ? "Ready · active source" : "Available"}
            </small>
          </div>
        </button>
        <button
          className={`device-card device-card--selectable ${
            macBookSelected && camera.status === "ready"
              ? "device-card--ready device-card--selected"
              : macBookSelected
                ? "device-card--selected"
                : ""
          }`}
          type="button"
          disabled={!isIdle}
          onClick={() =>
            sendCommand({ type: "SET_CAMERA_SOURCE", cameraSourceId: "macbook_camera" })
          }
        >
          <span className="device-card__status" />
          <div>
            <strong>MacBook camera</strong>
            <small>
              {!macBookSelected && "Available · experimental"}
              {macBookSelected && camera.status === "off" && "Selected · needs to be enabled"}
              {macBookSelected && camera.status === "requesting" && "Requesting camera access…"}
              {macBookSelected && camera.status === "ready" && "Ready · active source"}
              {macBookSelected && camera.status === "error" && "Needs attention"}
            </small>
          </div>
        </button>

        {macBookSelected && (
          <div className="camera-control">
            <video
              ref={camera.videoRef}
              muted
              playsInline
              aria-label="Live MacBook camera preview"
            />
            {camera.devices.length > 1 && (
              <label>
                Video device
                <select
                  value={camera.selectedDeviceId ?? ""}
                  onChange={(event) => void camera.startCamera(event.target.value)}
                >
                  {camera.devices.map((device, index) => (
                    <option value={device.deviceId} key={device.deviceId}>
                      {device.label || `Camera ${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {camera.error && <p className="camera-control__error">{camera.error}</p>}
            {camera.status === "ready" ? (
              <button
                className="button button--quiet button--tiny"
                type="button"
                disabled={!isIdle}
                onClick={camera.stopCamera}
              >
                Turn camera off
              </button>
            ) : (
              <button
                className="button button--primary button--tiny"
                type="button"
                disabled={camera.status === "requesting"}
                onClick={() => void camera.startCamera()}
              >
                {camera.status === "requesting" ? "Starting camera…" : "Enable MacBook camera"}
              </button>
            )}
          </div>
        )}

        <button className="device-card" type="button" disabled>
          <span className="device-card__status" />
          <div>
            <strong>Fujifilm X-M5</strong>
            <small>Planned tether test</small>
          </div>
        </button>
      </section>
      <section className="ipad-connection">
        <span className="eyebrow">iPad customer screen</span>
        <h2>Open in Safari</h2>
        {customerUrls.length > 0 ? (
          <>
            <code>{customerUrls[0]}</code>
            <p>Keep the Mac and iPad on the same Wi-Fi, then enter this address on the iPad.</p>
          </>
        ) : (
          <p>Connect this Mac to Wi-Fi to show the local iPad address.</p>
        )}
      </section>
      <section className="session-facts">
        <span className="eyebrow">Current rules</span>
        <dl>
          <div>
            <dt>Mode</dt>
            <dd>{state.operationMode === "attendant" ? "Attendant" : "Self-service"}</dd>
          </div>
          <div>
            <dt>Layout</dt>
            <dd>{selectedLayout?.name ?? "Choose in session"}</dd>
          </div>
          <div>
            <dt>Output</dt>
            <dd>{selectedLayout?.printSize.replace("x", "×") ?? "—"}</dd>
          </div>
          <div>
            <dt>Photos</dt>
            <dd>
              {state.requiredCaptureCount ? `${state.requiredCaptureCount} automatic` : "3 or 4"}
            </dd>
          </div>
          <div>
            <dt>Retakes</dt>
            <dd>{state.retakesRemaining} left</dd>
          </div>
          <div>
            <dt>Payment</dt>
            <dd>Cash</dd>
          </div>
        </dl>
      </section>
      <p className="privacy-note">
        Local prototype data stays in the ignored <code>data/</code> folder and is never committed
        to GitHub.
      </p>
    </aside>
  );
}

function App() {
  const isOperator = surface === "operator";
  const actor = actorForSurface(surface);
  const { state, connected, customerUrls, error, sendCommand } = useBoothConnection(actor);
  const camera = useMacBookCamera({
    active: isOperator && state?.cameraSourceId === "macbook_camera",
    state,
    sendCommand,
  });
  const interactive = useMemo(
    () => isOperator || state?.operationMode === "self_service",
    [isOperator, state?.operationMode],
  );

  useEffect(() => {
    if (state?.phase) window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [state?.phase]);

  const openCustomerDisplay = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("surface", "customer");
    window.open(url.toString(), "WanderBoothCustomer");
  };

  if (!state) {
    return (
      <main className="loading-screen">
        <BrandMark />
        <div className="processing-orbit" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <h1>Starting the booth…</h1>
        <p>{error ?? "Connecting to the local WanderBooth Host."}</p>
      </main>
    );
  }

  return (
    <div className={`app app--${surface}`}>
      <header className="topbar">
        <BrandMark compact />
        <div className="topbar__status">
          <span className="phase-label">{phaseLabels[state.phase]}</span>
          <ConnectionBadge connected={connected} />
          {isOperator && (
            <button
              className="button button--quiet button--tiny"
              type="button"
              onClick={openCustomerDisplay}
            >
              Open customer screen
            </button>
          )}
          {isOperator && !["idle", "complete", "error"].includes(state.phase) && (
            <button
              className="button button--danger button--tiny"
              type="button"
              onClick={() => {
                if (window.confirm("Cancel this session and clear its current selections?")) {
                  sendCommand({ type: "RESET" });
                }
              }}
            >
              Cancel session
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      <div className={isOperator ? "workspace workspace--operator" : "workspace"}>
        <main className="booth-stage">
          {state.phase === "idle" ? (
            isOperator ? (
              <section className="welcome-panel">
                <div className="welcome-panel__copy">
                  <span className="eyebrow">Phase 0 · working prototype</span>
                  <h1>Set the mode, then welcome your next guest.</h1>
                  <p>
                    The same session will stay synchronized between this Mac and the iPad customer
                    screen.
                  </p>
                </div>
                <ModeSelector value={state.operationMode} sendCommand={sendCommand} />
                <button
                  className="button button--primary button--large"
                  type="button"
                  disabled={state.cameraSourceId === "macbook_camera" && camera.status !== "ready"}
                  onClick={() => sendCommand({ type: "BEGIN_SESSION", sessionId: createId() })}
                >
                  Start a new session
                </button>
                {state.cameraSourceId === "macbook_camera" && camera.status !== "ready" && (
                  <p className="start-note">Enable the MacBook camera before starting a session.</p>
                )}
              </section>
            ) : (
              <section className="customer-hero">
                <div className="customer-hero__splat" aria-hidden="true" />
                <img
                  className="customer-hero__brand"
                  src={wanderPressSplashLogo}
                  alt="Wander Press PH"
                />
                <span className="eyebrow">Your photos. One keepsake.</span>
                <h1>Ready to wander?</h1>
                <p>Your attendant will start the next session.</p>
              </section>
            )
          ) : (
            <SessionPanel
              state={state}
              interactive={interactive}
              isOperator={isOperator}
              sendCommand={sendCommand}
            />
          )}
        </main>
        {isOperator && (
          <OperatorSidebar
            state={state}
            camera={camera}
            customerUrls={customerUrls}
            sendCommand={sendCommand}
          />
        )}
      </div>
    </div>
  );
}

export default App;
