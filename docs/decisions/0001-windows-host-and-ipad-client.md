# ADR 0001: Windows Host and iPad Client

- Status: Superseded by ADR 0004
- Date: 2026-10-02

## Decision

WanderBooth will use a Windows PC or laptop as the Host for camera control, photo processing, local storage, QR delivery, and Epson printing. The iPad will run the customer-facing touch interface over the booth's private local network.

## Why

- The business already plans to use an iPad as the touchscreen.
- Windows can use manufacturer camera tools and the Epson printer driver.
- The iPad does not need direct access to the camera or printer.
- The interface can be built with web technology and later packaged as a native app if necessary.
- The system continues operating on a local network without internet.

## Trade-offs

- The booth depends on a stable private router and communication between two devices.
- The Host must expose a carefully limited local service.
- Setup involves more than one device.
- Connection status and automatic recovery become first-class features.

## Superseded

The Host/iPad separation remains valid, but the Host is no longer Windows-only. ADR 0004 expands the desktop target to Windows 11 and macOS Sequoia while retaining one certified pilot setup.
