# WanderBooth Hardware Baseline

**Status:** Discovery

**Version:** 0.1.0

**Updated:** 2026-10-02

This document records the hardware already available for WanderBooth and the tests required before selecting the supported first-pilot configuration.

## Owned hardware

| Role | Device | Current decision |
|---|---|---|
| Host computer | Exact Windows PC or laptop not yet supplied | Blocking decision |
| Customer touchscreen | iPad; exact model and iPadOS version not yet supplied | Use as local web client |
| Camera candidate | Canon EOS 60D | Include in Phase 0 comparison |
| Camera candidate | Fujifilm X-M5 | Leading modern candidate; include in Phase 0 comparison |
| Printer | Epson EcoTank L8050 | First-pilot printer |
| Local network | Router not yet selected | Dedicated travel router recommended |

## Camera findings

### Canon EOS 60D

Canon's EOS 60D support page includes an EOS Utility 2.9 instruction manual specifically for the camera. EOS Utility supports computer-controlled remote shooting and transfer to the computer. This proves a manufacturer-supported tethered workflow existed, but it does not yet prove that our modern Windows application can control the camera directly and reliably.

Official references:

- [Canon EOS 60D support](https://www.usa.canon.com/support/p/eos-60d)
- [Canon remote shooting with EOS Utility](https://support.usa.canon.com/kb/s/article/ART102980)

Primary risks:

- The camera and its original software generation are old.
- Current Windows and driver behavior must be tested.
- Direct integration may require a Canon SDK path or a watched-folder fallback.
- Live-view responsiveness and image-transfer time may be slower than a newer camera.

### Fujifilm X-M5

Fujifilm lists the X-M5 as compatible with FUJIFILM TETHER APP on Windows and documents a `USB TETHER SHOOTING FIXED` connection mode. This makes it a promising first candidate. Manufacturer-app compatibility does not automatically guarantee that WanderBooth can trigger the shutter through a public API, so direct control still requires a prototype.

Official references:

- [Fujifilm X-M5 compatibility](https://www.fujifilm-x.com/en-au/support/compatibility/cameras/x-m5/)
- [FUJIFILM TETHER APP](https://www.fujifilm-x.com/en-us/support/download/software/tether-app/)
- [X-M5 firmware and USB tether setting](https://www.fujifilm-x.com/global/support/download/firmware/cameras/x-m5/)

Primary risks:

- Full programmatic shutter control may not be available through a public SDK.
- A manufacturer-app or watched-folder bridge may be required.
- The exact live-view and trigger behavior must be tested without relying on internet access.

## Printer findings

The Epson L8050 has an official Windows printer driver and supports photo printing from a Windows computer. WanderBooth can initially submit rendered files through the Windows print system.

Official references:

- [Epson L8050 user guide](https://download4.epson.biz/sec_pubs/l8050_series/useg/en/index.htm)
- [Printing from a Windows computer](https://download4.epson.biz/sec_pubs/l8050_series/useg/en/GUID-B90C7DA4-E07E-4F7D-A645-F8FB6AE7E9C5.htm)

The L8050 is an ink-tank photo printer rather than a dye-sublimation event printer. The first pilot must measure real print speed, borderless margins, color consistency, ink use, paper-feed reliability, drying/smudging, and recovery after a jam or offline state.

## Phase 0 hardware test matrix

### Camera test for each candidate

- Connect and detect on the selected Windows Host.
- Display usable live view on the iPad.
- Trigger capture from an iPad tap.
- Transfer a full-resolution JPEG to the Host.
- Measure time from tap to file-ready.
- Capture 50 consecutive sessions.
- Disconnect and reconnect the USB cable.
- Restart the camera and Host.
- Verify focus and flash behavior.
- Document every manual camera setting required.

### Epson L8050 test

- Install the official Windows driver.
- Print the proposed sizes and layouts.
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
- Download a branded photo to current iPhone and Android devices through the local QR flow.

## Selection rule

Choose the first camera based on measured reliability and control—not image quality alone. If neither owned camera can be controlled directly within the Phase 0 time box, use a documented watched-folder bridge for the pilot or temporarily validate the application with a supported USB webcam while camera integration continues.
