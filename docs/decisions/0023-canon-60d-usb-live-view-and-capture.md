# ADR 0023 — Canon 60D USB live view and automatic capture

Date: 2026-10-23

Status: Accepted for experimental Mac implementation; physical validation pending.

The owner paused Fujifilm hardware work and selected the already-owned Canon 60D. It must offer live view and Host-triggered stills without an attendant pressing the camera shutter.

Use an explicit `canon_eos_usb` source backed by the existing external gPhoto2 dependency on macOS. Detect exactly one EOS 60D and pin its model and USB port for all commands. Keep this implementation separate from the Fujifilm controller because its preview lifecycle and setup differ.

Run a bounded JPEG preview stream through `--capture-movie --stdout`. The Host decodes, mirrors and reduces the preview in memory, then shares it with the operator and customer surfaces. Slow displays skip preview frames rather than accumulate unbounded output. Never persist or upload preview frames.

For each still, gracefully stop the preview process and wait for USB release, disable the Canon viewfinder, select the memory-card capture target, and execute `--keep --keep-raw --capture-image-and-download` in a unique temporary directory. Validate the JPEG and restart live view. A preview-restart error must not discard a successfully captured image, but must block further captures until recovery.

Source selection remains staff-only and idle-only. Setup/test endpoints are limited to loopback and idle Canon selection; customer displays receive preview but cannot configure the camera. Readiness requires a valid live frame within five seconds and a successful test still in the current connection. Host-side checks guard session start, cash confirmation and capture commands, including commands sent outside the UI.

Keep gPhoto2 external rather than bundling it into the unsigned default-copyright app. Windows and other Canon bodies are not claimed as supported. No fallback silently substitutes a webcam image. Readiness is not certification: physical camera, disconnect/recovery and repeated-session tests remain necessary.

Physical finding: macOS's `ptpcamerad` held the camera even without an import window and ignored SIGTERM. On a USB-claim failure only, restart that helper once and retry. Never terminate user-facing applications, loop indefinitely, or repeat a shutter/transfer operation that may already have captured a photo. The first real live-view test passed; still capture remains unverified after a USB I/O failure.
