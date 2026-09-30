import OpenAI from 'openai';
import { config } from '../config.js';

export class AnalysisError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = 'AnalysisError';
    this.statusCode = statusCode;
  }
}

let client = null;
function getClient() {
  if (!config.openaiApiKey) {
    throw new AnalysisError(
      'The server is missing an OPENAI_API_KEY. Set it in server/.env before requesting an evaluation.',
      500
    );
  }
  if (!client) {
    client = new OpenAI({ apiKey: config.openaiApiKey });
  }
  return client;
}

const RESPONSE_SCHEMA_DESCRIPTION = `
Respond ONLY with a single JSON object matching exactly this shape (no markdown fences, no commentary):
{
  "overallScore": <integer 0-100>,
  "summary": "<2-4 sentence executive summary>",
  "categories": [
    {
      "name": "Code Quality",
      "score": <integer 0-100>,
      "findings": [
        { "severity": "low"|"medium"|"high"|"critical", "file": "<path or ''>", "description": "<finding>" }
      ]
    },
    {
      "name": "Security",
      "score": <integer 0-100>,
      "findings": [ { "severity": "low"|"medium"|"high"|"critical", "file": "<path or ''>", "description": "<finding>" } ]
    },
    {
      "name": "Best Practices",
      "score": <integer 0-100>,
      "findings": [ { "severity": "low"|"medium"|"high"|"critical", "file": "<path or ''>", "description": "<finding>" } ]
    }
  ],
  "strengths": ["<notable strength>"],
  "recommendations": ["<concrete, actionable recommendation>"]
}`;

function buildPrompt({ metadata, files }) {
  const fileSections = files
    .map((f) => `--- FILE: ${f.path} ---\n${f.content}`)
    .join('\n\n');

  return `You are a senior software engineer performing a code review of a GitHub repository.

Repository: ${metadata.owner}/${metadata.repo}
Description: ${metadata.description || 'N/A'}
Primary language: ${metadata.language || 'N/A'}
Stars: ${metadata.stars ?? 'N/A'}
Default branch analyzed: ${metadata.ref}

Below is a representative sample of files from the repository (not necessarily all files; large/binary/generated files were excluded).

${fileSections}

Evaluate the repository across three categories: Code Quality, Security, and Best Practices.
Be specific and cite file paths when possible. Only report issues you can support from the provided files;
do not invent files or line numbers you cannot see. If the sample is too limited to assess a category confidently,
say so in that category's findings rather than guessing.

${RESPONSE_SCHEMA_DESCRIPTION}`;
}

/** Sends the collected repository context to the LLM and returns a parsed evaluation report. */
export async function analyzeRepository({ metadata, files }) {
  const openai = getClient();
  const prompt = buildPrompt({ metadata, files });

  let completion;
  try {
    completion = await openai.chat.completions.create({
      model: config.openaiModel,
      messages: [
        {
          role: 'system',
          content:
            'You are a meticulous code reviewer. You always respond with strict, valid JSON matching the requested schema.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });
  } catch (err) {
    throw new AnalysisError(`Failed to reach the LLM provider: ${err.message}`);
  }

  const raw = completion.choices?.[0]?.message?.content;
  if (!raw) {
    throw new AnalysisError('The LLM returned an empty response.');
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AnalysisError('The LLM returned a response that was not valid JSON.');
  }

  return parsed;
}
