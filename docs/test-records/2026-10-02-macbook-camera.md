# Starting MacBook Camera Test — 2026-10-02

| Field | Result |
|---|---|
| Camera/source | FaceTime HD Camera reported by the starting MacBook Pro |
| Adapter | WanderBooth 0.3.0 standard media-device adapter |
| Host | Starting MacBook Pro, Apple M3 Pro |
| Operating system | macOS Sequoia 15.7.5 |
| Connection | Internal camera |
| Preview | Pass; mirrored 960×540 relay appeared in the local-network customer client |
| Countdown | Pass; Host-controlled 3–2–1 state appeared on the customer client before each photo |
| Three-photo capture | Pass; one tap automatically captured all three slots |
| Actual saved capture size | 1920×1080 JPEG |
| Mirroring | Pass by implementation path: relayed preview is mirrored; the separate full-resolution save path is unmirrored |
| Host transfer | Pass; each expected slot was saved before the workflow advanced |
| Deliverables | Pass; three branded individuals, 2×6 strip, and looping MP4 rendered |
| Source lock | Pass; camera selection was unavailable during the active session |
| Product approval | None yet |
| Compatibility label | Experimental |

This was one end-to-end smoke session in the packaged Mac application with the customer client opened through the Host's LAN address. It proves the implementation and screen-synchronization path, not field reliability. The physical iPad itself was not used for this automated verification. Certification still requires the physical-iPad run, 50-session run, real-camera retake and disconnect recovery, orientation/crop checks, representative lighting tests, and Epson L8050 print-quality review.

The real captures stayed in the application's ignored local runtime directory. No customer or test images were committed to Git.
