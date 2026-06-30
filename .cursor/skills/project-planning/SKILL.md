---
name: project-planning
description: Plans and answers questions about Beeson N8N work by sourcing issues, tickets, backlog items, specs, and designs from the canonical Jira board and Figma file. Use when the user asks about issues, tickets, bugs, epics, stories, backlog, requirements, specs, designs, mockups, UI, Figma, planning, or implementation scope for Beeson N8N.
---

# Beeson N8N Project Planning

## Canonical sources

Always use these sources for Beeson N8N planning work. Do not substitute Linear, other Jira projects, or other Figma files unless the user explicitly overrides.

### Jira

| Field | Value |
|-------|-------|
| Board | Beeson \| N8N |
| Project key | BN8N |

**Scope every Jira query to this project.** Prefer JQL that includes `project = BN8N`.

Examples:

```jql
project = BN8N AND status != Done ORDER BY updated DESC
project = BN8N AND text ~ "search terms"
project = BN8N AND type = Epic
project = BN8N AND assignee = currentUser()
```

### Figma

| Field | Value |
|-------|-------|
| File | Beeson-N8N |
| URL | https://www.figma.com/design/nU9CgKxHqJmJ21qOJ5i1bR/Beeson-N8N?node-id=0-1 |
| fileKey | `nU9CgKxHqJmJ21qOJ5i1bR` |
| Root nodeId | `0:1` |

**Scope every design query to this file.** Use node-specific URLs when the user references a screen or component; otherwise start from the root node.

---

## When to apply

Apply this skill when the user asks about any of:

- Issues, tickets, bugs, tasks, epics, stories, backlog, sprint, or status
- Requirements, specs, acceptance criteria, or scope
- Designs, mockups, UI, layouts, flows, or Figma
- Planning, prioritization, or "what should we build next"

---

## Workflow

### 1. Classify the request

| Request type | Primary source | Also check |
|--------------|----------------|------------|
| Tickets, bugs, backlog, status | Jira (BN8N) | Figma if UI-related |
| Designs, mockups, UI behavior | Figma (Beeson-N8N) | Jira for linked tickets |
| Feature planning / implementation | Both | — |

### 2. Jira (issues and tickets)

Use the Atlassian MCP server when available.

1. Authenticate with `mcp_auth` if tools fail with an auth error.
2. Resolve `cloudId` via `getAccessibleAtlassianResources` if needed.
3. Search with BN8N scope:
   - Cross-system: `search(cloudId, query="...")` then filter to BN8N results
   - Jira-only: `searchJiraIssuesUsingJql(cloudId, jql="project = BN8N AND ...")`
4. Fetch details with `getJiraIssue(cloudId, issueIdOrKey)` for relevant keys (e.g. `BN8N-123`).

When creating or updating tickets, use project key **BN8N** and link work to the Beeson \| N8N board context.

### 3. Figma (designs)

Use the Figma MCP server when available.

1. Read tool schemas before calling MCP tools.
2. For design context: `get_design_context(fileKey="nU9CgKxHqJmJ21qOJ5i1bR", nodeId="...")`
3. For file structure: `get_metadata(fileKey="nU9CgKxHqJmJ21qOJ5i1bR", nodeId="0:1")`
4. For screenshots: `get_screenshot(fileKey="nU9CgKxHqJmJ21qOJ5i1bR", nodeId="...")`
5. For writes or deep inspection: load the `figma-use` skill before `use_figma`.

Convert URL `node-id=0-1` to nodeId `0:1` (replace `-` with `:`).

### 4. Synthesize

When answering planning questions:

1. State what you found in Jira and/or Figma
2. Cite issue keys (e.g. BN8N-42) and Figma node names/URLs
3. Flag gaps (no ticket, no design, or mismatch between ticket and design)
4. Prefer actionable next steps tied to BN8N tickets and Beeson-N8N frames

---

## Output conventions

- **Jira references:** Always include issue key and summary; link when possible
- **Figma references:** Include the canonical file URL with node-id when referencing a specific frame
- **Cross-reference:** When a ticket mentions UI, check Figma; when a design exists, check for a matching BN8N ticket

---

## MCP unavailable

If Atlassian or Figma MCP is not connected:

1. Tell the user which source could not be queried
2. Ask them to connect the MCP server or paste the relevant ticket/design context
3. Do not guess ticket status or design details from other systems (e.g. Linear)
