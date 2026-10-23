# WanderBooth Camera Compatibility Matrix

**Status:** Phase 0 testing

**Version:** 0.17.0

**Updated:** 2026-10-23

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
| Fujifilm X-M5 through gPhoto2/libgphoto2 | Dedicated direct USB tether | Unavailable | Physical spike reached a known preview blocker | Six repeated 1024×768 frames passed before capture; post-capture resume and software-only reconnect failed | Two automatic still captures passed without a camera power cycle; JPEG and RAF camera copies retained | None | Experimental | Suitable as the future automatic-capture half of a combined adapter, but not as the sole live-view source |
| Fujifilm X-M5 Hybrid | UVC preview plus dedicated USB tether | Planned | Software implemented; hardware incomplete | Standard video preview path passed; exact clean HDMI/UVC test pending | New Host controller physically passed one 11.5 MB automatic JPEG; USB layer passed repeated stills | None | Experimental | App adapter is available in staff mode; requires an HDMI capture device and reliability certification |
| Canon EOS 60D | Dedicated gPhoto2 USB adapter | Planned | Software implemented; physical still test blocked | Real USB live view passed once | Synthetic capture passed; physical still/preview recovery did not pass | None yet | Experimental | macOS import-helper restart enabled preview; camera power-cycle/settings check required before repeating still test |
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

- [2026-10-23 Canon 60D implementation and first physical test](test-records/2026-10-23-canon-60d-usb.md)
- [2026-10-02 starting MacBook camera smoke test](test-records/2026-10-02-macbook-camera.md)
- [2026-10-15 Fujifilm X-M5 direct USB tether spike](test-records/2026-10-15-fujifilm-xm5-direct-tether.md)
- [2026-10-15 Fujifilm X-M5 Hybrid adapter implementation](test-records/2026-10-15-fujifilm-xm5-hybrid-adapter.md)

## Experimental setup guides

- [Canon EOS 60D USB live view and automatic capture](CANON_EOS_USB.md)
- [Fujifilm X-M5 USB tether pilot](FUJIFILM_XM5_TETHER.md)
