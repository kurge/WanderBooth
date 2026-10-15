# Fujifilm X-M5 USB Tether Pilot

**Status:** Experimental attended workflow

**Updated:** 2026-10-15

WanderBooth can import the full-resolution JPEG produced by a Fujifilm X-M5 through FUJIFILM TETHER APP. This first bridge is designed for attended sessions. WanderBooth owns the countdown and waits for the next completed JPEG, while the attendant presses the X-M5 shutter after the countdown.

The current app bridge does not yet provide X-M5 live view or programmatic shutter control. A 2026-10-15 direct-control spike proved that this exact X-M5 can provide repeated 1024×768 tether preview frames, fire automatically, deliver a 6240×4160 JPEG plus RAF, and retain both camera copies. However, the camera stopped serving USB preview frames after capture and did not recover through a software-only reconnect. Do not advertise USB-only control as unattended Self-Service. The recommended next adapter uses clean HDMI through a UVC capture device for continuous preview and USB tether for automatic full-resolution capture.

WanderBooth 0.16.0 implements that split as the Experimental **Fujifilm X-M5 · hybrid** source. It can already use the Mac camera as a temporary preview while USB supplies the real saved still; production X-M5 preview requires an HDMI Micro (Type D) cable and UVC capture device.

## Hybrid setup

1. Install gPhoto2 through Homebrew on the pilot Mac. This external dependency is not bundled into the DMG.
2. Fully quit FUJIFILM TETHER APP so it does not own the USB camera.
3. Set the X-M5 to still-photo mode and `USB TETHER SHOOTING AUTO`.
4. Connect the X-M5 directly with its USB data cable.
5. Connect the X-M5 HDMI Micro (Type D) output to a standard UVC capture device, then connect that device to the Mac.
6. In the operator sidebar, choose **Fujifilm X-M5 · hybrid**.
7. Enable video preview and select the HDMI capture device. Until that hardware is available, the Mac camera can exercise the split workflow but is not an X-M5 live-view substitute for production.
8. Click **Test automatic X-M5 capture**. The camera takes one real test photo; the app must report both video and USB ready before enabling a session.

During a session, the selected video device continues supplying the mirrored posing preview. At zero on each countdown, the Host fires the X-M5 over USB, downloads the full-resolution JPEG into the exact pending slot, keeps JPEG and RAW on the camera, and advances automatically. The temporary Host RAF copy is removed and is never uploaded to the customer's QR gallery.

## One-time setup

1. Install the current [FUJIFILM TETHER APP](https://www.fujifilm-x.com/global/products/software/tether-app/) from Fujifilm.
2. Create a dedicated empty folder, for example `Pictures/WanderBooth X-M5 Inbox`.
3. In FUJIFILM TETHER APP, select that folder as the automatic JPEG download destination.
4. On the X-M5, set **Network/USB Setting → USB Power Supply/Communication Setting → Auto**. If data transfer is unreliable, use **Power Supply Off/Communication On** and provide separate camera power.
5. Set **Network/USB Setting → Connection Mode → USB Tether Shooting Auto**.
6. Set **Power Management → Auto Power Off → Off**.
7. Connect the camera directly with a data-capable USB cable, turn it on, and confirm FUJIFILM TETHER APP recognizes it.
8. In the WanderBooth operator sidebar, select **Fujifilm X-M5 · USB tether**, choose the same download folder, and click **Test X-M5 transfer**.
9. Take one JPEG photo within 30 seconds. WanderBooth should report the received filename and verification time.

Fujifilm documents that `USB TETHER SHOOTING AUTO` returns the camera to normal operation when the computer is unavailable. `USB TETHER SHOOTING FIXED` can remain in tether mode after a disconnect and, at its defaults, may not write images to the memory card. WanderBooth therefore uses Auto as the safer event recommendation. See the [X-M5 tethered photography guide](https://fujifilm-dsc.com/en/manual/x-m5/connections/tethere/) and [Network/USB settings](https://fujifilm-dsc.com/en/manual/x-m5/connections/network_usb_menu/).

## Running a session

1. Keep FUJIFILM TETHER APP open and the X-M5 connected.
2. Confirm the camera card in WanderBooth says **Folder ready · active source**.
3. Start the normal customer session and confirm cash.
4. Start the capture sequence.
5. At the end of each three-second countdown, wait for the operator screen to say **Press the X-M5 shutter now**, then press the physical shutter.
6. WanderBooth waits until the JPEG finishes writing, copies it into the active event/session, and automatically starts the next countdown.
7. Review, retake, filter, print, and deliver by QR as usual.

The bridge records a snapshot of the folder before every capture. Files that existed before that moment are ignored, so an older customer's image cannot be silently reused. A candidate JPEG must stop changing and pass image decoding before it is accepted. If no new JPEG arrives within 45 seconds, the session stops with an operator-visible error.

## Recommended starting camera settings

- File type: JPEG Fine, or RAW + JPEG when a separate RAW archive is desired. WanderBooth imports JPEG only.
- Drive: Single frame.
- Exposure: Manual for consistent strips.
- Focus: AF-S with Face/Eye Detection.
- White balance: fixed Kelvin or custom white balance.
- Starting point under continuous booth lighting: 1/125 sec, f/5.6, ISO 400–800, then meter and adjust for the real lights and lens.
- Auto Power Off: Off.

## Recovery

- **Folder unavailable:** reconnect the drive or choose the current FUJIFILM TETHER APP destination again.
- **No new JPEG arrived:** verify the camera is in USB Tether Shooting Auto, the USB cable carries data, FUJIFILM TETHER APP is open, and both applications point to the same folder.
- **RAW arrives but no JPEG:** enable JPEG or RAW + JPEG in the camera. RAW-only files are intentionally ignored.
- **Session stopped:** reset the booth after checking the connection, then start a new disposable test session.

## Remaining certification work

- Add a combined adapter: HDMI/UVC for continuous live view plus direct USB for automatic shutter and full-resolution JPEG download.
- Preserve the tested `--keep --keep-raw` behavior so both new files remain on the camera.
- Retake, cable-disconnect, app-restart, and camera-restart recovery.
- Fifty consecutive sessions without a missing or mismatched capture.
- 2×6 and 4×6 Epson print-quality approval.
- Bundle or document the macOS direct-controller dependency without silently changing the public repository's licensing.
- Add a separate Windows 11 adapter; libgphoto2 does not support Windows.
- Keep the attended FUJIFILM TETHER APP watched-folder bridge as the fallback until the combined adapter is certified.

See [the 2026-10-15 direct USB tether test record](test-records/2026-10-15-fujifilm-xm5-direct-tether.md) for exact evidence and limitations.

See [the Hybrid adapter implementation record](test-records/2026-10-15-fujifilm-xm5-hybrid-adapter.md) for the current software verification and remaining physical gate.
