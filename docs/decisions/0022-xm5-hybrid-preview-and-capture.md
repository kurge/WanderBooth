# ADR 0022: X-M5 Hybrid Preview and Capture

- Status: Accepted for experimental implementation
- Date: 2026-10-15

## Decision

WanderBooth separates Fujifilm X-M5 live preview from final still capture:

- a standard video device supplies the mirrored customer/operator preview;
- the production X-M5 preview device will be the camera's clean HDMI output through a UVC capture device;
- direct USB tether control through an external gPhoto2 installation fires the shutter and downloads the full-resolution JPEG;
- every USB capture uses keep flags so the JPEG and RAF remain on the camera;
- the FUJIFILM TETHER APP watched-folder source remains available as an attended fallback.

The combined source is named **Fujifilm X-M5 · hybrid** and remains staff-only, idle-selectable, and Experimental.

## Why

A physical test on the owned X-M5 proved repeated USB preview before capture, automatic shutter, full-resolution JPEG/RAF download, and repeated still capture without touching or power-cycling the camera. It also proved that USB preview stops after the first capture and cannot be recovered through a software-only reconnect on the tested firmware. HDMI isolates continuous posing preview from that USB-preview failure while retaining the quality and automation of direct still capture.

## Safety and boundaries

- The Host explicitly passes `--keep` and `--keep-raw`; it never deletes the new camera files.
- The Host imports only the JPEG into the session and removes its temporary local download directory afterward. RAW remains on the camera and is not uploaded to QR delivery.
- The app does not bundle or relicense gPhoto2 in this milestone. The pilot Mac uses its external Homebrew installation.
- The app stops macOS `ptpcamerad` only while opening the direct camera capture. FUJIFILM TETHER APP must be fully closed before Hybrid use.
- If USB capture fails, the session stops visibly. It never substitutes the video-preview frame, simulator output, or an older photo.
- The standard attended watched-folder path remains separate and unchanged.

## Certification gate

Do not approve Hybrid for paying Self-Service sessions until the exact HDMI/UVC hardware passes live-view latency/orientation checks, a six-photo product, retakes, cable disconnect/reconnect, Host restart, print-quality review, and 50 consecutive sessions.
