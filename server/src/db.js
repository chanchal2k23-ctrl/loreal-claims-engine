import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to SQLite file (creates database.sqlite if it doesn't exist)
const db = new Database(path.join(__dirname, "database.sqlite"));

// Enable WAL mode for better write performance
db.pragma("journal_mode = WAL");

// 1. Create table
// db.js
db.exec(`
  CREATE TABLE IF NOT EXISTS claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    claim_text TEXT NOT NULL,
    claim_type TEXT NOT NULL,
    scientist TEXT,
    formula TEXT,
    study TEXT,
    status TEXT DEFAULT 'Submitted',
    evaluation TEXT
  );
`);

// db.js
function seedData() {
  const count = db.prepare("SELECT COUNT(*) AS count FROM claims").get().count;

  if (count === 0) {
    console.log("Seeding initial claims into SQLite database...");

    const initialClaims = [
      {
        product_name: "Revitalift Pro-Retinol Night Serum",
        category: "Skincare",
        claim_text: "Reduces the appearance of wrinkles by 20% in 4 weeks",
        claim_type: "Efficacy",
        scientist: "Dr. Camille Laurent (Paris R&I)",
        formula:
          "0.3% pro-retinol, 2% niacinamide, hyaluronic acid, glycerin, tocopherol",
        study:
          "Randomized, double-blind, placebo-controlled trial. n=84 women aged 35-60 over 4 weeks.",
        status: "Submitted",
        evaluation: JSON.stringify({ verdict: "Substantiated", score: 92 }),
      },
      {
        product_name: "Elvive Hydra Repair Mask",
        category: "Haircare",
        claim_text: "Repairs damaged hair and reduces breakage by 90%",
        claim_type: "Efficacy",
        scientist: "Dr. Anaïs Moreau (Paris R&I)",
        formula: "Ceramide complex, castor oil, hydrolyzed keratin, panthenol",
        study: "Instrumental combing test on 12 hair swatches over 1 week.",
        status: "Submitted",
        evaluation: JSON.stringify({ verdict: "Insufficient", score: 45 }),
      },
      {
        product_name: "UV Defender Invisible Fluid SPF50+",
        category: "Suncare",
        claim_text: "Provides 8 hours of hydration",
        claim_type: "Sensory",
        scientist: "Dr. Hugo Bernard (Paris R&I)",
        formula: "Mexoryl 400, glycerin, shea butter, vitamin E",
        study: "Corneometer hydration study, n=45 volunteers, single-blind.",
        status: "Submitted",
        evaluation: null,
      },
    ];

    // Define insert statement and transaction together inside the block
    const insertStmt = db.prepare(`
        INSERT INTO claims (product_name, category, claim_text, claim_type, scientist, formula, status )
        VALUES (@product_name, @category, @claim_text, @claim_type, @scientist, @formula, @status)
      `);

    const insertMany = db.transaction((items) => {
      for (const item of items) {
        insertStmt.run(item);
      }
    });

    insertMany(initialClaims);
  }
}

seedData();

export default db;
