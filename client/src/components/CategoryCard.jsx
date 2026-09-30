import { ScoreBadge } from './ScoreBadge.jsx';

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

export function CategoryCard({ category }) {
  const findings = [...(category.findings || [])].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4)
  );

  return (
    <div className="category-card">
      <div className="category-header">
        <h3>{category.name}</h3>
        <ScoreBadge score={category.score} />
      </div>
      {findings.length === 0 ? (
        <p className="muted">No notable findings.</p>
      ) : (
        <ul className="findings-list">
          {findings.map((finding, idx) => (
            <li key={idx} className={`finding severity-${finding.severity || 'low'}`}>
              <span className="severity-tag">{finding.severity || 'info'}</span>
              {finding.file ? <code className="finding-file">{finding.file}</code> : null}
              <span>{finding.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
