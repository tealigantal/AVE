from __future__ import annotations

import hashlib
import json
import math
from typing import Any


ADAPTER_ID = "worker-media"
ADAPTER_VERSION = "v2"
CANONICALIZER = "ave-c14n-v1"


def _canonical_value(value: Any) -> Any:
    if value is None or isinstance(value, (str, bool)):
        return value
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        if not math.isfinite(value):
            raise ValueError("CANONICAL_VALUE_INVALID")
        return 0 if value == 0 else value
    if isinstance(value, list):
        return [_canonical_value(item) for item in value]
    if isinstance(value, dict):
        if set(value) == {"$ave_bigint"}:
            bigint = value["$ave_bigint"]
            if (
                not isinstance(bigint, str)
                or not bigint
                or (bigint[0] == "-" and not bigint[1:].isdigit())
                or (bigint[0] != "-" and not bigint.isdigit())
            ):
                raise ValueError("CANONICAL_VALUE_INVALID")
        return {key: _canonical_value(value[key]) for key in sorted(value)}
    raise ValueError("CANONICAL_VALUE_INVALID")


def canonical_json(value: Any) -> str:
    return json.dumps(
        _canonical_value(value),
        ensure_ascii=False,
        separators=(",", ":"),
        allow_nan=False,
    )


def _strict_json(value: str, code: str) -> Any:
    def object_from_pairs(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for key, item in pairs:
            if key in result:
                raise ValueError(code)
            result[key] = item
        return result

    try:
        parsed = json.loads(
            value,
            object_pairs_hook=object_from_pairs,
            parse_constant=lambda _constant: (_ for _ in ()).throw(ValueError(code)),
        )
    except (TypeError, json.JSONDecodeError) as error:
        raise ValueError(code) from error
    return _canonical_value(parsed)


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def semantic_manifest(graph: dict) -> dict:
    nodes: list[dict] = []
    for raw_node in graph.get("nodes", []):
        node = dict(raw_node)
        parameters = dict(node.get("parameters") or {})
        if node.get("kind") == "source":
            node["capability"] = "source.asset"
            for key in (
                "source_ref",
                "source_kind",
                "fallback",
                "source_start_pts",
                "source_end_pts",
                "source_timescale",
                "selected_object_ref",
            ):
                parameters.pop(key, None)
            node["parameters"] = parameters
        elif node.get("kind") == "trim":
            node["parameters"] = {
                key: value
                for key, value in parameters.items()
                if key.startswith("semantic_")
            }
        elif node.get("kind") == "audio":
            for key in ("source_start_pts", "source_end_pts", "source_timescale"):
                parameters.pop(key, None)
            node["parameters"] = parameters
        elif node.get("kind") == "time_map":
            semantic_segments = parameters.pop("semantic_segments_json", None)
            execution_segments = parameters.pop("segments_json", "[]")
            parameters["segments_json"] = semantic_segments or execution_segments
            node["parameters"] = parameters
        elif node.get("kind") == "sink":
            node["parameters"] = {}
        nodes.append(node)
    return {
        "schema_version": 2,
        "timeline_version": graph.get("timeline_version", 0),
        "nodes": nodes,
        "edges": graph.get("edges", []),
    }


def input_identities(graph: dict) -> list[dict]:
    identities: list[dict] = []
    for source in sorted(
        graph.get("source_refs") or [], key=lambda item: item.get("asset_ref", "")
    ):
        identities.append(
            {
                "asset_ref": source.get("asset_ref"),
                "original_object_ref": source.get("original_object_ref"),
                "proxy_object_ref": source.get("proxy_object_ref"),
                "source_timescale": source.get("source_timescale"),
                "original_timescale": source.get("original_timescale"),
                "proxy_timescale": source.get("proxy_timescale"),
                "proxy_map": source.get("proxy_map"),
                "has_audio": source.get("has_audio"),
            }
        )
    return identities


def create_execution_plan(graph: dict) -> dict:
    """Test/support helper that mirrors the Host resolver for executable graphs."""
    target = graph.get("target")
    semantic_payload = canonical_json(semantic_manifest(graph))
    semantic_hash = _sha256(semantic_payload)
    capabilities = sorted({str(node.get("capability")) for node in graph["nodes"]})
    decisions = [
        {
            "schema_version": 1,
            "node_id": node["node_id"],
            "capability": node["capability"],
            "outcome": "execute",
        }
        for node in graph["nodes"]
    ]
    cache_payload = canonical_json(
        {
            "canonicalizer": CANONICALIZER,
            "semantic_graph_hash": semantic_hash,
            "target": target,
            "profile": graph.get("profile") or {},
            "range": graph.get("range"),
            "adapter_id": ADAPTER_ID,
            "adapter_version": ADAPTER_VERSION,
            "input_identities": input_identities(graph),
        }
    )
    cache_key = _sha256(cache_payload)
    return {
        "schema_version": 2,
        "plan_id": f"plan-{target}-{cache_key[:24]}",
        "target": target,
        "semantic_graph_payload": semantic_payload,
        "semantic_graph_hash": semantic_hash,
        "adapter_id": ADAPTER_ID,
        "adapter_version": ADAPTER_VERSION,
        "capability_snapshot": {
            "schema_version": 1,
            "adapter_id": ADAPTER_ID,
            "adapter_version": ADAPTER_VERSION,
            "capabilities": capabilities,
        },
        "decisions": decisions,
        "cache_key_payload": cache_payload,
        "cache_key": cache_key,
        "diagnostics": [],
    }


def validate_execution_request(payload: dict) -> dict:
    graph = payload.get("graph")
    plan = payload.get("execution_plan")
    if not isinstance(graph, dict):
        raise ValueError("GRAPH_REQUIRED")
    if not isinstance(plan, dict):
        raise ValueError("EXECUTION_PLAN_REQUIRED")
    required_plan_fields = {
        "schema_version",
        "plan_id",
        "target",
        "semantic_graph_payload",
        "semantic_graph_hash",
        "adapter_id",
        "adapter_version",
        "capability_snapshot",
        "decisions",
        "cache_key_payload",
        "cache_key",
        "diagnostics",
    }
    if set(plan) != required_plan_fields:
        raise ValueError("EXECUTION_PLAN_SCHEMA_INVALID")
    target = graph.get("target")
    if (
        plan.get("schema_version") != 2
        or target not in {"preview", "master"}
        or plan.get("target") != target
        or plan.get("adapter_id") != ADAPTER_ID
        or plan.get("adapter_version") != ADAPTER_VERSION
    ):
        raise ValueError("EXECUTION_PLAN_BINDING_INVALID")
    semantic_payload = plan.get("semantic_graph_payload")
    if (
        not isinstance(semantic_payload, str)
        or _strict_json(semantic_payload, "SEMANTIC_GRAPH_HASH_MISMATCH")
        != _canonical_value(semantic_manifest(graph))
        or plan.get("semantic_graph_hash") != _sha256(semantic_payload)
    ):
        raise ValueError("SEMANTIC_GRAPH_HASH_MISMATCH")
    expected_capabilities = sorted(
        {str(node.get("capability")) for node in graph.get("nodes", [])}
    )
    if plan.get("capability_snapshot") != {
        "schema_version": 1,
        "adapter_id": ADAPTER_ID,
        "adapter_version": ADAPTER_VERSION,
        "capabilities": expected_capabilities,
    }:
        raise ValueError("CAPABILITY_SNAPSHOT_MISMATCH")
    decisions = plan.get("decisions")
    if not isinstance(decisions, list) or len(decisions) != len(graph.get("nodes", [])):
        raise ValueError("RESOLVER_DECISION_COVERAGE_INVALID")
    by_node: dict[str, dict] = {}
    for decision in decisions:
        if not isinstance(decision, dict) or set(decision) - {
            "schema_version",
            "node_id",
            "capability",
            "outcome",
            "detail",
        }:
            raise ValueError("RESOLVER_DECISION_INVALID")
        node_id = decision.get("node_id")
        if decision.get("schema_version") != 1 or not isinstance(node_id, str) or node_id in by_node:
            raise ValueError("RESOLVER_DECISION_COVERAGE_INVALID")
        by_node[node_id] = decision
    for node in graph.get("nodes", []):
        decision = by_node.get(node.get("node_id"))
        if (
            decision is None
            or decision.get("capability") != node.get("capability")
            or decision.get("outcome") != "execute"
        ):
            raise ValueError("RESOLVER_DECISION_NOT_EXECUTABLE")
    if plan.get("diagnostics") != []:
        raise ValueError("EXECUTION_PLAN_BLOCKED")
    expected_cache = _canonical_value(
        {
            "canonicalizer": CANONICALIZER,
            "semantic_graph_hash": plan["semantic_graph_hash"],
            "target": target,
            "profile": graph.get("profile") or {},
            "range": graph.get("range"),
            "adapter_id": ADAPTER_ID,
            "adapter_version": ADAPTER_VERSION,
            "input_identities": input_identities(graph),
        }
    )
    cache_payload = plan.get("cache_key_payload")
    expected_cache_key = (
        _sha256(cache_payload) if isinstance(cache_payload, str) else ""
    )
    if (
        not isinstance(cache_payload, str)
        or _strict_json(cache_payload, "EXECUTION_CACHE_KEY_MISMATCH")
        != expected_cache
        or plan.get("cache_key") != expected_cache_key
        or plan.get("plan_id") != f"plan-{target}-{expected_cache_key[:24]}"
    ):
        raise ValueError("EXECUTION_CACHE_KEY_MISMATCH")
    return plan
