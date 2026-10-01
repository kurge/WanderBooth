# WanderBooth iPad Setup

**Status:** Working Phase 0 setup

**Updated:** 2026-10-02

The iPad can be used in two different ways. Choose the setup based on who needs to touch the customer screen.

## Recommended: Safari customer screen

Use this for **Self-Service** and whenever customers need to tap the interface themselves.

1. Connect the Mac and iPad to the same Wi-Fi or phone hotspot. The USB cable can stay connected for power, but the customer screen communicates over the local network.
2. Open WanderBooth on the Mac.
3. Find **iPad customer screen → Open in Safari** in the operator sidebar.
4. Type the displayed address into Safari on the iPad. On the current network it will look like `http://192.168.x.x:4174/?surface=customer`.
5. Keep WanderBooth open on the Mac. The iPad reconnects to the Host if Safari briefly loses the connection.

The address can change when the Mac joins a different network, so use the address currently shown inside WanderBooth. Internet is not required for this local screen, although future cloud QR delivery will require internet when uploading.

## Optional: Sidecar second display

Use this for **Attendant-Operated** mode when the iPad only needs to present the customer view.

1. Keep the iPad connected by USB, unlock it, and choose **Trust** if prompted.
2. On the Mac, open **System Settings → Displays**.
3. Choose **Add Display**, select the iPad, and use it as an **Extended Display**.
4. In WanderBooth, choose **Open customer screen**.
5. Drag that customer window onto the iPad and make it full screen.

Sidecar extends or mirrors the Mac display. On the current macOS 15/iPadOS 18 setup, it should not be treated as a normal finger-touchscreen for arbitrary Mac controls; Apple documents mouse/trackpad and Apple Pencil input plus a limited set of iPad gestures. That makes Sidecar useful for the read-only attended presentation, while Safari is the better Self-Service path.

Apple references:

- [Use an iPad as a second display for a Mac](https://support.apple.com/en-us/102597)
- [Use iPad as a second display for Mac](https://support.apple.com/guide/ipad/use-your-ipad-as-a-second-display-ipad2b1aa3be/ipados)

## Before a live event

- Keep the iPad on power.
- Disable auto-lock for the test or configure Guided Access once kiosk setup is implemented.
- Test the exact venue Wi-Fi or hotspot before accepting customers.
- Keep the operator screen visible on the Mac because the Mac owns the selected camera, cash confirmation, and recovery controls.
