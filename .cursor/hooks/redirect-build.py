#!/usr/bin/env python3
"""Require a redirect on pnpm/turbo build so Turbo logs stay in a file."""

import json
import re
import sys

# Bare `build` task only. `build:docker` and `build:affected` do not match.
BUILD_TASK = re.compile(
    r"(?:^|(?:&&|\|\||[;&|`(\n]))\s*(?:pnpm|turbo)\b[^\n;&|`]*?\sbuild(?![:\w-])"
)


def emit(payload: dict) -> None:
    json.dump(payload, sys.stdout)
    sys.stdout.write("\n")


def main() -> None:
    try:
        data = json.load(sys.stdin)
    except Exception:
        emit({"permission": "allow"})
        return

    command = data.get("command") or ""
    if not BUILD_TASK.search(command):
        emit({"permission": "allow"})
        return

    if ">" in command or re.search(r"\btee\b", command):
        emit({"permission": "allow"})
        return

    emit(
        {
            "permission": "deny",
            "user_message": "Build output has to be redirected so the log does not flood the session.",
            "agent_message": "Re-run the build with output redirected, then read the tail. Example: pnpm build > build.log 2>&1 && tail -n 20 build.log",
        }
    )


if __name__ == "__main__":
    main()
