import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

function VerdictBadge({ value }) {
  const safeValue = value || "Submitted";
  return (
    <span className={`badge badge-${safeValue.toLowerCase()}`}>
      {safeValue}
    </span>
  );
}

export default function Dashboard() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .listClaims()
      .then((data) => setClaims(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const evaluated = claims.filter((c) => c && c.evaluation);
  const substantiated = evaluated.filter(
    (c) => c.evaluation && c.evaluation.verdict === "Substantiated"
  ).length;
  const pending = claims.length - evaluated.length;

  if (loading) return <div className="loading">Loading submissions…</div>;
  if (error) return <div className="error-box">Failed to load: {error}</div>;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>Claim Submissions</h1>
          <p className="muted">
            Scientists submit product formulas and claims; evaluators attach
            clinical studies and the engine assesses substantiation.
          </p>
        </div>
        <Link to="/new" className="btn-primary">
          + New Submission
        </Link>
      </div>

      <div className="stats">
        <Stat label="Total Submissions" value={claims.length} />
        <Stat label="Awaiting Evaluation" value={pending} tone="pending" />
        <Stat label="Evaluated" value={evaluated.length} />
        <Stat label="Substantiated" value={substantiated} tone="ok" />
      </div>

      {claims.length === 0 ? (
        <div className="empty">No submissions yet. Create the first one.</div>
      ) : (
        <div className="card-grid">
          {claims.map((c) => (
            <Link key={c.id} to={`/claims/${c.id}`} className="claim-card">
              <div className="claim-card-top">
                <span className="pill">{c.category}</span>
                <VerdictBadge
                  value={c.evaluation ? c.evaluation.verdict : "Submitted"}
                />
              </div>
              <h3>{c.product_name}</h3>
              <p className="claim-quote">“{c.claim_text}”</p>
              <div className="claim-card-foot">
                <span className="muted small">{c.claim_type}</span>
                {c.evaluation && (
                  <span className="score-chip">
                    Score {c.evaluation.score}/100
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className={`stat stat-${tone || "default"}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
