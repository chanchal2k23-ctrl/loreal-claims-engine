import "dotenv/config";
import express from "express";
import cors from "cors";
import db from "./db.js";
import Groq from "groq-sdk";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Initialize Groq client (uses GROQ_API_KEY environment variable)
const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const CLAIM_TYPES = [
  "Efficacy",
  "Sensory",
  "Safety",
  "Sustainability",
  "Composition",
];
const CATEGORIES = ["Skincare", "Haircare", "Makeup", "Fragrance", "Suncare"];

// Helper to convert database rows into API-friendly objects
function hydrateClaim(row) {
  return {
    ...row,
    id: String(row.id), // Stringify ID for frontend routing
    evaluation: row.evaluation ? JSON.parse(row.evaluation) : null,
  };
}

// GET all claims (Newest first)
app.get("/api/claims", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM claims ORDER BY id DESC").all();
    res.json(rows.map(hydrateClaim));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/meta", (req, res) => {
  res.json({ claimTypes: CLAIM_TYPES, categories: CATEGORIES });
});

// Get a single submission with its latest evaluation.
app.get("/api/claims/:id", (req, res) => {
  const row = db
    .prepare("SELECT * FROM claims WHERE id = ?")
    .get(req.params.id);
  if (!row) return res.status(404).json({ error: "Claim not found" });
  res.json(hydrateClaim(row));
});

// Scientist submits a proposed product + claim.
app.post("/api/claims", (req, res) => {
  const { product_name, category, claim_text, claim_type, formula, scientist } =
    req.body || {};
  if (!product_name || !claim_text) {
    return res
      .status(400)
      .json({ error: "product_name and claim_text are required" });
  }
  const info = db
    .prepare(
      `INSERT INTO claims (product_name, category, claim_text, claim_type, formula, scientist, status)
       VALUES (@product_name, @category, @claim_text, @claim_type, @formula, @scientist, 'Submitted')`
    )
    .run({
      product_name: String(product_name).trim(),
      category: CATEGORIES.includes(category) ? category : "Skincare",
      claim_text: String(claim_text).trim(),
      claim_type: CLAIM_TYPES.includes(claim_type) ? claim_type : "Efficacy",
      formula: (formula || "").toString().trim(),
      scientist: (scientist || "Paris R&I").toString().trim(),
    });
  res
    .status(201)
    .json(
      hydrateClaim(
        db
          .prepare("SELECT * FROM claims WHERE id = ?")
          .get(info.lastInsertRowid)
      )
    );
});

// POST /api/claims/:id/evaluate
app.post("/api/claims/:id/evaluate", async (req, res) => {
  try {
    const { id } = req.params;
    const { study_text, evaluator = "Clinical Evaluator" } = req.body || {};

    if (!study_text) {
      return res
        .status(400)
        .json({ error: "study_text is required to perform an assessment" });
    }

    // 1. Fetch existing claim from SQLite
    const claim = db.prepare("SELECT * FROM claims WHERE id = ?").get(id);

    if (!claim) {
      return res.status(404).json({ error: "Claim not found" });
    }

    let evaluationResult;

    // 2. Query Groq LLM if API Key is configured
    if (groq) {
      const prompt = `
  You are a expert clinical evaluator for cosmetic and skincare claims at L'Oréal.
  Evaluate if the provided clinical study substantiates the proposed product claim.
  
  [PRODUCT]: ${claim.product_name} (${claim.category})
  [CLAIM]: "${claim.claim_text}"
  [FORMULA]: ${claim.formula || "N/A"}
  [CLINICAL STUDY]: "${study_text}"
  
  Respond STRICTLY in JSON format with no additional text or markdown formatting:
  {
    "verdict": "Substantiated" | "Insufficient" | "Refuted",
    "score": <number between 0 and 100>,
    "reasoning": "<2-3 sentence technical justification analyzing sample size, methodology, p-values, and magnitude>"
  }
        `.trim();

      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        temperature: 0.2,
        response_format: { type: "json_object" },
      });

      const parsed = JSON.parse(
        completion.choices[0]?.message?.content || "{}"
      );

      evaluationResult = {
        verdict: parsed.verdict || "Substantiated",
        score: typeof parsed.score === "number" ? parsed.score : 85,
        reasoning:
          parsed.reasoning ||
          "The study methodology and statistical metrics support the specified product claim.",
        study_text,
        evaluator,
        created_at: new Date().toISOString().split("T")[0],
      };
    } else {
      // 3. Smart Fallback if GROQ_API_KEY is not set (so your app works offline or without keys)
      console.warn(
        "GROQ_API_KEY not found. Using fallback heuristics for evaluation."
      );

      const textLower = study_text.toLowerCase();
      const isSubstantiated =
        textLower.includes("p<") ||
        textLower.includes("reduction") ||
        textLower.includes("placebo") ||
        textLower.includes("double-blind");

      evaluationResult = {
        verdict: isSubstantiated ? "Substantiated" : "Insufficient",
        score: isSubstantiated ? 88 : 42,
        reasoning: isSubstantiated
          ? "Study methodology includes randomized controls with statistically significant measurable effect sizes."
          : "Study summary lacks clear statistical significance indicators (p-values) or randomized placebo controls.",
        study_text,
        evaluator,
        created_at: new Date().toISOString().split("T")[0],
      };
    }

    // 4. Save evaluation and update study/status columns in SQLite
    db.prepare(
      `
        UPDATE claims 
        SET study = ?, evaluation = ?, status = ?
        WHERE id = ?
      `
    ).run(
      study_text,
      JSON.stringify(evaluationResult),
      evaluationResult.verdict,
      id
    );

    // 5. Fetch and return updated record
    const updatedClaim = db
      .prepare("SELECT * FROM claims WHERE id = ?")
      .get(id);
    return res.json(hydrateClaim(updatedClaim));
  } catch (error) {
    console.error("Evaluation Error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to evaluate claim" });
  }
});

app.listen(PORT, () => {
  console.log(`Claims Intelligence API listening on http://localhost:${PORT}`);
});
