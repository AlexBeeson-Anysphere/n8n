---
name: public-security-fix
description: Writes security fixes for this public n8n repo so branch names, commits, tests, comments, and PR text do not describe the attack. Use when fixing a vulnerability, security bug, CVE, or hardening an attack path.
---

# Public security fixes

This repository is public. Describe the behavior the code now has. Do not name the attack, the vector, or the impact an attacker would get.

## Names and text

| Artifact | Write | Avoid |
|----------|-------|-------|
| Branch | `node-1234-improve-request-handling` | A Linear branch name that names the bug class |
| Commit | `fix: add payload size validation` | A message that names the attack |
| Test title | `should sanitize query parameters` | A title that names the attack |
| Comment | Why a limit or check exists in product terms | A walkthrough of how to trigger the bug |
| PR / Linear link | `https://linear.app/n8n/issue/N8N-1234` | A Linear URL whose slug names the bug |

Do not invent a Linear ticket. If one exists, link the id only.

## Before publishing

Check the diff, commit messages, test names, and comments for:

- Bug-class words (injection, traversal, overflow, forgery, escalation, and similar)
- Payload shapes, magic parameters, or step-by-step triggers
- Linear or GitHub slugs that name the issue

Rename or reword anything that would teach the issue from the public diff.

## Code

Fix the behavior with the smallest change that matches surrounding code. Tests should lock the safe behavior (rejected input, bounded size, escaped output) without documenting an exploit.
