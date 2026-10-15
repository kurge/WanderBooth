# Fujifilm X-M5 Direct USB Tether Spike

**Date:** 2026-10-15  
**Status:** Conclusive mixed result; direct USB is not approved as the sole Self-Service adapter

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
| Repeated preview before capture | Pass | One persistent controller session received six consecutive 1024×768 JPEG preview frames |
| Camera-copy retention | Pass | `--keep --keep-raw` retained the new JPEG and RAF on the camera while saving the JPEG locally |
| Preview immediately after capture | Fail | Three preview requests in the same persistent session returned an unspecified driver error |
| Software-only reconnect after capture | Fail | Closing the controller, reclaiming USB, and opening a new session still could not receive a preview without a camera power cycle |
| Second automatic capture after preview failure | Pass | A new controller session fired and downloaded another JPEG plus RAF without power-cycling; both files remained on the camera |
| CLI movie-preview stream | Fail | The movie-preview command returned zero frames |
| Disconnect/ownership | Partial | A controller can claim the camera only after FUJIFILM TETHER APP is closed and macOS `ptpcamerad` releases it |

## Important operating findings

- FUJIFILM TETHER APP demonstrated live view from this exact X-M5 in tether mode. The camera is capable of tethered preview; the remaining problem is providing that preview inside WanderBooth.
- Direct gPhoto2 capture proves that Self-Service does not require an attendant to press the physical shutter.
- The final persistent-session test received repeated preview frames, fired the shutter, downloaded the full-resolution files, and explicitly kept both files on the camera. The camera then stopped serving preview frames. Reopening only the software/USB session did not recover preview.
- The failed preview state did not prevent a second automatic still capture in a new controller session. This supports separating uninterrupted HDMI preview from repeated USB still capture, although the full six-capture and 50-session gates remain.
- Only one desktop application can own the USB tether connection at a time. FUJIFILM TETHER APP must be fully exited before a direct controller can claim the camera.
- macOS launches `ptpcamerad` for a connected PTP camera. The experimental controller must release or avoid that competing process before opening the camera.
- The original one-off command demonstrated gPhoto2's deletion default. The final persistent-session test used `--keep --keep-raw`, and gPhoto2 confirmed that both the JPEG and RAF remained on the camera. Any future controller must retain those flags.
- gPhoto2/libgphoto2 is a macOS/Linux path. It does not provide the planned Windows 11 adapter.
- This post-capture busy behavior is consistent with an [open upstream Fujifilm/libgphoto2 report](https://github.com/gphoto/libgphoto2/issues/1241). WanderBooth must not pretend that a software-only fix is proven.

## Decision

Do not replace the attended watched-folder bridge or mark direct USB as Certified. A USB-only adapter cannot currently provide an uninterrupted customer live view across repeated captures on this exact X-M5/firmware configuration.

The recommended Self-Service architecture is:

1. X-M5 clean HDMI output into a UVC capture device for continuous live view;
2. direct USB tether for countdown-triggered shutter and full-resolution JPEG download;
3. explicit `--keep --keep-raw` retention on the camera;
4. the existing FUJIFILM TETHER APP watched-folder workflow as an attended fallback.

Before certification, the combined HDMI-preview/USB-capture adapter must pass six captures in one session, retakes, cable recovery, application restart, and the full 50-session reliability gate.
