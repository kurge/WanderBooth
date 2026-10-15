# Fujifilm X-M5 Hybrid Adapter Implementation Test

**Date:** 2026-10-15
**Status:** Software pass; HDMI hardware and reliability certification pending

## Implemented behavior

- Added a staff-only `Fujifilm X-M5 · hybrid` source.
- Reused the standard video-device selector and mirrored local preview relay for posing.
- Disabled video-frame capture in Hybrid so a preview frame can never be mistaken for the final X-M5 still.
- Added Host-side automatic X-M5 capture through external gPhoto2.
- Added a required idle-time automatic test capture before a Hybrid session can start.
- Kept JPEG and RAF on the camera with `--keep --keep-raw`.
- Imported the downloaded JPEG into the exact pending event/session slot and removed the temporary Host capture folder, including its temporary RAF copy.
- Preserved the separate attended FUJIFILM TETHER APP watched-folder source.

## Verification

| Check | Result |
|---|---|
| Automated tests | Pass: full 62-test suite |
| Host TypeScript build | Pass |
| Web TypeScript/Vite build | Pass |
| Physical capture through the new controller class | Pass: 11.5 MB JPEG received automatically |
| Camera-copy retention | Pass: keep flags are mandatory and covered by test |
| Operator source selection/readiness UI | Pass: visually checked in a disposable event at desktop width |
| Mac installer | Pass: unsigned Apple-silicon `WanderBooth-0.16.0-arm64.dmg`, 133 MiB, valid disk-image checksum |
| HDMI/UVC preview from the X-M5 | Pending: capture device not yet available |
| Six-photo sequence and retake | Pending until HDMI/UVC hardware is connected |
| Fifty-session reliability | Pending |

No physical test image, device identifier, camera serial, runtime database, or customer file was committed.

DMG SHA-256: `87ee2cccb099ae365d2686d284cfad1e548834734c20bcf447173b85e4c236fb`
