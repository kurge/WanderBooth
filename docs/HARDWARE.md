# WanderBooth Hardware Baseline

**Status:** Discovery

**Version:** 0.2.0

**Updated:** 2026-10-02

This document records the hardware already available for WanderBooth and the tests required before certifying the supported first-pilot configuration. The application targets Windows 11 and macOS Sequoia 15.7.5 or later, but one exact computer/OS combination will be certified first.

## Owned hardware

| Role | Device | Current decision |
|---|---|---|
| Host computer | Exact computer, CPU, memory, and storage not yet supplied | Must choose Windows 11 or macOS Sequoia 15.7.5+ for the first pilot |
| Customer touchscreen | iPad Pro 12.9-inch (6th generation), iPadOS 18.2 | Confirmed local web client |
| Camera fallback | Canon EOS 60D | Keep as fallback; do not compare both unless the X-M5 prototype fails |
| Recommended first camera | Fujifilm X-M5 | Awaiting owner confirmation; run a focused Phase 0 control test |
| Printer | Epson EcoTank L8050 | First-pilot printer |
| Host/iPad network | Venue Wi-Fi, mobile hotspot, or phone hotspot | Exact first-pilot setup not selected; dedicated travel router is optional |
| Guest delivery | Customer's mobile data or any internet connection | Cloud QR link; guest does not join WanderBooth Wi-Fi |

## Camera findings

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

Fujifilm lists the X-M5 as compatible with FUJIFILM TETHER APP on Windows and macOS, including macOS 15 Sequoia, and documents a `USB TETHER SHOOTING FIXED` connection mode. This makes it the recommended first candidate. Manufacturer-app compatibility does not automatically guarantee that WanderBooth can trigger the shutter through a public API, so direct control still requires a prototype.

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

### Fujifilm X-M5 first-camera test

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
- Time-box direct control research; if it fails, document the watched-folder fallback and decide whether to test the Canon EOS 60D.

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

Use the Fujifilm X-M5 first if the owner confirms it. Keep it only if measured reliability, control, and transfer performance meet the pilot requirements—not image quality alone. If it cannot be controlled directly within the Phase 0 time box, test a documented watched-folder bridge or the Canon EOS 60D before considering other hardware.
