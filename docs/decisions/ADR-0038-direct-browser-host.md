# ADR-0038: Direct browser transport for the existing Project Host

Status: accepted for the explicitly authorized replacement of remote desktop delivery.
Date: 2026-10-02. Supersedes ADR-0036 remote desktop transport only; ADR-0037 CPU/CUDA configuration remains applicable.

The user rejected the streamed Ubuntu desktop and requested direct AVE browser use with a single Compose startup. Reuse the existing renderer and extract the existing typed IPC handlers into a shared request dispatcher. Native Electron retains its exact sender checks and OS dialogs. A Node HTTP adapter supplies registered browser sessions and Host-owned correlated dialogs. Host authorization credentials remain private; user confirmation answers are scoped to the pending exact Host review, and never become reusable approval tokens.

Bind the browser endpoint only to loopback. Validate Host/Origin, require a Strict HttpOnly session cookie and CSRF header for mutations, and register a live event channel before requests. Uploads have session-owned opaque references; project selections come from Host navigation references within the project volume. Master export creates a session-owned download after successful Host validation. Renderer receives typed wire encodings of RationalTime and bytes, and has no filesystem, SQLite, FFmpeg or model SDK authority.

The runtime image contains Node, Python Worker, FFmpeg and local model dependencies. It requires no Electron, VNC, XFCE, X server or desktop window. Linux containers remain the Docker execution environment; no OS desktop is displayed. Existing project/profile/model volumes and .env keys are retained. No native project migration, public network service, programme Stage Exit, Git publication or new user data disclosure is authorized by this transport change.

Verification covers native regressions, actual browser file/consent/play/export/reopen and CPU/GPU deployment. Controlled synthetic creation and actual configured-model execution are distinguished in current Evidence.
