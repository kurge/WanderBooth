# Canon EOS 60D USB setup

Updated: 2026-10-23 · WanderBooth 0.17.0 · Experimental, macOS only

The Canon option is designed to provide live view and automatic full-resolution photos over one USB data connection. An HDMI capture card is not part of this setup. The owner has reported the 60D working since the initial test record. The 0.18.0 template-aware framing still needs an on-camera check; software tests cannot establish hardware reliability.

The live-preview relay preserves the full mirrored camera image. During a session, the screen frames each capture according to its saved holders: landscape, portrait or custom. Repeated captures with different holder shapes show full-source preview and crop guides. The idle test-photo display remains landscape 4:3, independent of templates. Session photos retain an untouched local original; test photos remain temporary and retain the camera copy. See [photo framing and backups](PHOTO_FRAMING.md).

First physical test: USB detection and live view passed. Still capture and preview recovery did not pass; the camera reported USB I/O busy afterward. See the [test record](test-records/2026-10-23-canon-60d-usb.md). Power-cycle and reconnect the camera before repeating that test.

## Connect and test

1. Connect the 60D's **A/V OUT / DIGITAL** socket to the Mac with a compatible USB data cable (the 60D uses Mini-USB, not the Fujifilm USB-C cable). Use a USB adapter for the Mac if needed.
2. Turn the camera on, insert a writable SD card, select a still-photo mode, set JPEG or RAW+JPEG, and turn **Auto power off** off for the test. Set exposure and focus on the camera. If autofocus cannot lock, pre-focus and try the lens's MF setting.
3. Close EOS Utility, EOS Webcam Utility, Photos and Image Capture so they do not compete for USB access.
4. Open an event in WanderBooth. Under **Camera source**, select **Canon EOS 60D · USB**.
5. Choose **Connect Canon live view**. This detects the exact 60D, starts the preview and mirrors it for posing. It does not take a still photo.
6. Choose **Take Canon test photo**. Check the full test image, its dimensions and focus, and confirm that live view comes back. The test stays out of customer history; its temporary in-app preview disappears after reconnecting or closing the app. The camera copy remains on the SD card.
7. Once the source says **Ready**, start a normal session. Each countdown triggers the shutter automatically, downloads the JPEG, saves it in the event/session folder, and resumes preview for the next photo. Retakes use this same path.

During the shutter/download step the preview briefly pauses. The saved photograph is not mirrored. Actual live-view resolution, speed, still resolution, autofocus behavior and pause duration depend on the camera and must be measured with the connected 60D.

## If something fails

- **Not detected:** check camera power, the data cable and USB adapter. Only one 60D may be connected; other models are not silently selected.
- **USB busy:** close the competing camera apps and finish any photo import before connecting. If macOS's background photo-import helper holds USB, WanderBooth restarts that helper once and retries the claim. It does not close user-facing camera apps or retry a shutter/transfer failure that may already have taken a photo. If USB remains busy, reconnect the cable and use **Reconnect Canon**.
- **No usable JPEG:** change the camera from RAW-only to JPEG or RAW+JPEG and repeat the test. WanderBooth does not convert RAW files.
- **Preview stops:** readiness is withdrawn. Reconnect and repeat the test while the booth is idle. An active capture error uses the existing session-error screen; reset the session before reconnecting. Previously written captures remain on disk, but partial-session resume is not implemented.
- **Test photo succeeds but preview does not resume:** the good test photo remains available, but the camera is not ready for another guest. Reconnect and test again.
- **Missing gPhoto2:** the current development Mac uses an external Homebrew gPhoto2 installation. It is not included in the DMG. Known locations are `/opt/homebrew/bin/gphoto2` and `/usr/local/bin/gphoto2`; developers may explicitly set `WANDERBOOTH_GPHOTO2_PATH`.

The app retains JPEG and RAW camera copies and uses the SD card as the capture target. Temporary downloads are removed after importing the JPEG. Normal session photos use the existing manual local-retention policy and cloud delivery remains unchanged.

## What is and is not verified

- Automated controller tests cover preview/still coordination, camera-copy retention arguments, invalid-image rejection, temporary-file cleanup, wrong/multiple-camera rejection, disconnect readiness and preview-resume failure.
- An isolated synthetic-camera integration check exercises the actual Host routes, streaming process, countdown, retake, event storage and deliverable pipeline. Synthetic success is not a camera hardware pass.
- Physical USB detection, live view, still capture, preview recovery, reconnect, iPad display, print quality and repeated sessions need confirmation with the real 60D.
- Windows and additional Canon models remain future adapter work. Do not install replacement USB drivers on Windows based on this Mac implementation.

## References

- [gPhoto supported cameras — EOS 60D capture and live view](https://gphoto.sourceforge.io/proj/libgphoto2/support.php)
- [gPhoto remote-control documentation](https://gphoto.sourceforge.io/doc/remote/)
- [gPhoto CLI: preview-stream capture and file-retention options](https://github.com/gphoto/gphoto2/blob/master/doc/gphoto2.1)
- [Canon: connect the EOS 60D by USB and disable auto power off](https://asia.canon/en/support/8200843500)
