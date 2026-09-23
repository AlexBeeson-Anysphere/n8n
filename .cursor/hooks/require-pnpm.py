#!/usr/bin/env python3
"""Block npm and yarn. n8n installs and scripts go through pnpm."""

import json
import re
import sys

# npm/yarn as the executable. The 'npm' inside 'pnpm' does not match.
PACKAGE_MANAGER = re.compile(r"(?:^|(?:&&|\|\||[;&|`(\n]))\s*(?:npm|yarn)(?:\s|$)")


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
    if PACKAGE_MANAGER.search(command):
        emit(
            {
                "permission": "deny",
                "user_message": "n8n uses pnpm. npm and yarn were blocked.",
                "agent_message": "Use pnpm instead of npm or yarn. Examples: pnpm install, pnpm --filter <package> test.",
            }
        )
        return

    emit({"permission": "allow"})


if __name__ == "__main__":
    main()
