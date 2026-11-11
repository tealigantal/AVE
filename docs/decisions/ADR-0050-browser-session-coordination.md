# ADR-0050: Coordinate the browser workbench session

- Status: Accepted; current Docker browser interaction verified as scoped below
- Date: 2026-11-06

## Context

The Browser Host associates one event stream and its dialogs with a browser
cookie. Two same-origin tabs sharing that cookie replace each other's event
stream. During a real export the confirmation appeared in another tab while
the initiating tab waited. This is not evidence that earlier download failures
had the same cause.

## Decision

Before requesting a Host session or event stream, Browser entry acquires a
same-origin exclusive Web Lock for the lifetime of the page. A second tab
visibly waits, then connects after the first closes or navigates away. A page
restored from the back-forward cache reloads to reacquire the lock. When Web
Locks are unavailable the page states the limitation instead of silently
opening an unsafe concurrent session. This is a single-active-tab limitation,
not support for concurrent workbench tabs. Origin-scoped browser coordination
does not replace the server's cookie, origin, CSRF or project authorization.

## Consequences

No project, user input, original, Host permission or stored session is deleted.
Browsers must provide Web Locks in a secure context; localhost is the normal
local entry. Independent browser profiles retain their existing independent
cookies. Same-origin tab waiting, handover and export confirmation were verified
on Docker build `20261106-ux-r10`; a pending confirmation was not transferred
when its original tab closed. Tabs loaded before this update must be closed or
reloaded to adopt coordination. Concurrent tabs require a future independently
scoped Host session design; this decision does not implement it.

The Host must also terminate the prior window's active operations and pending
dialogs when replacing its event stream, before registering the replacement;
otherwise a fast reconnect can inherit a stale confirmation. This preserves the
existing disconnect cancellation semantics rather than transferring authority.
