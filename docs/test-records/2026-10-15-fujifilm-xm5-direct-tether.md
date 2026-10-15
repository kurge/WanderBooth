# Fujifilm X-M5 Direct USB Tether Spike

**Date:** 2026-10-15  
**Status:** Partial pass; not certified

## Tested configuration

- Camera: Fujifilm X-M5
- Camera firmware: 1.20
- Connection: direct USB-C tether
- Camera mode: still-photo mode with `USB TETHER SHOOTING AUTO`
- Host: pilot Apple-silicon Mac
- Host operating system: macOS 15.7.5
- Controller: gPhoto2 2.5.32 with libgphoto2 2.5.34

Customer media from this test was written only to a temporary local directory and was not added to the repository.

## Results

| Test | Result | Evidence |
|---|---|---|
| USB detection | Pass | Detected as `Fuji Fujifilm X-M5` on the USB tether interface |
| Single tethered preview frame | Pass | Received a real 1024×768 JPEG preview from the camera |
| Programmatic shutter | Pass | The camera fired without an attendant touching the shutter |
| Full-resolution JPEG download | Pass | Received an 11 MB, 6240×4160 JPEG |
| RAW download | Pass | Received a 33 MB Fujifilm RAF from the same capture |
| Preview immediately after capture | Fail | A new preview request returned an unspecified driver error until the camera connection could be reset |
| Sustained preview stream | Not yet passed | The CLI movie-preview command returned zero frames; a persistent libgphoto2 session still needs testing |
| Disconnect/recovery | Not yet passed | macOS `ptpcamerad` and FUJIFILM TETHER APP compete for exclusive ownership of the USB camera |

## Important operating findings

- FUJIFILM TETHER APP demonstrated live view from this exact X-M5 in tether mode. The camera is capable of tethered preview; the remaining problem is providing that preview inside WanderBooth.
- Direct gPhoto2 capture proves that Self-Service does not require an attendant to press the physical shutter.
- Only one desktop application can own the USB tether connection at a time. FUJIFILM TETHER APP must be fully exited before a direct controller can claim the camera.
- macOS launches `ptpcamerad` for a connected PTP camera. The experimental controller must release or avoid that competing process before opening the camera.
- The one-off test command downloaded and then removed its newly created JPEG from camera storage. The downloaded JPEG remains on the Mac, and the RAF remains on the camera. A production controller must explicitly keep captures on the camera and must never rely on the command's deletion default.
- gPhoto2/libgphoto2 is a macOS/Linux path. It does not provide the planned Windows 11 adapter.

## Decision gate

Do not replace the attended watched-folder bridge or mark the X-M5 Certified yet. First prove one persistent connection that can:

1. deliver a usable continuous preview;
2. autofocus and trigger the camera after WanderBooth's countdown;
3. download the full-resolution JPEG while retaining the camera copy;
4. resume preview without a power cycle;
5. repeat the sequence for at least six captures and recover from disconnects.

If direct USB preview remains unstable, use the X-M5's HDMI output through a UVC capture device for preview while retaining USB tether for automatic full-resolution capture.
