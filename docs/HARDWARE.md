# WanderBooth Hardware Baseline

**Status:** Phase 0 testing

**Version:** 0.4.0

**Updated:** 2026-10-02

This document records the hardware already available for WanderBooth, the supported camera-source categories, and the tests required before certifying a first-pilot configuration. The application targets Windows 11 and macOS Sequoia 15.7.5 or later, but exact combinations of computer, operating system, camera source, and printer will be certified incrementally.

## Owned hardware

| Role | Device | Current decision |
|---|---|---|
| Starting Host computer | MacBook Pro (model identifier Mac15,6), Apple M3 Pro with 11-core CPU, 18 GB memory, macOS Sequoia 15.7.5 | Confirmed Phase 0 development and first-pilot candidate; not yet field-certified |
| First Self-Service touchscreen/camera | iPad Pro 12.9-inch (6th generation), iPadOS 18.2 | Confirmed interactive client, optional display-only client, and optional camera source |
| Attendant-Operated customer display | Second monitor connected to the Host or iPad in display-only mode | Support both options in the first pilot |
| Future Self-Service touchscreen | Dedicated touchscreen model not yet selected | Must run the same responsive customer client; evaluate when purchased |
| Dedicated camera | Canon EOS 60D | Owned secondary integration target |
| Recommended first dedicated camera | Fujifilm X-M5 | Run the first brand/model-specific Phase 0 control test |
| Host built-in camera | Built-in camera on the starting MacBook Pro | Next camera adapter; treat through the standard browser/webcam interface |
| External webcam | Any standard USB/UVC device supplied later | Detect generically, then certify individual models as needed |
| Printer | Epson EcoTank L8050 | First-pilot printer |
| Host/iPad network | Venue Wi-Fi, mobile hotspot, or phone hotspot | Exact first-pilot setup not selected; dedicated travel router is optional |
| Guest delivery | Customer's mobile data or any internet connection | Cloud QR link; guest does not join WanderBooth Wi-Fi |

At the start of Phase 0 the Mac had approximately 25 GiB of free storage. That is adequate for development but too little to assume safe event operation without storage monitoring and 30-day cleanup. Before the first live pilot, measure real session size and reserve enough space for the expected event plus a recovery margin. Machine serial numbers, UUIDs, and personal device identifiers are intentionally excluded from this public repository.

## Camera findings

### Compatibility approach

WanderBooth separates the booth workflow from the physical camera. The operator chooses a source in the staff area, and a replaceable adapter supplies preview, capture, capability, and health information.

Planned adapter families:

- **Dedicated cameras:** vendor SDK/tether integrations or a documented watched-folder bridge.
- **Standard video devices:** USB/UVC webcams and built-in Windows/Mac cameras.
- **iPad camera:** capture in WanderBooth Touch, followed by transfer to the Host before processing.

Every tested source receives one compatibility label:

- **Certified:** passed preview, full capture, quality, disconnect, recovery, and repeat-session tests for specific products.
- **Experimental:** detected or partly usable, but not approved for unattended paid sessions.
- **Unavailable:** missing permissions, disconnected, or lacking a required capability.

“Supports other cameras” means WanderBooth can add and select adapters without rewriting the customer, session, printing, or delivery workflow. It does not mean every camera will provide remote trigger, full-resolution stills, live view, autofocus, or flash control automatically.

The current source-by-source status is maintained in [CAMERA_COMPATIBILITY.md](CAMERA_COMPATIBILITY.md).

### Canon EOS 60D

Canon's EOS 60D support page includes an EOS Utility 2.9 instruction manual specifically for the camera. EOS Utility supports computer-controlled remote shooting and transfer to the computer. This proves a manufacturer-supported tethered workflow existed, but it does not yet prove that our modern desktop application can control the camera directly and reliably.

Official references:

