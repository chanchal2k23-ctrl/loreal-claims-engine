import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api.js";

// Fallback components if VerdictBadge/ScoreRing aren't separate files yet
function VerdictBadge({ value }) {
  const safeValue = value || "Submitted";
  return (
    <span className={`badge badge-${safeValue.toLowerCase()}`}>
      {safeValue}
    </span>
  );
}

function ScoreRing({ score }) {
  return (
    <div className="score-ring">
      <span className="score-number">{score}</span>
      <span className="score-label">/ 100</span>
    </div>
  );
}

const SAMPLE_STUDY =
  "Randomized, double-blind, placebo-controlled study. n=72 female subjects aged 30-55 over 8 weeks. " +
  "Dark spot intensity measured by chromametry. Mean reduction of 16% vs 4% for placebo (p<0.02).";

const STATUS_ICON = { pass: "✓", partial: "~", fail: "✕", na: "–" };

export default function ClaimDetail() {
  const { id } = useParams();
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [studyText, setStudyText] = useState("");
  const [evaluator, setEvaluator] = useState("Clinical Evaluator");
  const [running, setRunning] = useState(false);

  function load() {
    setLoading(true);
    api
      .getClaim(id)
      .then(setClaim)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  async function runEvaluation(e) {
    e.preventDefault();
    setRunning(true);
    setError(null);
    try {
      const updated = await api.evaluate(id, {
        study_text: studyText,
        evaluator,
      });
      setClaim(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }

  if (loading) return <div className="loading">Loading claim details…</div>;
  if (error && !claim) return <div className="error-box">{error}</div>;
  if (!claim) return <div className="empty">Claim not found.</div>;

  const evalResult = claim.evaluation;

  return (
    <div className="claim-detail">
      <Link to="/" className="back-link">
        ← Back to dashboard
      </Link>

      <div className="detail-head">
        <div>
          <span className="pill">{claim.category}</span>
          <h1>{claim.product_name}</h1>
          <p className="claim-quote big">“{claim.claim_text}”</p>
          <div className="meta-row">
            <span>{claim.claim_type}</span>
            <span>·</span>
            <span>{claim.scientist}</span>
          </div>
        </div>
        <VerdictBadge value={evalResult ? evalResult.verdict : "Submitted"} />
      </div>

      {claim.formula && (
        <div className="panel">
          <h4>Proposed formula</h4>
          <p className="mono">{claim.formula}</p>
        </div>
      )}

      {!evalResult ? (
        <form className="panel" onSubmit={runEvaluation}>
          <h4>Evaluation — attach clinical study</h4>
          <p className="muted">
            Role: Clinical Evaluator. Paste the study summary; the LLM will
            assess whether it substantiates the claim.
          </p>
          {error && <div className="error-box">{error}</div>}
          <label className="field">
            <span>Evaluator</span>
            <input
              value={evaluator}
              onChange={(e) => setEvaluator(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Clinical study summary *</span>
            <textarea
              rows={6}
              value={studyText}
              onChange={(e) => setStudyText(e.target.value)}
              required
              placeholder="Design, sample size (n=), duration, measured effect (%), p-value…"
            />
          </label>
          <div className="form-actions between">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setStudyText(SAMPLE_STUDY)}
            >
              Insert sample study
            </button>
            <button className="btn btn-primary" disabled={running}>
              {running ? "Assessing…" : "Run LLM assessment"}
            </button>
          </div>
        </form>
      ) : (
        <Assessment
          evalResult={evalResult}
          onReassess={() => setClaim({ ...claim, evaluation: null })}
        />
      )}
    </div>
  );
}
function Assessment({ evalResult, onReassess }) {
  return (
    <div className="panel assessment-simple">
      <div className="assessment-header">
        <div className="score-badge">
          Score: <strong>{evalResult.score}/100</strong>
        </div>
        <VerdictBadge value={evalResult.verdict} />
      </div>

      <div className="assessment-section">
        <h4>LLM Reasoning</h4>
        <p className="reasoning">{evalResult.reasoning}</p>
      </div>

      {evalResult.study_text && (
        <div className="assessment-section">
          <h4>Evaluated Study</h4>
          <p className="mono">{evalResult.study_text}</p>
        </div>
      )}

      <div className="assessment-footer">
        <span className="muted small">
          Evaluated by {evalResult.evaluator || "Clinical Evaluator"}
        </span>
        <button className="btn-ghost" onClick={onReassess}>
          Re-evaluate
        </button>
      </div>
    </div>
  );
}

// function Assessment({ evalResult, onReassess }) {
//   return (
//     <div className="assessment">
//       <div className="assessment-summary panel">
//         <ScoreRing score={evalResult.score} />
//         <div className="assessment-summary-body">
//           <div className="assessment-verdict-row">
//             <VerdictBadge value={evalResult.verdict} />
//             <span className="muted small">
//               Confidence {Math.round((evalResult.confidence || 0.85) * 100)}% ·{" "}
//               {evalResult.model || "Groq LLM"}
//             </span>
//           </div>
//           <p className="reasoning">{evalResult.reasoning}</p>
//           <button className="btn btn-ghost small-btn" onClick={onReassess}>
//             Re-evaluate with new study
//           </button>
//         </div>
//       </div>

//       {evalResult.criteria && evalResult.criteria.length > 0 && (
//         <div className="panel">
//           <h4>Assessment criteria</h4>
//           <ul className="criteria">
//             {evalResult.criteria.map((c) => (
//               <li
//                 key={c.key || c.label}
//                 className={`criterion criterion-${c.status}`}
//               >
//                 <span className="criterion-icon">
//                   {STATUS_ICON[c.status] || "–"}
//                 </span>
//                 <div className="criterion-body">
//                   <div className="criterion-head">
//                     <strong>{c.label}</strong>
//                     <span className="criterion-weight">{c.weight} pts</span>
//                   </div>
//                   <p>{c.detail}</p>
//                 </div>
//               </li>
//             ))}
//           </ul>
//         </div>
//       )}

//       <div className="panel">
//         <h4>Submitted study</h4>
//         <p className="mono study-text">{evalResult.study_text}</p>
//         <p className="muted small">
//           Evaluated by {evalResult.evaluator || "Clinical Evaluator"} ·{" "}
//           {evalResult.created_at || "Just now"}
//         </p>
//       </div>
//     </div>
//   );
// }
