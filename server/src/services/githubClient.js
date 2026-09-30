import { config } from '../config.js';

const GITHUB_API = 'https://api.github.com';

export class GitHubApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'GitHubApiError';
    this.statusCode = statusCode;
  }
}

function authHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'github-repo-evaluator',
  };
  if (config.githubToken) {
    headers.Authorization = `Bearer ${config.githubToken}`;
  }
  return headers;
}

async function githubFetch(path) {
  const response = await fetch(`${GITHUB_API}${path}`, { headers: authHeaders() });

  if (response.status === 404) {
    throw new GitHubApiError('Repository, branch, or resource not found. It may be private or the URL may be incorrect.', 404);
  }
  if (response.status === 403 || response.status === 429) {
    const remaining = response.headers.get('x-ratelimit-remaining');
    if (remaining === '0') {
      throw new GitHubApiError(
        'GitHub API rate limit exceeded. Set a GITHUB_TOKEN on the server to raise the limit and try again shortly.',
        429
      );
    }
    throw new GitHubApiError('Access to this repository was forbidden by GitHub.', 403);
  }
  if (!response.ok) {
    throw new GitHubApiError(`GitHub API request failed (${response.status}).`, response.status);
  }
  return response.json();
}

/** Fetches top-level repository metadata (description, language, stars, etc.). */
export async function getRepoMetadata(owner, repo) {
  return githubFetch(`/repos/${owner}/${repo}`);
}

/** Resolves a ref (branch/tag/sha) to a commit SHA, defaulting to the repo's default branch. */
export async function resolveRef(owner, repo, ref, defaultBranch) {
  const branch = ref || defaultBranch;
  const data = await githubFetch(`/repos/${owner}/${repo}/commits/${encodeURIComponent(branch)}`);
  return data.sha;
}

/** Recursively fetches the full file tree for a commit SHA. */
export async function getFileTree(owner, repo, sha) {
  const data = await githubFetch(`/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`);
  if (data.truncated) {
    // Repository is very large; we still work with the (large) partial tree GitHub returns.
    console.warn(`Tree for ${owner}/${repo} was truncated by the GitHub API.`);
  }
  return (data.tree || []).filter((entry) => entry.type === 'blob');
}

/** Fetches and decodes the text content of a single file via the contents API. */
export async function getFileContent(owner, repo, path, ref) {
  const data = await githubFetch(
    `/repos/${owner}/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(ref)}`
  );
  if (Array.isArray(data) || !data.content) {
    return '';
  }
  return Buffer.from(data.content, data.encoding || 'base64').toString('utf-8');
}
