# ADR 0006: Selectable Camera-Source Adapters

- Status: Accepted
- Date: 2026-10-02

## Decision

WanderBooth will use a shared camera-source contract rather than embedding one brand or model into the session workflow. The owner or attendant can select a supported source before a session. Initial source families are:

1. dedicated DSLR/mirrorless cameras through brand/model adapters, manufacturer tether software, or a documented watched-folder bridge;
2. standard USB/UVC webcams and built-in Windows/Mac cameras; and
3. the iPad camera through WanderBooth Touch.

The Host remains the source of truth for the session. Every capture must reach local Host storage before processing, printing, or delivery continues.

Sources are labeled **Planned**, **Certified**, **Experimental**, or **Unavailable**. A device is certified for specific products only after it passes preview, still-capture, resolution, quality, disconnect, recovery, and repeat-session tests.

## Why

- The business currently owns a Canon EOS 60D and Fujifilm X-M5 but wants to use other brands, models, webcams, built-in cameras, and the iPad camera.
- A shared contract prevents camera-specific code from spreading into payments, session state, layout rendering, printing, or delivery.
- Generic cameras provide a useful fallback and make early interface development possible before a vendor-specific integration is complete.
- Explicit compatibility labels are more honest and operationally safer than claiming universal camera support.

## Required behavior

- Camera selection is restricted to the owner or attendant and is never presented in the customer-facing flow.
- The selected source is checked before cash is accepted.
- The source is locked for the paid session.
- WanderBooth never silently switches cameras after payment.
- Every adapter reports capabilities such as preview, remote trigger, resolution, focus, flash, and orientation.
- Source-specific settings are stored in a camera profile.
- Adding an adapter must not require changes to the normal customer journey or fulfillment workflow.

## Trade-offs

- Camera detection alone cannot guarantee full-resolution capture, remote trigger, autofocus, flash, or acceptable print quality.
- Vendor SDK licensing and operating-system support may limit some dedicated cameras.
- The iPad and standard webcams may be suitable for digital products but fail print-quality certification.
- Each new camera/OS combination adds testing and support work even when it uses an existing adapter family.
