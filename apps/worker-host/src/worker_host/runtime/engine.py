from __future__ import annotations

import json
import sys
import threading
from threading import Event
from typing import Callable

from ..adapters.ffmpeg import CommandCancelled, CommandTimedOut
from ..adapters.filesystem import temporary_workspace
from ..registry import HANDLERS
from ..handlers.context import HandlerContext

PROTOCOL_VERSION = 1


class WorkerRuntime:
    def __init__(self, emit: Callable[[dict], None]) -> None:
        self.emit = emit
        self.active: dict[str, Event] = {}
        self.lock = threading.Lock()

    def handle_message(self, message: dict) -> None:
        kind = message.get("message_type")
        if kind == "handshake":
            self.emit(
                {
                    "protocol_version": PROTOCOL_VERSION,
                    "message_type": "handshake",
                    "payload": {"status": "ready", "capabilities": sorted(HANDLERS)},
                }
            )
        elif kind == "job":
            job_id = message.get("job_id")
            if not isinstance(job_id, str) or not job_id:
                self.emit_error(None, "INVALID_INPUT", "job_id is required")
                return
            payload = message.get("payload")
            if not isinstance(payload, dict):
                self.emit_error(job_id, "INVALID_INPUT", "payload must be an object")
                return
            cancel_event = Event()
            with self.lock:
                self.active[job_id] = cancel_event
            threading.Thread(
                target=self.run_job, args=(job_id, payload, cancel_event), daemon=False
            ).start()
        elif kind == "cancel":
            job_id = message.get("job_id")
            if isinstance(job_id, str):
                with self.lock:
                    event = self.active.get(job_id)
                if event is not None:
                    event.set()
        else:
            self.emit_error(
                message.get("job_id"),
                "UNSUPPORTED_MESSAGE",
                "message_type must be handshake, job, or cancel",
            )

    def run_job(self, job_id: str, payload: dict, cancelled: Event) -> None:
        task_type = payload.get("task_type")
        if not isinstance(task_type, str):
            task_type = "analysis.v1" if "analysis_type" in payload else ""
        handler = HANDLERS.get(task_type)
        if handler is None:
            self.emit_error(
                job_id,
                "UNSUPPORTED_JOB",
                f"unknown task_type: {task_type or '<missing>'}",
            )
            self.finish(job_id)
            return

        def progress(value: float) -> None:
            if not cancelled.is_set():
                self.emit(
                    {
                        "protocol_version": PROTOCOL_VERSION,
                        "message_type": "progress",
                        "job_id": job_id,
                        "payload": {"progress": max(0.0, min(1.0, value))},
                    }
                )

        try:
            with temporary_workspace(job_id) as workspace:
                result = handler(
                    payload,
                    HandlerContext(
                        job_id,
                        workspace,
                        cancelled,
                        float(payload.get("timeout_seconds", 300)),
                        progress,
                    ),
                )
            if cancelled.is_set():
                self.emit_cancelled(job_id)
            else:
                self.emit(
                    {
                        "protocol_version": PROTOCOL_VERSION,
                        "message_type": "job_result",
                        "job_id": job_id,
                        "status": "succeeded",
                        "outputs": result.get("outputs", []),
                        "metrics": result.get("metrics", {}),
                        "diagnostics": [],
                    }
                )
        except CommandCancelled:
            self.emit_cancelled(job_id)
        except CommandTimedOut as error:
            self.emit_error(job_id, "TIMEOUT", str(error))
        except Exception as error:
            text = str(error)
            if ":" in text and text.split(":", 1)[0].isupper():
                code, detail = text.split(":", 1)
            elif (
                text
                and text.isupper()
                and all(character.isalnum() or character == "_" for character in text)
            ):
                code, detail = text, text
            else:
                code, detail = "WORKER_HANDLER_FAILED", text
            self.emit_error(job_id, code, detail.strip())
        finally:
            self.finish(job_id)

    def finish(self, job_id: str) -> None:
        with self.lock:
            self.active.pop(job_id, None)

    def emit_cancelled(self, job_id: str) -> None:
        self.emit(
            {
                "protocol_version": PROTOCOL_VERSION,
                "message_type": "job_result",
                "job_id": job_id,
                "status": "cancelled",
                "outputs": [],
                "metrics": {},
                "diagnostics": [{"code": "CANCELLED", "message": "job cancelled"}],
            }
        )

    def emit_error(self, job_id: str | None, code: str, message: str) -> None:
        self.emit(
            {
                "protocol_version": PROTOCOL_VERSION,
                "message_type": "job_result",
                "job_id": job_id,
                "status": "failed",
                "outputs": [],
                "metrics": {},
                "diagnostics": [{"code": code, "message": message}],
            }
        )


def run_stdio() -> None:
    output_lock = threading.Lock()

    def emit(message: dict) -> None:
        with output_lock:
            sys.stdout.write(json.dumps(message, separators=(",", ":")) + "\n")
            sys.stdout.flush()

    runtime = WorkerRuntime(emit)
    for line in sys.stdin:
        if not line.strip():
            continue
        try:
            message = json.loads(line)
            if not isinstance(message, dict):
                raise ValueError("message must be an object")
            runtime.handle_message(message)
        except Exception as error:
            emit(
                {
                    "protocol_version": PROTOCOL_VERSION,
                    "message_type": "error",
                    "status": "failed",
                    "diagnostics": [
                        {"code": "INVALID_PROTOCOL", "message": str(error)}
                    ],
                }
            )
