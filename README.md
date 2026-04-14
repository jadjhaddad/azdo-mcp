# azdo-mcp

Azure DevOps MCP Server — manage work items across multiple projects via the Model Context Protocol.

## Tools

| Tool | Description |
|------|-------------|
| `list_projects` | List accessible projects (filtered to allowlist) |
| `list_my_tickets` | Work items assigned to you (or any user) across projects |
| `get_ticket` | Fetch full work item by ID |
| `get_ticket_hierarchy` | Fetch Epic→Feature→Story→Task tree for LLM reasoning |
| `search_tickets` | Filter by state, type, tags, text, date range across projects |
| `create_ticket` | Create a new work item |
| `update_ticket` | Update allowlisted fields on an existing item |
| `transition_ticket` | Move a work item to a new state (validated against workflow) |
| `add_ticket_comment` | Add a comment to a work item |
| `delete_ticket` | Delete a work item (feature-gated + confirmation required) |

## Quick start

```bash
cp .env.example .env
# edit .env — set AZDO_ORG_URL, AZDO_TOKEN, AZDO_ALLOWED_PROJECTS

npm install
npm run build
node dist/index.js
```

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AZDO_ORG_URL` | Yes | — | `https://dev.azure.com/your-org` |
| `AZDO_TOKEN` | Yes | — | PAT (`vso.work_write` scope) or Bearer token |
| `AZDO_ALLOWED_PROJECTS` | No | *(all)* | Comma-separated project allowlist |
| `AZDO_DEFAULT_PROJECT` | No | — | Used when caller omits `projects[]` |
| `ENABLE_DELETE` | No | `false` | Set `true` to enable `delete_ticket` |
| `MAX_PAGE_SIZE` | No | `200` | Cap on list/search results per page |
| `LOG_LEVEL` | No | `info` | `trace \| debug \| info \| warn \| error` |

## Authentication

Auth is injected externally — this server never stores or caches tokens.

- **PAT**: set `AZDO_TOKEN=<pat>`. Encoded as `Basic :<pat>` automatically.
- **Bearer**: set `AZDO_TOKEN=Bearer <token>`. Used as-is.
- On `401`, the server returns `AUTH_REQUIRED`. The host layer should inject a fresh token and retry.

## Safety

- Project allowlist: reads and writes restricted to `AZDO_ALLOWED_PROJECTS`.
- Field allowlist: `update_ticket` only accepts a defined set of fields.
- Delete triple-gate: `ENABLE_DELETE=true` + correct confirmation token (`DELETE-<id>`) + `hardDelete` permanently blocked.
- Audit log: every write/delete action logged to stderr with actor, action, target, status.
- Secret redaction: tokens never appear in logs.

## Multi-project queries

`list_my_tickets` and `search_tickets` fan out queries across all specified projects in parallel. Partial failures return per-project errors alongside successful results rather than aborting.

## Hierarchy tool

`get_ticket_hierarchy` fetches the full work item tree rooted at an Epic or Feature, up to `maxDepth` levels (default 4: Epic→Feature→Story→Task). Returns a JSON tree suitable for passing to an LLM for scope analysis or estimation.

## Development

```bash
npm test          # unit tests (no credentials needed)
npm run lint      # TypeScript type-check
```

Integration tests require `AZDO_INTEGRATION_TEST=true` plus valid credentials pointed at a sandbox project.
