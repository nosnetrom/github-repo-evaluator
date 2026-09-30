import { useState } from 'react';
import { ReportView } from './components/ReportView.jsx';
import './App.css';

export default function App() {
  const [repoUrl, setRepoUrl] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | error | success
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    setStatus('loading');
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: repoUrl.trim() }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Something went wrong evaluating this repository.');
        setStatus('error');
        return;
      }

      setResult(data);
      setStatus('success');
    } catch {
      setError('Could not reach the evaluation server. Is it running?');
      setStatus('error');
    }
  }

  return (
    <div className="app">
      <header>
        <h1>GitHub Repo Evaluator</h1>
        <p className="muted">
          Enter a public GitHub repository URL to get an AI-generated report on its code quality, security, and
          adherence to best practices.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="repo-form">
        <input
          type="text"
          placeholder="https://github.com/owner/repo"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          disabled={status === 'loading'}
        />
        <button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Evaluating…' : 'Evaluate'}
        </button>
      </form>

      {status === 'loading' ? (
        <p className="muted">Crawling the repository and asking the LLM for a review, this can take a moment…</p>
      ) : null}

      {status === 'error' ? <p className="error-message">{error}</p> : null}

      {status === 'success' && result ? <ReportView result={result} /> : null}
    </div>
  );
}
