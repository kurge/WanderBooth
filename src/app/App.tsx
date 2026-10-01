import { useEffect, useMemo } from "react";

import { designs, layouts, products } from "../shared/catalog";
import type { Actor, BoothState, Command, OperationMode } from "../shared/session";
import { hostHttpUrl, useBoothConnection } from "./useBoothConnection";

type Surface = "operator" | "customer";

const surface = (new URLSearchParams(window.location.search).get("surface") ??
  "operator") as Surface;

const phaseLabels: Record<BoothState["phase"], string> = {
  idle: "Ready for a new guest",
  selecting: "Choose the experience",
  awaiting_cash: "Waiting for cash confirmation",
  ready: "Ready for the next photo",
  capturing: "Capturing…",
  reviewing: "Review the three photos",
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
        ✦
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
    <section className="photo-grid" aria-label="Session photos">
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

function SelectionPanel({
  state,
  interactive,
  sendCommand,
}: {
  state: BoothState;
  interactive: boolean;
  sendCommand: (command: Command) => void;
}) {
  const product = products[0];
  const layout = layouts[0];
  const canSubmit = Boolean(
    state.productId && state.layoutId && state.designId && state.consentRecorded,
  );

  if (!interactive) {
    return (
      <section className="customer-message">
        <span className="eyebrow">Attendant-operated session</span>
        <h1>We’ll set everything up for you.</h1>
        <p>Your attendant is choosing the layout and design. You’ll see each photo here.</p>
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
        <span className="eyebrow">One simple experience</span>
        <h1>Make your three-photo strip.</h1>
        <p>The layout sets the photo count automatically. No price is shown on this screen.</p>
      </div>

      <div className="selection-row">
        <article
          className={state.productId ? "choice-summary choice-summary--selected" : "choice-summary"}
        >
          <span className="choice-summary__number">01</span>
          <div>
            <small>Product</small>
            <h2>{product.name}</h2>
            <p>{product.description}</p>
          </div>
          <button
            type="button"
            className="button button--small"
            disabled={Boolean(state.productId)}
            onClick={() => sendCommand({ type: "SELECT_PRODUCT", productId: product.id })}
          >
            {state.productId ? "Selected" : "Choose"}
          </button>
        </article>

        <article
          className={state.layoutId ? "choice-summary choice-summary--selected" : "choice-summary"}
        >
          <span className="choice-summary__number">02</span>
          <div>
            <small>Layout</small>
            <h2>{layout.name}</h2>
            <p>{layout.requiredCaptureCount} photos, stacked vertically.</p>
          </div>
          <button
            type="button"
            className="button button--small"
            disabled={!state.productId || Boolean(state.layoutId)}
            onClick={() => sendCommand({ type: "SELECT_LAYOUT", layoutId: layout.id })}
          >
            {state.layoutId ? "Selected" : "Choose"}
          </button>
        </article>
      </div>

      <div className="design-section">
        <div>
          <span className="eyebrow">03 · Pick a look</span>
          <h2>Choose your design</h2>
        </div>
        <div className="design-grid">
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

  if (["ready", "capturing"].includes(state.phase)) {
    const nextPhoto = state.captures.length + 1;
    return (
      <section className="capture-stage">
        <div className="capture-stage__copy">
          <span className="eyebrow">Photo {Math.min(nextPhoto, 3)} of 3</span>
          <h1>{state.phase === "capturing" ? "Hold that pose…" : "Ready when you are."}</h1>
          <p>
            The first prototype uses a clearly marked simulated camera while we wire in the MacBook
            camera.
          </p>
          {interactive && state.phase === "ready" && (
            <button
              className="shutter"
              type="button"
              onClick={() => sendCommand({ type: "CAPTURE" })}
            >
              <span aria-hidden="true" />
              Take photo {nextPhoto}
            </button>
          )}
        </div>
        <CapturePreview state={state} />
      </section>
    );
  }

  if (state.phase === "reviewing") {
    return (
      <section className="review-stage">
        <div className="section-heading section-heading--horizontal">
          <div>
            <span className="eyebrow">Review</span>
            <h1>Keep these three?</h1>
          </div>
          <p>{state.retakesRemaining} retakes remaining</p>
        </div>
        <CapturePreview state={state} />
        {interactive ? (
          <>
            <div className="retake-row">
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
                <span>Design</span>
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
        <h1>Making the branded photos, strip, and slideshow.</h1>
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

function OperatorSidebar({ state }: { state: BoothState }) {
  return (
    <aside className="operator-sidebar">
      <section>
        <span className="eyebrow">Pilot hardware</span>
        <h2>Camera source</h2>
        <div className="device-card device-card--ready">
          <span className="device-card__status" />
          <div>
            <strong>Prototype simulator</strong>
            <small>Ready · active source</small>
          </div>
        </div>
        <div className="device-card">
          <span className="device-card__status" />
          <div>
            <strong>MacBook camera</strong>
            <small>Next integration · experimental</small>
          </div>
        </div>
        <div className="device-card">
          <span className="device-card__status" />
          <div>
            <strong>Fujifilm X-M5</strong>
            <small>Planned tether test</small>
          </div>
        </div>
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
            <dd>Vertical 2×6</dd>
          </div>
          <div>
            <dt>Photos</dt>
            <dd>3 automatic</dd>
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
  const { state, connected, error, sendCommand } = useBoothConnection(actor);
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
                  onClick={() =>
                    sendCommand({ type: "BEGIN_SESSION", sessionId: crypto.randomUUID() })
                  }
                >
                  Start a new session
                </button>
              </section>
            ) : (
              <section className="customer-hero">
                <div className="customer-hero__splat" aria-hidden="true" />
                <span className="eyebrow">Three photos. One keepsake.</span>
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
        {isOperator && <OperatorSidebar state={state} />}
      </div>
    </div>
  );
}

export default App;
