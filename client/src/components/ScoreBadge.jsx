function scoreClass(score) {
  if (score >= 80) return 'score-badge score-good';
  if (score >= 50) return 'score-badge score-warn';
  return 'score-badge score-bad';
}

export function ScoreBadge({ score }) {
  const value = typeof score === 'number' ? score : '?';
  return <span className={scoreClass(typeof score === 'number' ? score : 0)}>{value}</span>;
}
