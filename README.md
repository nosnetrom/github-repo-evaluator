# GitHub Repo Evaluator

A web application that evaluates a public GitHub repository for **code quality**, **security**, and **best coding
practices**. Paste in a repository URL, and the app crawls the repo, samples a representative set of files, and
asks an LLM (OpenAI) to produce a structured evaluation report with scores, findings, strengths, and
recommendations.

## Architecture

- **`server/`** — Node.js/Express API.
  - Parses the submitted GitHub URL.
  - Crawls the repository via the GitHub REST API (repo metadata, file tree, file contents).
  - Selects a bounded, representative subset of files (README, manifests, CI/config files, source files) within
    size limits so the LLM prompt stays manageable.
  - Sends the collected context to OpenAI and returns a structured JSON evaluation report.
  - Stateless: no database, no stored history (each request is evaluated fresh).
- **`client/`** — React (Vite) single-page app.
  - Form to submit a GitHub repository URL.
  - Renders the resulting report: overall score, per-category scores (Code Quality, Security, Best Practices),
    findings with severity, strengths, and recommendations.

## Prerequisites

- Node.js 18+
- An [OpenAI API key](https://platform.openai.com/api-keys)
- (Optional) A GitHub personal access token, to raise the GitHub API's unauthenticated rate limit (60 req/hr) and
  to evaluate private repositories you have access to.

## Setup

```powershell
# From the repo root
npm run install:all

# Configure the server
Copy-Item server\.env.example server\.env
# then edit server\.env and set OPENAI_API_KEY (and optionally GITHUB_TOKEN)
```

## Running locally

```powershell
# Runs the API (http://localhost:3001) and the client (http://localhost:5173) together
npm run dev
```

Then open http://localhost:5173 and submit a GitHub repository URL, e.g. `https://github.com/expressjs/express`.

To run them separately:

```powershell
npm run dev:server   # API only
npm run dev:client   # React app only
```

## Configuration

All server configuration lives in `server/.env` (see `server/.env.example`):

| Variable | Description | Default |
|---|---|---|
| `PORT` | Port the API listens on | `3001` |
| `OPENAI_API_KEY` | **Required.** API key used to call OpenAI | — |
| `OPENAI_MODEL` | Chat model used for analysis | `gpt-4o-mini` |
| `GITHUB_TOKEN` | Optional GitHub token for higher rate limits / private repos | — |
| `CORS_ORIGIN` | Comma-separated list of allowed frontend origins | `http://localhost:5173` |
| `MAX_FILES_TO_FETCH` | Max number of files sampled per repo | `40` |
| `MAX_FILE_BYTES` | Max size of an individual sampled file | `20000` |
| `MAX_TOTAL_PROMPT_BYTES` | Max combined size of all sampled files | `120000` |

## API

### `POST /api/evaluate`

Request body:

```json
{ "repoUrl": "https://github.com/owner/repo" }
```

Response:

```json
{
  "repository": { "owner": "owner", "repo": "repo", "ref": "<sha>", "htmlUrl": "..." },
  "filesAnalyzed": ["README.md", "package.json", "..."],
  "report": {
    "overallScore": 78,
    "summary": "...",
    "categories": [
      { "name": "Code Quality", "score": 80, "findings": [{ "severity": "medium", "file": "src/x.js", "description": "..." }] },
      { "name": "Security", "score": 70, "findings": [] },
      { "name": "Best Practices", "score": 85, "findings": [] }
    ],
    "strengths": ["..."],
    "recommendations": ["..."]
  }
}
```

## Troubleshooting

- **`fetch failed: unable to get local issuer certificate`** when calling the GitHub or OpenAI APIs: this happens
  on networks with TLS-inspecting proxies (common on corporate machines) where Node's bundled CA store doesn't
  trust the proxy's root certificate. The server's `start`/`dev` scripts run Node with `--use-system-ca` (Node
  22+) so it trusts the same certificates as the OS. If you're on Node < 22, upgrade Node, or remove that flag
  from `server/package.json` and instead set `NODE_EXTRA_CA_CERTS` to your organization's root CA file.

## Limitations

- Only public GitHub repositories are supported out of the box (a `GITHUB_TOKEN` with access is required for
  private repos).
- Very large repositories are sampled, not fully analyzed — the report is only as good as the representative
  files selected.
- Results are not persisted; refresh the page or re-submit to re-evaluate.
