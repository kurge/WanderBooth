# ADR 0018: Group sessions in local event workspaces and copy templates into each event

**Status:** Accepted

**Date:** 2026-10-02

**Extends:** [ADR 0016](0016-reusable-template-gallery.md)

## Context

WanderBooth is operated at booked events, not as an endless ungrouped stream of sessions. Staff need to reopen a booking, see its completed customer sessions, and keep its captures and deliverables together. They also need a reusable design library without risking a change for one client altering every other event that uses the same source template.

Automatic local deletion after 30 days also no longer matches the owner's desired operating model. Local event records should remain available for manual review until staff deliberately delete them, while the future guest-facing cloud QR page still expires after 30 days.

## Decision

- The operator starts at an Event Library and creates or opens an event before starting a customer session.
- An event records its name, date range, optional client, venue and notes, status, isolated templates, and completed sessions.
- Events may be archived and restored without data loss. Confirmed permanent deletion removes the event record and its private local event directory.
- Captures and deliverables are stored below stable event and session IDs.
- The master Template Library supports named many-to-many folders: one template can appear in several folders, and deleting a folder does not delete its templates.
- Event creation copies every master template from one selected starting folder. Staff can add individual master templates later.
- Event copies are independent. Editing or deleting one never mutates the library master, another event, or an already completed session.
- Saving an event template back to the library is an explicit promote operation that creates a new master in one or more chosen folders.
- Local event data has manual retention in this phase. Cloud QR access and cloud media remain a separate future service with automatic 30-day expiry.
- The schema moves to version 12 to persist event records, completed session snapshots, template folders, master-to-folder membership, event copies, and gallery scope.

## Consequences

- Busy-event setup becomes repeatable because staff prepare masters once and serve from event-owned copies.
- Client-specific corrections are safe by default, but intentionally updating a reusable master takes one additional promote action.
- Event deletion is materially destructive and therefore requires an explicit confirmation; archiving is the safe everyday cleanup action.
- Disk use can grow until staff delete events, so storage monitoring and backup guidance are required before a live pilot.
- A completed local session can exist while QR delivery is pending. The interface must distinguish local files from a future public cloud link.

## Verification

- State-machine tests cover multi-folder membership, event-copy isolation, completed-session persistence, and archive/restore behavior.
- Browser verification created an event, completed a named simulator session, reopened its workspace, and opened every generated local deliverable.
- Runtime paths were verified under `events/<event-id>/sessions/<session-id>/`.
- The event history visibly reports that QR delivery is pending and that future links will expire after 30 days.

