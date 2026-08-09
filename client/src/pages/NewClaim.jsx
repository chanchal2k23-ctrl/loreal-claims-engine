import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

const EXAMPLE = {
  product_name: "Age Perfect Cell Renew Cream",
  category: "Skincare",
  claim_type: "Efficacy",
  claim_text: "Firms skin and reduces dark spots by 15% in 8 weeks",
  scientist: "Paris R&I",
  formula: "Pro-Xylane 3%, LHA, niacinamide, glycerin",
};

export default function NewClaim() {
  const navigate = useNavigate();
  const [meta, setMeta] = useState({
    categories: [],
    claimTypes: [],
  });
  const [form, setForm] = useState({
    product_name: "",
    category: "Skincare",
    claim_type: "Efficacy",
    claim_text: "",
    scientist: "Paris R&I",
    formula: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .meta()
      .then(setMeta)
      .catch(() => {});
  }, []);

  const update = (name) => (e) =>
    setForm((form) => ({ ...form, [name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createClaim(form);
      navigate(`/claims/${created.id}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="narrow">
      <div className="page-head">
        <div>
          <h1>New Submission</h1>
          <p className="muted">
            Role: R&I Scientist — propose a product formula and the claim it
            should support.
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setForm(EXAMPLE)}
        >
          Fill example
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      <form className="form-card" onSubmit={onSubmit}>
        <label className="field">
          <span>Product name *</span>
          <input
            value={form.product_name}
            onChange={update("product_name")}
            required
            placeholder="e.g. Revitalift Night Serum"
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Category</span>
            <select value={form.category} onChange={update("category")}>
              {meta.categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Claim type</span>
            <select value={form.claim_type} onChange={update("claim_type")}>
              {meta.claimTypes.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>Claim *</span>
          <input
            value={form.claim_text}
            onChange={update("claim_text")}
            required
            placeholder="e.g. Reduces wrinkles by 20% in 4 weeks"
          />
          <small className="muted">
            Include a measurable magnitude and timeframe where possible.
          </small>
        </label>

        <label className="field">
          <span>Proposed formula</span>
          <textarea
            rows={3}
            value={form.formula}
            onChange={update("formula")}
            placeholder="Key actives and concentrations…"
          />
        </label>

        <label className="field">
          <span>Scientist</span>
          <input value={form.scientist} onChange={update("scientist")} />
        </label>

        <div className="form-actions">
          <button className="btn btn-primary" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit for evaluation"}
          </button>
        </div>
      </form>
    </div>
  );
}