- [Canon EOS 60D support](https://www.usa.canon.com/support/p/eos-60d)
- [Canon remote shooting with EOS Utility](https://support.usa.canon.com/kb/s/article/ART102980)

Primary risks:

- The camera and its original software generation are old.
- Current Windows/macOS and driver behavior may be less predictable than with a newer camera.
- Direct integration may require a Canon SDK path or a watched-folder fallback.
- Live-view responsiveness and image-transfer time may be slower than a newer camera.

### Fujifilm X-M5

Fujifilm lists the X-M5 as compatible with FUJIFILM TETHER APP on Windows and macOS, including macOS 15 Sequoia, and documents a `USB TETHER SHOOTING FIXED` connection mode. This makes it the recommended first dedicated-camera candidate. Manufacturer-app compatibility does not automatically guarantee that WanderBooth can trigger the shutter through a public API, so direct control still requires a prototype.

Official references:

- [Fujifilm X-M5 compatibility](https://www.fujifilm-x.com/en-au/support/compatibility/cameras/x-m5/)
- [FUJIFILM TETHER APP](https://www.fujifilm-x.com/en-us/support/download/software/tether-app/)
- [X-M5 firmware and USB tether setting](https://www.fujifilm-x.com/global/support/download/firmware/cameras/x-m5/)

Primary risks:

- Full programmatic shutter control may not be available through a public SDK.
- A manufacturer-app or watched-folder bridge may be required.
- The exact live-view and trigger behavior must be tested without relying on internet access.

## Printer findings

The Epson L8050 documentation includes Windows and Mac printer-driver workflows, Bonjour/IPP network printing, and current macOS driver downloads. WanderBooth can submit already-rendered print files through the selected operating system's print service, but completion-status reporting and borderless output must be proven separately on each OS.

Official references:

- [Epson L8050 user guide](https://download4.epson.biz/sec_pubs/l8050_series/useg/en/index.htm)
- [Epson L8050 software information for Windows and Mac drivers](https://download4.epson.biz/sec_pubs/l8050_series/useg/en/GUID-B42D4C73-659E-4090-B31C-A0A4999C983D.htm)
- [Epson L8050 network printing support](https://download4.epson.biz/sec_pubs/l8050_series/useg/en/GUID-7AD64A2C-818D-4D56-974C-B2EE144B528B.htm)
- [Epson L8050 macOS support downloads](https://www.epson.com.hk/Support/Printers/Inkjet-Printer/EcoTank-Series/L8050/s/SPT_C11CK37506)

The L8050 is an ink-tank photo printer rather than a dye-sublimation event printer. The first pilot must measure real print speed, borderless margins, color consistency, ink use, paper-feed reliability, drying/smudging, and recovery after a jam or offline state.

## Phase 0 hardware test matrix

### Shared test for every camera source

- Display a friendly device name, adapter type, compatibility label, and readiness state.
- Show a usable preview with the correct orientation and aspect ratio.
- Trigger three captures from the customer interface.
- Transfer the best available still image to the Host and save it before processing.
- Report actual resolution, capture latency, and supported capabilities.
- Complete 50 consecutive sessions without a lost or mismatched capture.
- Disconnect or revoke permission, then show a clear recovery action.
- Reconnect without silently choosing a different camera.
- Block cash confirmation when the selected source is not ready.
- Confirm print quality or mark the source digital-only when its output is not suitable for 4×6 or 2×6 printing.

### Fujifilm X-M5 dedicated-camera test

- Connect and detect on the selected pilot Host OS.
- Display usable live view on the iPad.
- Trigger capture from an iPad tap.
- Transfer a full-resolution JPEG to the Host.
- Measure time from tap to file-ready.
- Capture 50 consecutive sessions.
- Disconnect and reconnect the USB cable.
- Restart the camera and Host.
- Verify focus and flash behavior.
- Document every manual camera setting required.
- Verify macOS removable-volume permissions if macOS is selected.
- Time-box direct control research; if it fails, document the watched-folder fallback and bring the Canon EOS 60D test forward.

### Webcam and built-in-camera test

- Detect the selected Host's built-in camera and at least one standard USB/UVC webcam when available.
- Request camera permission with a clear explanation and recovery instructions.
- List multiple video devices without exposing customer-facing technical identifiers.
- Preserve the selected device across restarts when the operating system permits it.
- Verify preview, countdown, three-photo capture, mirroring rules, crop, and orientation.
- Compare delivered image resolution and print quality with the dedicated-camera baseline.

### iPad-camera test

- Let staff choose front or rear iPad camera when the platform exposes that choice.
- Keep the preview and countdown inside WanderBooth Touch.
- Transfer each capture to the Host before allowing the session to advance.
- Recover from denied permission, Safari reload, iPad lock, and local-network interruption.
- Verify portrait/landscape orientation, crop, mirroring, and actual captured resolution.
- Confirm whether the result is certified for digital delivery, physical printing, or both.

### Epson L8050 test

- Install the official driver for the selected pilot OS.
- Print 4×6 and 2×6 strip layouts.
- Test normal and borderless output.
- Measure 20 consecutive print times.
- Compare screen color to print color.
- Test print queue recovery after printer offline, out-of-paper, and cancelled-job states.
- Confirm whether the application can identify completed versus merely submitted jobs.
- Record paper, quality, color, and margin settings.

### iPad and network test

- Load WanderBooth Touch from the Host with internet disconnected.
- Run the customer presentation in both interactive Self-Service and read-only Attendant-Operated modes.
- Run the Attendant-Operated presentation on both the iPad and a directly connected second monitor.
- Verify the interface scales cleanly so it is not hard-coded to the iPad's exact dimensions.
- Run the iPad in Guided Access.
- Reconnect automatically after Wi-Fi interruption.
- Confirm touch-to-capture response time.
- Confirm the customer UI reflects Host camera and printer errors.
- Keep capture and printing usable while internet is disconnected.
- Upload a completed session after connectivity returns without operator intervention.
- Download three individual branded photos, the composite strip, and the looping MP4 from the cloud QR page on current iPhone and Android devices.
- Test the QR page over mobile data rather than requiring the phone to join booth Wi-Fi.
- Test both the expected venue connection and a practical hotspot fallback.

## Selection rule

The camera selector may display many detected sources, but a source is offered for paid sessions only after its exact configuration passes the shared tests. Certify the Fujifilm X-M5, one webcam/built-in camera, and the iPad camera first. Test the Canon EOS 60D as the next dedicated-camera target or earlier if the X-M5 integration is blocked. Add other brands and models incrementally through the same adapter and certification process.
