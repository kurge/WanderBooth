# WanderBooth Camera Compatibility Matrix

**Status:** Phase 0 testing

**Version:** 0.6.0

**Updated:** 2026-10-15

This matrix is the source of truth for which camera sources WanderBooth can safely offer. A source is not approved for paying customers merely because the operating system or application can detect it.

## Compatibility labels

| Label | Meaning |
|---|---|
| Certified | Passed the required tests on an exact operating-system and hardware configuration and is approved for the listed products |
| Experimental | Partly functional or still being tested; available only in staff/test mode |
| Unavailable | Missing, disconnected, denied permission, or missing a capability required by the selected product |
| Planned | Adapter or test work has not started |

## Current matrix

| Camera source | Adapter family | Windows 11 | macOS 15.7.5+ | Preview | Full still capture | Product approval | Current label | Notes |
|---|---|---|---|---|---|---|---|---|
| Fujifilm X-M5 through FUJIFILM TETHER APP | Dedicated watched-folder tether | Planned | Physically passed one full-resolution transfer | Tether App live view confirmed, not embedded | Passed one 6240×4160 JPEG transfer | Attended testing only | Experimental | Existing app bridge still waits for an attendant-fired photo; use as fallback while the direct controller is developed |
| Fujifilm X-M5 through gPhoto2/libgphoto2 | Dedicated direct USB tether | Unavailable | Physical spike partially passed | One 1024×768 frame passed; sustained/resume failed | Automatic shutter plus 6240×4160 JPEG and RAF passed once | None yet | Experimental | Proves automatic capture without touching the camera; requires a persistent connection, camera-copy retention, recovery, packaging, and repeat-session tests |
| Canon EOS 60D | Dedicated camera | Planned | Planned | Not tested | Not tested | None yet | Planned | Owned secondary target; watched-folder bridge may be required |
| Starting MacBook Pro built-in camera | Standard video device | Not applicable | Passed once on macOS 15.7.5 | Passed once through the local customer relay | Passed once at 1920×1080 | None yet | Experimental | Packaged app completed one automatic three-photo session from a single tap, synchronized countdowns, and all deliverables; physical-iPad, reliability, recovery, crop, and print-quality certification remain |
| USB/UVC webcam | Standard video device | Planned | Planned | Not tested | Not tested | None yet | Planned | Exact webcam model is not selected |
| iPad Pro front camera | iPad camera | Not applicable | Not applicable | Not tested | Not tested | None yet | Planned | Captures in WanderBooth Touch and transfers to Host |
| iPad Pro rear camera | iPad camera | Not applicable | Not applicable | Not tested | Not tested | None yet | Planned | Evaluate as the preferred iPad source for quality |
| Prototype simulator | Development-only adapter | Same code path | Passed | Not applicable | Passed | Synthetic sessions only | Experimental | Proves layout-defined one-to-eight-shot capture sequences, persistence, composite rendering, and slideshow generation without customer media |

## Certification record template

Create one test record for every exact source configuration:

```text
Camera/source:
Adapter and version:
Host computer:
Host operating system:
Connection type:
Driver, firmware, or browser version:
Test date:
Tester:

Preview: pass/fail
Three-photo capture: pass/fail
Actual resolution:
Median capture latency:
50-session reliability: pass/fail
Disconnect and recovery: pass/fail
Orientation and mirroring: pass/fail
2×6 print quality: pass/fail/not approved
4×6 print quality: pass/fail/not approved
Digital delivery quality: pass/fail

Approved products:
Compatibility label:
Known limitations:
Required setup:
```

## Rules

- Certification applies only to the tested combination of camera, adapter, operating system, connection, and required settings.
- A source can be certified for digital delivery but not for physical prints.
- WanderBooth must show the actual selected source and readiness before cash confirmation.
- Only the owner or attendant can choose or change the active camera source.
- The customer interface never displays camera-source selection controls.
- A paid session never falls back silently to another source.
- New brands and models enter as Planned or Experimental and become Certified only after the recorded test passes.

## Completed records

- [2026-10-02 starting MacBook camera smoke test](test-records/2026-10-02-macbook-camera.md)
- [2026-10-15 Fujifilm X-M5 direct USB tether spike](test-records/2026-10-15-fujifilm-xm5-direct-tether.md)

## Experimental setup guides

- [Fujifilm X-M5 USB tether pilot](FUJIFILM_XM5_TETHER.md)
