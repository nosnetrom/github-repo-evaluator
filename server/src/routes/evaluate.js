import { Router } from 'express';
import { parseRepoUrl, InvalidRepoUrlError } from '../utils/parseRepoUrl.js';
import { getRepoMetadata, resolveRef, getFileTree, getFileContent, GitHubApiError } from '../services/githubClient.js';
import { selectFilesForAnalysis } from '../services/fileSelector.js';
import { analyzeRepository, AnalysisError } from '../services/analyzer.js';

export const evaluateRouter = Router();

evaluateRouter.post('/evaluate', async (req, res) => {
  const { repoUrl } = req.body || {};

  try {
    const { owner, repo, ref: requestedRef } = parseRepoUrl(repoUrl);

    const metadata = await getRepoMetadata(owner, repo);
    const ref = await resolveRef(owner, repo, requestedRef, metadata.default_branch);
    const tree = await getFileTree(owner, repo, ref);

    if (tree.length === 0) {
      return res.status(404).json({ error: 'The repository appears to be empty.' });
    }

    const selectedEntries = selectFilesForAnalysis(tree);
    if (selectedEntries.length === 0) {
      return res.status(422).json({
        error: 'No analyzable text files were found in this repository (it may be binary-only or too large to sample).',
      });
    }

    const files = await Promise.all(
      selectedEntries.map(async (entry) => ({
        path: entry.path,
        content: await getFileContent(owner, repo, entry.path, ref),
      }))
    );

    const report = await analyzeRepository({
      metadata: {
        owner,
        repo,
        ref,
        description: metadata.description,
        language: metadata.language,
        stars: metadata.stargazers_count,
      },
      files: files.filter((f) => f.content),
    });

    res.json({
      repository: { owner, repo, ref, htmlUrl: metadata.html_url },
      filesAnalyzed: files.map((f) => f.path),
      report,
    });
  } catch (err) {
    if (err instanceof InvalidRepoUrlError || err instanceof GitHubApiError || err instanceof AnalysisError) {
      return res.status(err.statusCode || 500).json({ error: err.message });
    }
    console.error('Unexpected error during evaluation:', err);
    res.status(500).json({ error: 'An unexpected error occurred while evaluating the repository.' });
  }
});
