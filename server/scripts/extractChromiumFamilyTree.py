from __future__ import annotations

import json
import os
import sys
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[2]
VENDOR_DIR = ROOT_DIR / "server" / "vendor"
RECOVERY_DIR = ROOT_DIR / "server" / "data" / "recovery"
CLIENT_RECOVERY_DIR = ROOT_DIR / "client" / "public" / "recovery-test"
STORAGE_KEY = "https://alshaerf.com"


if str(VENDOR_DIR) not in sys.path:
    sys.path.insert(0, str(VENDOR_DIR))

from ccl_chromium_reader import ccl_chromium_localstorage as localstorage  # noqa: E402


BROWSER_TARGETS = [
    {
        "browser": "chrome",
        "storage_dir": Path(os.environ.get("LOCALAPPDATA", "")) / "Google" / "Chrome" / "User Data" / "Default" / "Local Storage" / "leveldb",
        "priority_keys": ["familyTreeData_v3", "familyTreeData_v2", "familyTreeData"],
    },
    {
        "browser": "edge",
        "storage_dir": Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "Edge" / "User Data" / "Default" / "Local Storage" / "leveldb",
        "priority_keys": ["familyTreeData_v3", "familyTreeData_v2", "familyTreeData"],
    },
]


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def walk_tree(node: dict, nodes: list[dict]) -> None:
    if not isinstance(node, dict):
        return

    nodes.append(node)
    for child in node.get("children") or []:
        walk_tree(child, nodes)


def summarize_tree(tree: dict) -> dict:
    nodes: list[dict] = []
    walk_tree(tree, nodes)

    generation_counts = Counter()
    for node in nodes:
        generation = node.get("generation")
        generation_counts[str(generation)] += 1

    return {
        "rootName": tree.get("fullName"),
        "nodeCount": len(nodes),
        "maxGeneration": max((node.get("generation") for node in nodes if isinstance(node.get("generation"), int)), default=None),
        "generationCounts": dict(sorted(generation_counts.items(), key=lambda item: int(item[0]) if item[0].isdigit() else 9999)),
    }


def flatten_tree(tree: dict) -> list[dict]:
    flattened: list[dict] = []

    def visit(node: dict, parent_id: str | None = None) -> None:
        if not isinstance(node, dict):
            return

        item = {key: value for key, value in node.items() if key != "children"}
        if parent_id and not item.get("fatherId"):
            item["fatherId"] = parent_id
        flattened.append(item)

        for child in node.get("children") or []:
            visit(child, node.get("_id"))

    visit(tree)
    return flattened


def pick_best_tree_record(records: list[localstorage.LocalStorageRecord]):
    for script_key in ["familyTreeData_v3", "familyTreeData_v2", "familyTreeData"]:
        candidates = [record for record in records if record.script_key == script_key and record.is_live and record.value]
        if candidates:
            return max(candidates, key=lambda record: record.leveldb_seq_number)
    return None


def read_browser_records(storage_dir: Path) -> list[localstorage.LocalStorageRecord]:
    db = localstorage.LocalStoreDb(storage_dir)
    try:
        return list(
            db.iter_records_for_storage_key(
                STORAGE_KEY,
                include_deletions=True,
                raise_on_no_result=False,
            )
        )
    finally:
        db.close()


def main() -> None:
    ensure_dir(RECOVERY_DIR)
    ensure_dir(CLIENT_RECOVERY_DIR)

    output_summary: dict[str, object] = {
        "generatedAt": datetime.now(UTC).isoformat(),
        "storageKey": STORAGE_KEY,
        "browsers": [],
    }

    best_browser_payload: tuple[str, dict] | None = None

    for target in BROWSER_TARGETS:
        browser = target["browser"]
        storage_dir = target["storage_dir"]

        browser_result: dict[str, object] = {
            "browser": browser,
            "storageDir": str(storage_dir),
        }

        if not storage_dir.exists():
            browser_result["error"] = "storage directory not found"
            output_summary["browsers"].append(browser_result)
            continue

        try:
            records = read_browser_records(storage_dir)
        except Exception as error:  # pragma: no cover - forensic best effort
            browser_result["error"] = str(error)
            output_summary["browsers"].append(browser_result)
            continue

        browser_result["recordCount"] = len(records)
        browser_result["records"] = [
            {
                "scriptKey": record.script_key,
                "seq": record.leveldb_seq_number,
                "isLive": record.is_live,
                "valueLength": None if record.value is None else len(record.value),
                "valuePreview": None if record.value is None else record.value[:120],
            }
            for record in sorted(records, key=lambda item: item.leveldb_seq_number)
            if record.script_key.startswith("familyTree") or record.script_key.startswith("admin")
        ]

        tree_record = pick_best_tree_record(records)
        if tree_record and tree_record.value:
            tree = json.loads(tree_record.value)
            tree_summary = summarize_tree(tree)

            tree_output_path = RECOVERY_DIR / f"{browser}-{tree_record.script_key}.json"
            tree_output_path.write_text(json.dumps(tree, ensure_ascii=False, indent=2), encoding="utf-8")

            browser_result["selectedTreeKey"] = tree_record.script_key
            browser_result["selectedTreeSeq"] = tree_record.leveldb_seq_number
            browser_result["selectedTreePath"] = str(tree_output_path)
            browser_result["treeSummary"] = tree_summary

            if best_browser_payload is None or tree_summary["nodeCount"] > summarize_tree(best_browser_payload[1])["nodeCount"]:
                best_browser_payload = (browser, tree)

        output_summary["browsers"].append(browser_result)

    if best_browser_payload is not None:
        browser_name, best_tree = best_browser_payload
        best_tree_path = CLIENT_RECOVERY_DIR / "browser-family-tree.json"
        best_tree_path.write_text(json.dumps(best_tree, ensure_ascii=False, indent=2), encoding="utf-8")
        flat_import_path = RECOVERY_DIR / "browser-family-tree-persons-import.json"
        flat_import_path.write_text(json.dumps(flatten_tree(best_tree), ensure_ascii=False, indent=2), encoding="utf-8")
        output_summary["bestBrowserTree"] = {
            "browser": browser_name,
            "path": str(best_tree_path),
            "flatImportPath": str(flat_import_path),
            "summary": summarize_tree(best_tree),
        }

    summary_path = RECOVERY_DIR / "browser-family-tree-summary.json"
    summary_path.write_text(json.dumps(output_summary, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps({
        "summaryPath": str(summary_path),
        "bestBrowserTree": output_summary.get("bestBrowserTree"),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
