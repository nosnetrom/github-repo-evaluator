import { ScoreBadge } from './ScoreBadge.jsx';
import { CategoryCard } from './CategoryCard.jsx';

export function ReportView({ result }) {
  const { repository, filesAnalyzed, report } = result;

  return (
    <div className="report">
      <div className="report-header">
        <div>
          <h2>
            <a href={repository.htmlUrl} target="_blank" rel="noreferrer">
              {repository.owner}/{repository.repo}
            </a>
          </h2>
          <p className="muted">
            Branch/ref analyzed: <code>{repository.ref}</code> &middot; {filesAnalyzed.length} files sampled
          </p>
        </div>
        <div className="overall-score">
          <span className="muted">Overall score</span>
          <ScoreBadge score={report.overallScore} />
        </div>
      </div>

      {report.summary ? <p className="summary">{report.summary}</p> : null}

      <div className="category-grid">
        {(report.categories || []).map((category) => (
          <CategoryCard key={category.name} category={category} />
        ))}
      </div>

      <div className="two-column">
        {report.strengths?.length ? (
          <div>
            <h3>Strengths</h3>
            <ul>
              {report.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {report.recommendations?.length ? (
          <div>
            <h3>Recommendations</h3>
            <ul>
              {report.recommendations.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <details className="files-sampled">
        <summary>Files sampled for this evaluation ({filesAnalyzed.length})</summary>
        <ul>
          {filesAnalyzed.map((f) => (
            <li key={f}>
              <code>{f}</code>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
