# Printing and Photo Filters

This guide describes the first shippable WanderBooth print and filter workflow. It is written for an attendant who does not need to know how the code works.

## What the guest can do

After all photos are captured, the person controlling the session can select a different look for each photo:

- Original
- B&W
- Warm
- Cool
- Vintage
- High Contrast

In Self-Service mode, the guest controls these filters on the touchscreen. In Attendant-Operated mode, staff control them on the operator screen. A filter never overwrites the original capture. It is saved as a choice and applied when WanderBooth creates the final files.

## What the operator receives

Every completed session contains:

- branded individual PNG files;
- the selected strip or card PNG;
- a dedicated 300-DPI 4×6 print PNG; and
- the looping MP4 slideshow when FFmpeg is available.

For a single 2×6 strip, WanderBooth places the same finished strip on the left and right halves of one 4×6 sheet. The attendant prints one supported 4×6 sheet and cuts it into two matching strips. A full 4×6 layout is printed as designed.

The Epson L8050 documentation lists 4×6 (102 × 152 mm) media. Its documented custom/borderless limits do not establish a native 2×6 sheet workflow, so the first pilot standardizes physical output on 4×6 media. See Epson's [supported borderless paper types](https://files.support.epson.com/docid/cpd6/cpd62777/source/printers/source/paper_loading/reference/l8050_18050/paper_borderless_types_l8050_18050.html) and [paper specifications](https://files.support.epson.com/docid/cpd6/cpd62777/source/printers/source/specifications/reference/l8050_l18050/spex_paper_printer_l8050_18050.html).

## Manual print flow

1. Complete and approve the session.
2. In Self-Service mode, the operator screen sounds a short ding and shows **Self-service session ready to print**.
3. Select **Preview & print** on the completion screen, or reopen the completed session in event history and select **Preview & print** / **Preview & reprint**.
4. Confirm the exact 4×6 sheet in WanderBooth's preview.
5. Select **Open print dialog**.
6. In the native macOS or Windows dialog, choose the Epson L8050 or another installed printer, 4×6 media, correct orientation, Actual Size / 100%, print quality, copies, and borderless mode when appropriate.
7. Inspect the first physical print before serving a busy event.

Electron intentionally opens the operating system's dialog instead of duplicating printer settings. The underlying [`webContents.print`](https://www.electronjs.org/docs/latest/api/web-contents/) API reports whether the submitted dialog completed or failed, which WanderBooth stores as session print history. A normal web browser can open its print dialog, but cannot reliably tell whether the user printed or cancelled; that attempt remains labeled **Print dialog opened**.

## Print history boundaries

WanderBooth currently records:

- when the print dialog was requested;
- whether Electron reported sent, cancelled, or failed; and
- any failure reason Electron returned.

The native dialog owns printer name, paper, quality, borderless mode, and copies. Those selections are not returned to WanderBooth. Persistent queuing, automatic retry, printer status, ink/paper counters, and copy-limit enforcement are later milestones.

## How filters are rendered

The review screen uses a fast CSS approximation so a guest can compare filters instantly. Final files are rendered locally with [Sharp image operations](https://sharp.pixelplumbing.com/api-operation/) using grayscale, channel recombination, modulation, and contrast operations. This makes final output independent of an internet connection and keeps the original capture available for a different choice before approval.

## Future AR upgrade path

Static filters and AR effects should remain separate. A future `EffectProvider` adapter can produce an effect preview/render without changing the current capture, template, print, or event-session contracts.

Recommended spike order:

1. **MediaPipe Face Landmarker** — best first experiment for local/offline ownership and low vendor lock-in. It provides 3D face landmarks, blendshapes, and facial transformation matrices, but WanderBooth must create and render its own effects. The web task should run in a worker so live capture does not block the interface. [Official web guide](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js)
2. **Snap Camera Kit** — strongest option when ready-made Lens content and creator tooling matter more than offline independence. It needs developer access, an API token, and Lens content. [Official overview](https://developers.snap.com/camera-kit/home) and [web integration guide](https://developers.snap.com/camera-kit/integrate-sdk/web/guides/react-camera-kit)
3. **DeepAR** — commercial all-in-one option for masks, face filters, background replacement, screenshots, and video. It requires a project/license key; Beauty is separately licensed. [Official web overview](https://docs.deepar.ai/deepar-sdk/platforms/web/overview/)

Do not choose an AR vendor until a short pilot compares offline behavior, camera resolution, effect-authoring time, licensing, Mac/Windows/iPad support, and print-quality output.

## Epson pilot checklist

- Install the official Epson L8050 driver on the pilot Mac.
- Load the exact 4×6 paper the business will use.
- Print portrait and landscape samples.
- Test Actual Size / 100% and borderless settings.
- Measure edge cropping and color differences from the on-screen preview.
- Print one single-strip duplicated sheet and one full 4×6 design.
- Confirm drying time, cutting guide, throughput, and paper handling.
- Cancel one dialog and force one printer failure to verify history and operator recovery.
- Record the approved driver, paper, quality, color, borderless, and orientation settings in the test record.

