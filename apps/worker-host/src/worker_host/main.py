"""Minimal Worker Host protocol boundary for WO-001.

The worker never opens project.sqlite and communicates with structured JSON only.
"""
import json
import sys

ANALYSIS_FIELDS = {"asr": "text", "ocr": "text", "scene": "label"}


def run() -> None:
    global CURRENT_REQUEST_ID
    for line in sys.stdin:
        message = json.loads(line)
        CURRENT_REQUEST_ID = message.get("request_id") or message.get("job_id")
        kind = message.get("message_type")
        if kind == "handshake":
            emit({"protocol_version": 1, "message_type": "handshake", "payload": {"status": "ready"}})
        elif kind == "job":
            job_id = message.get("job_id")
            if not job_id:
                emit_error(None, "INVALID_INPUT", "job_id is required")
            elif isinstance(message.get("payload"), dict) and "analysis_type" in message["payload"]:
                run_analysis(job_id, message["payload"])
            else:
                emit({"protocol_version": 1, "message_type": "progress", "job_id": job_id, "payload": {"progress": 0}})
                emit_error(job_id, "UNSUPPORTED_JOB", "job payload must declare analysis_type")
        elif kind == "cancel":
            emit({"protocol_version": 1, "message_type": "job_result", "job_id": message.get("job_id"), "status": "cancelled", "outputs": [], "metrics": {}, "diagnostics": []})


def emit(message: dict) -> None:
    if "request_id" not in message and CURRENT_REQUEST_ID is not None:
        message["request_id"] = CURRENT_REQUEST_ID
    print(json.dumps(message, separators=(",", ":")), flush=True)


def emit_error(job_id: str | None, code: str, message: str) -> None:
    emit({"protocol_version": 1, "message_type": "job_result", "job_id": job_id, "status": "failed", "outputs": [], "metrics": {}, "diagnostics": [{"code": code, "message": message}]})


CURRENT_REQUEST_ID = None

def run_analysis(job_id: str, payload: dict) -> None:
    analysis_type = payload.get("analysis_type")
    content_field = ANALYSIS_FIELDS.get(analysis_type)
    records = payload.get("records")
    if content_field is None:
        emit_error(job_id, "UNSUPPORTED_ANALYSIS", "analysis_type must be asr, ocr, or scene")
        return
    if not isinstance(records, list) or not records:
        emit_error(job_id, "EMPTY_ANALYSIS", "explicit analysis records are required")
        return
    normalized = []
    for index, record in enumerate(records):
        if not isinstance(record, dict) or not record.get("asset_id"):
            emit_error(job_id, "MISSING_ASSET", f"record {index} requires asset_id")
            return
        start_pts, end_pts = record.get("start_pts"), record.get("end_pts")
        if not isinstance(start_pts, int) or not isinstance(end_pts, int) or start_pts < 0 or end_pts <= start_pts:
            emit_error(job_id, "INVALID_RANGE", f"record {index} has an invalid PTS range")
            return
        value = record.get(content_field)
        if not isinstance(value, str) or not value.strip():
            emit_error(job_id, "EMPTY_EVIDENCE", f"record {index} requires non-empty {content_field}")
            return
        normalized.append({**record, "source": analysis_type})
    emit({"protocol_version": 1, "message_type": "progress", "job_id": job_id, "payload": {"progress": 1}})
    emit({"protocol_version": 1, "message_type": "job_result", "job_id": job_id, "status": "succeeded", "outputs": normalized, "metrics": {"records": len(normalized)}, "diagnostics": []})


if __name__ == "__main__":
    run()
