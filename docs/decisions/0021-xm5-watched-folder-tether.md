# ADR 0021: X-M5 Watched-Folder Tether Bridge

- Status: Accepted for experimental attended testing
- Date: 2026-10-15

## Decision

The first Fujifilm X-M5 adapter uses FUJIFILM TETHER APP for the manufacturer-supported USB connection and automatic full-resolution JPEG transfer. WanderBooth watches one operator-selected local download folder, takes a baseline immediately before each expected capture, accepts only a new stable decodable JPEG, and copies it into the authoritative event/session directory.

WanderBooth owns the countdown and session state. In this first version, the attendant presses the camera shutter after each countdown. X-M5 live view and automatic shutter control are explicitly unavailable, so the adapter remains Experimental and is not approved for unattended Self-Service.

## Why

- Fujifilm officially supports the X-M5 in FUJIFILM TETHER APP and documents automatic computer download.
- No supported public control interface has yet been proven for direct WanderBooth shutter control.
- The watched-folder boundary delivers original JPEG quality now without binding the rest of the application to undocumented automation.
- Baseline, file-stability, decoding, timeout, and session-identity checks reduce the risk of assigning the wrong photo to a customer.

## Constraints

- Setup and folder paths remain local to the Host and are never sent to the customer display or cloud QR service.
- The operator must use a dedicated folder and configure the identical destination in FUJIFILM TETHER APP and WanderBooth.
- Only JPEG/JPG files are accepted. RAW may be saved separately but is not a WanderBooth capture input.
- An old file is never selected merely because it is the newest file in the folder.
- A timed-out or unreadable transfer fails visibly; it never falls back to the simulator, webcam, or a prior image.
- Changing the folder or camera source is idle-only and staff-only.

## Follow-up

Research a supported automatic shutter-control adapter. If none is practical, evaluate a documented hardware shutter-release bridge while retaining the watched-folder transfer path. Separately evaluate preview through supported camera APIs or HDMI/UVC capture.
