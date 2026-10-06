# WanderBooth Events and Local Storage

**Status:** Working Phase 0 behavior

**Version:** 1.1.0

**Updated:** 2026-10-02

An **event** is WanderBooth's local project folder for one booking, celebration, or operating period. Staff choose or create an event before serving a customer. The event keeps its own templates, completed sessions, captures, branded images, composite, and slideshow so the operator can leave the app, return later, and continue working in the same place.

## Starting an event

The operator starts at the Event Library. Creating an event requires:

- event name;
- event date; and
- one starting template folder.

An optional end date, client name, venue, and notes may also be saved. Choosing **Create and open event** copies all master templates in the selected folder into the new event. Those copies become event-owned working templates; later edits do not change the Template Library or another event.

Opening an existing event restores its workspace. Archiving moves an event out of the active list without deleting anything. Restoring an archived event makes it active and opens it. Permanent deletion asks for confirmation and removes the event record plus its local sessions, photos, layouts, and videos. This cannot be undone.

## Customer sessions

The event workspace shows the current operation mode and starts the next numbered session. Staff may add an optional customer or group name. The current booth state remains Host-owned and persisted, so an interrupted active session can recover after an app restart.

After final approval and local processing, the completed event-session record stores:

- session number and optional customer/group name;
- start and completion time;
- selected product, layout, and event template;
- local capture references;
- branded individual photos, final composite, and MP4 slideshow references; and
- a persistent QR-delivery record containing its random token, share URL, exact expiry, upload/retry status, and last error without storing the Cloudflare secret in the event.

Completed sessions are snapshots. Editing an event template later does not rewrite an earlier session or its exported files.

## Template Library, folders, and event copies

The **Template Library** contains reusable master templates. A master may belong to more than one named folder, such as Weddings, Birthdays, or Corporate. A folder is an organizational collection rather than a storage container: deleting a folder removes that membership but does not delete its templates.

Each event owns a separate list of event templates:

1. Creating the event copies every master in its chosen starting folder.
2. Staff may later add individual masters from any library folder.
3. Editing or deleting an event template affects only that event.
4. Choosing **Save to Template Library** deliberately creates a new reusable master and assigns it to one or more selected folders.
5. Promoting an event template does not replace its original source master and does not modify any other event.

This copy-on-event boundary is important during busy service: staff can prepare and approve designs once, then make event-specific corrections without introducing a surprise change elsewhere.

## Local file layout

Private runtime data remains inside the ignored WanderBooth data directory. Event media uses predictable paths:

```text
data/
├── wanderbooth.sqlite
└── events/
    └── <event-id>/
        └── sessions/
            └── <session-id>/
                ├── captures/
                └── deliverables/
```

Simulator and real-camera captures use the same event/session ownership model. The public Git repository must never contain this directory or any customer media.

## Retention and cloud QR boundary

Local event data currently remains on the booth computer until staff manually delete the entire event. Archiving is not deletion. There is no automatic local 30-day cleanup in this phase.

The customer QR link has a separate policy from local storage. Only approved branded individual photos, the final layout, and the looping slideshow are uploaded; raw captures and the print-only sheet stay local. The private cloud page stops serving files exactly 30 days after session completion, and the hourly cleanup job removes the R2 objects and file rows while retaining only a minimal expired-delivery record.

Event history displays the true state: setup required, queued, uploading, ready, failed, or expired. A failed or interrupted upload can be retried, including after an application restart. Local capture, processing, printing, history, and deliberate event deletion continue to work without internet access.

Before a live pilot, WanderBooth still needs storage-capacity warnings, a separate backup location, a deliberate per-session deletion/recovery policy, deployment monitoring, and a tested Cloudflare recovery/export procedure.

## Operator checklist

Before opening the booth:

1. Create or open the correct event.
2. Confirm its client, venue, date, and event-template set.
3. Select Attendant-Operated or Self-Service mode.
4. Test the chosen camera and inspect available local storage.
5. Confirm Cloud delivery is configured and run one complete test session through **QR ready**.

After the event:

1. Review the completed session count and files.
2. Confirm no session is still queued, uploading, or failed before disconnecting the event internet connection.
3. Archive the event when it is no longer in active use.
4. Back it up outside WanderBooth if the business needs another copy.
5. Permanently delete it only when the business has deliberately decided the local media is no longer needed.
