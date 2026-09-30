import 'dotenv/config';

function parseIntEnv(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  port: parseIntEnv(process.env.PORT, 3001),
  githubToken: process.env.GITHUB_TOKEN || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  // Limits that keep GitHub crawling and LLM prompt size bounded.
  maxFilesToFetch: parseIntEnv(process.env.MAX_FILES_TO_FETCH, 40),
  maxFileBytes: parseIntEnv(process.env.MAX_FILE_BYTES, 20000),
  maxTotalPromptBytes: parseIntEnv(process.env.MAX_TOTAL_PROMPT_BYTES, 120000),
};
