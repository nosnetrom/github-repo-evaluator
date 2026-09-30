import { config } from '../config.js';

const IGNORED_PATH_SEGMENTS = [
  'node_modules/',
  'vendor/',
  'dist/',
  'build/',
  'out/',
  '.git/',
  'coverage/',
  '.next/',
  '.venv/',
  '__pycache__/',
  'target/',
];

const IGNORED_SUFFIXES = [
  '.min.js',
  '.min.css',
  '.map',
  '.lock',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.pdf',
  '.zip',
  '.gz',
  '.exe',
  '.dll',
  '.so',
  '.bin',
];

const HIGH_PRIORITY_FILENAMES = [
  'readme.md',
  'package.json',
  'requirements.txt',
  'pyproject.toml',
  'pipfile',
  'pom.xml',
  'build.gradle',
  'gemfile',
  'go.mod',
  'composer.json',
  'cargo.toml',
  'dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  '.eslintrc.js',
  '.eslintrc.json',
  '.eslintrc',
  '.prettierrc',
  'tsconfig.json',
  'security.md',
  '.env.example',
];

const HIGH_PRIORITY_PATH_HINTS = ['.github/workflows/', '.gitlab-ci.yml', '.circleci/config.yml'];

const SOURCE_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.py',
  '.go',
  '.java',
  '.kt',
  '.rb',
  '.php',
  '.cs',
  '.cpp',
  '.cc',
  '.c',
  '.h',
  '.hpp',
  '.rs',
  '.swift',
  '.scala',
  '.vue',
  '.svelte',
]);

function isIgnored(path) {
  const lower = path.toLowerCase();
  if (IGNORED_PATH_SEGMENTS.some((segment) => lower.includes(segment))) return true;
  if (IGNORED_SUFFIXES.some((suffix) => lower.endsWith(suffix))) return true;
  return false;
}

function priorityScore(entry) {
  const lower = entry.path.toLowerCase();
  const base = lower.split('/').pop();
  if (HIGH_PRIORITY_FILENAMES.includes(base)) return 3;
  if (HIGH_PRIORITY_PATH_HINTS.some((hint) => lower.includes(hint))) return 2;
  const ext = base.includes('.') ? `.${base.split('.').pop()}` : '';
  if (SOURCE_EXTENSIONS.has(ext)) return 1;
  return 0;
}

/**
 * Selects a bounded, representative subset of files from a repository tree to
 * send to the LLM: config/docs/CI files first, then source files, capped by
 * both file count and total byte size so prompts stay within budget.
 */
export function selectFilesForAnalysis(treeEntries) {
  const candidates = treeEntries
    .filter((entry) => !isIgnored(entry.path))
    .filter((entry) => typeof entry.size === 'number' && entry.size > 0 && entry.size <= config.maxFileBytes)
    .map((entry) => ({ ...entry, score: priorityScore(entry) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.size - b.size);

  const selected = [];
  let totalBytes = 0;
  for (const entry of candidates) {
    if (selected.length >= config.maxFilesToFetch) break;
    if (totalBytes + entry.size > config.maxTotalPromptBytes) continue;
    selected.push(entry);
    totalBytes += entry.size;
  }
  return selected;
}
