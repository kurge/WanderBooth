# Local Event Workspaces Test — 2026-10-02

| Field | Result |
|---|---|
| Build | WanderBooth 0.12.0 |
| Runtime | Isolated local Host, synthetic camera, private temporary data directory |
| Event creation | Pass; created `LenaMiu Event - Nov 22` with client and venue metadata |
| Event reopening | Pass; returned from the completed session to the same event workspace |
| Template folders | Pass; created a Weddings folder and selected it for event preparation |
| Template isolation | Pass in automated tests; an event copy can change without mutating its master |
| Session naming | Pass; started the optional `Santos family` customer/group session |
| Capture workflow | Pass; cash confirmation, three-photo automatic simulator capture, review, and approval completed |
| Local history | Pass; event workspace displayed capture thumbnails and all generated deliverable links |
| Event storage path | Pass; captures and deliverables were served from `events/<event-id>/sessions/<session-id>/...` |
| QR honesty | Pass; session history showed cloud delivery pending and the future 30-day expiry policy |
| Archive/restore | Pass in automated state-machine coverage |
| Manual deletion | Pass in reducer coverage; Host removes the event directory before committing the state deletion |
| Automated checks | Pass; formatting/lint, 42 unit tests, Host type/build, and web type/build |
| Final visual check | Pass; operation-mode cards remain compact beside the next-customer panel and completed-session history remains readable |
| Installation image | Pass; `WanderBooth-0.12.0-arm64.dmg`, 133 MB, valid disk-image checksum |
| SHA-256 | `e2216fff740d6513bd8b203d06e02804fcb4aa25693dc8cac68a78b62894c456` |

No customer media or owner artwork was used. The browser check used generated simulator images and a disposable runtime outside the repository. Cloud upload, a public QR page, printer submission, and external camera certification remain outside this test.
