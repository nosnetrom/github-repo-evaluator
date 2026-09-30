/**
 * Parses a GitHub repository URL (or "owner/repo" shorthand) into its
 * owner, repo name, and optional ref (branch/tag/commit).
 *
 * Accepted forms include:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo.git
 *   https://github.com/owner/repo/tree/branch-name
 *   git@github.com:owner/repo.git
 *   owner/repo
 */
export function parseRepoUrl(input) {
  if (!input || typeof input !== 'string') {
    throw new InvalidRepoUrlError('Repository URL is required.');
  }

  const trimmed = input.trim();

  // owner/repo shorthand
  const shorthandMatch = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (shorthandMatch) {
    return {
      owner: shorthandMatch[1],
      repo: stripGitSuffix(shorthandMatch[2]),
      ref: null,
    };
  }

  // git@github.com:owner/repo.git
  const sshMatch = trimmed.match(/^git@github\.com:([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2], ref: null };
  }

  let url;
  try {
    url = new URL(trimmed);
  } catch {
    throw new InvalidRepoUrlError(`"${input}" is not a valid GitHub repository URL.`);
  }

  if (!/(^|\.)github\.com$/.test(url.hostname)) {
    throw new InvalidRepoUrlError('Only github.com repository URLs are supported.');
  }

  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length < 2) {
    throw new InvalidRepoUrlError('URL must include an owner and repository name.');
  }

  const [owner, rawRepo, treeKeyword, ...refParts] = segments;
  const repo = stripGitSuffix(rawRepo);
  let ref = null;
  if (treeKeyword === 'tree' && refParts.length > 0) {
    ref = decodeURIComponent(refParts.join('/'));
  }

  return { owner, repo, ref };
}

function stripGitSuffix(repo) {
  return repo.endsWith('.git') ? repo.slice(0, -4) : repo;
}

export class InvalidRepoUrlError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidRepoUrlError';
    this.statusCode = 400;
  }
}
