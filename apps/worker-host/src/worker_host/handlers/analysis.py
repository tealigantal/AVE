from __future__ import annotations

from .context import HandlerContext

ANALYSIS_FIELDS = {"asr": "text", "ocr": "text", "scene": "label"}


def handle(payload: dict, context: HandlerContext) -> dict:
    analysis_type = payload.get("analysis_type")
    content_field = ANALYSIS_FIELDS.get(str(analysis_type))
    records = payload.get("records")
    if content_field is None:
        raise ValueError("UNSUPPORTED_ANALYSIS: analysis_type must be asr, ocr, or scene")
    if not isinstance(records, list) or not records:
        raise ValueError("EMPTY_ANALYSIS: explicit analysis records are required")
    normalized: list[dict] = []
    for index, record in enumerate(records):
        if context.cancelled.is_set():
            raise RuntimeError("CANCELLED: job cancelled")
        if not isinstance(record, dict) or not record.get("asset_id"):
            raise ValueError(f"MISSING_ASSET: record {index} requires asset_id")
        start_pts, end_pts = record.get("start_pts"), record.get("end_pts")
        if not isinstance(start_pts, int) or not isinstance(end_pts, int) or start_pts < 0 or end_pts <= start_pts:
            raise ValueError(f"INVALID_RANGE: record {index} has an invalid PTS range")
        value = record.get(content_field)
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f"EMPTY_EVIDENCE: record {index} requires non-empty {content_field}")
        normalized.append({**record, "source": analysis_type})
        context.progress((index + 1) / len(records))
    return {"outputs": normalized, "metrics": {"records": len(normalized)}}
