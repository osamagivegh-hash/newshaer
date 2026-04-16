from __future__ import annotations

import json
import os
import sys
from datetime import UTC, datetime
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[2]
VENDOR_DIR = ROOT_DIR / "server" / "vendor"
RECOVERY_DIR = ROOT_DIR / "server" / "data" / "recovery"
STORAGE_KEY = "https://alshaerf.com"
KEYWORDS = [
    "news",
    "article",
    "articles",
    "section",
    "sections",
    "خبر",
    "أخبار",
    "اخبار",
    "مقال",
    "مقالات",
]

if str(VENDOR_DIR) not in sys.path:
    sys.path.insert(0, str(VENDOR_DIR))

from ccl_chromium_reader import ccl_chromium_localstorage as localstorage  # noqa: E402


BROWSER_TARGETS = [
    {
        "browser": "chrome",
        "storage_dir": Path(os.environ.get("LOCALAPPDATA", "")) / "Google" / "Chrome" / "User Data" / "Default" / "Local Storage" / "leveldb",
    },
    {
        "browser": "edge",
        "storage_dir": Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "Edge" / "User Data" / "Default" / "Local Storage" / "leveldb",
    },
]


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def preview(value: str | None, limit: int = 240) -> str | None:
    if value is None:
      return None
    return value[:limit]


def looks_relevant(script_key: str, value: str | None) -> bool:
    source = f"{script_key}\n{value or ''}".lower()
    return any(keyword.lower() in source for keyword in KEYWORDS)


def parse_json(value: str | None):
    if not value:
        return None
    try:
        return json.loads(value)
    except Exception:
        return None


def main() -> None:
    ensure_dir(RECOVERY_DIR)
    output = {
        "generatedAt": datetime.now(UTC).isoformat(),
        "storageKey": STORAGE_KEY,
        "browsers": [],
    }

    for target in BROWSER_TARGETS:
        browser_result: dict[str, object] = {
            "browser": target["browser"],
            "storageDir": str(target["storage_dir"]),
        }

        try:
            db = localstorage.LocalStoreDb(target["storage_dir"])
            try:
                records = list(
                    db.iter_records_for_storage_key(
                        STORAGE_KEY,
                        include_deletions=True,
                        raise_on_no_result=False,
                    )
                )
            finally:
                db.close()
        except Exception as error:
            browser_result["error"] = str(error)
            output["browsers"].append(browser_result)
            continue

        browser_result["recordCount"] = len(records)
        browser_result["allKeys"] = [
            {
                "scriptKey": record.script_key,
                "seq": record.leveldb_seq_number,
                "isLive": record.is_live,
                "valueLength": None if record.value is None else len(record.value),
                "valuePreview": preview(record.value),
            }
            for record in sorted(records, key=lambda item: item.leveldb_seq_number)
        ]

        browser_result["relevantKeys"] = [
            {
                "scriptKey": record.script_key,
                "seq": record.leveldb_seq_number,
                "isLive": record.is_live,
                "valuePreview": preview(record.value),
                "parsedJsonPreview": parse_json(record.value),
            }
            for record in sorted(records, key=lambda item: item.leveldb_seq_number)
            if looks_relevant(record.script_key, record.value)
        ]

        output["browsers"].append(browser_result)

    output_path = RECOVERY_DIR / "alshaer-browser-storage-inspection.json"
    output_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"outputPath": str(output_path)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
