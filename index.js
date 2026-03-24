import express from "express";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFile } from "fs/promises";
import { buildCardElement } from "./cardTemplate.js";

const app = express();
app.use(express.json({ limit: "10mb" })); // allow base64 photo payloads

// ── Load background image once at startup ─────────────────────────────────
let BG_BASE64 = null;
async function loadBg() {
  const bgPath = new URL("./assets/bg.png", import.meta.url).pathname;
  try {
    const data = await readFile(bgPath);
    BG_BASE64 = `data:image/png;base64,${data.toString("base64")}`;
    console.log("✅ Loaded assets/bg.png as background");
  } catch {
    console.warn("⚠️  assets/bg.png not found — card will have no background. Place bg.png in assets/");
  }
}
let LOGO_BASE64 = null;
async function loadLogo() {
  const logoPath = new URL("./assets/inc.jpg", import.meta.url).pathname;
  try {
    const data = await readFile(logoPath);
    LOGO_BASE64 = `data:image/jpeg;base64,${data.toString("base64")}`;
    console.log("✅ Loaded assets/inc.jpg as logo");
  } catch {
    console.warn("⚠️  assets/inc.jpg not found — logo will be blank.");
  }
}

// ── Load background image once at startup ─────────────────────────────────
BG_BASE64 = null;
async function loadBackground() {
  const bgPath = new URL("./assets/bg.png", import.meta.url).pathname;
  try {
    const data = await readFile(bgPath);
    BG_BASE64 = `data:image/png;base64,${data.toString("base64")}`;
    console.log("✅ Loaded assets/bg.png as background");
  } catch {
    console.warn("⚠️  assets/bg.png not found — falling back to CSS gradients.");
  }
}
// Satori requires at least one font. We bundle Noto Sans from the system or
// you can drop any .ttf into the project root and update the path below.
let FONTS;
async function loadFonts() {
  // Try to load from common system font locations (Linux / macOS / Windows)
  const candidates = [
    // Google Noto Sans (if you place it in the project)
    new URL("./NotoSans-Regular.ttf", import.meta.url).pathname,
    new URL("./NotoSans-Bold.ttf", import.meta.url).pathname,
    // Linux system fonts
    "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
    "/usr/share/fonts/noto/NotoSans-Regular.ttf",
    // macOS system fonts
    "/System/Library/Fonts/Helvetica.ttc",
    // Windows
    "C:\\Windows\\Fonts\\arial.ttf",
  ];

  let regularData = null;
  let boldData = null;

  for (const path of candidates) {
    try {
      regularData = await readFile(path);
      break;
    } catch {
      // try next
    }
  }

  const boldCandidates = [
    new URL("./NotoSans-Bold.ttf", import.meta.url).pathname,
    "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
    "/usr/share/fonts/noto/NotoSans-Bold.ttf",
  ];

  for (const path of boldCandidates) {
    try {
      boldData = await readFile(path);
      break;
    } catch {
      // try next
    }
  }

  FONTS = [];

  if (regularData) {
    FONTS.push({ name: "sans-serif", data: regularData, weight: 400, style: "normal" });
    FONTS.push({ name: "sans-serif", data: regularData, weight: 500, style: "normal" });
  }
  if (boldData) {
    FONTS.push({ name: "sans-serif", data: boldData, weight: 700, style: "normal" });
    FONTS.push({ name: "sans-serif", data: boldData, weight: 900, style: "normal" });
  } else if (regularData) {
    // Fallback: use regular for bold weights
    FONTS.push({ name: "sans-serif", data: regularData, weight: 700, style: "normal" });
    FONTS.push({ name: "sans-serif", data: regularData, weight: 900, style: "normal" });
  }

  if (!FONTS.length) {
    console.warn(
      "⚠️  No system fonts found. Place NotoSans-Regular.ttf and NotoSans-Bold.ttf " +
        "in the project root, or install the noto-fonts package."
    );
    // Satori will throw if no fonts are provided — re-throw at request time
    FONTS = null;
  } else {
    console.log(`✅ Loaded ${FONTS.length} font weight(s) for Satori`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /generate-card
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Request body (JSON):
 * {
 *   "name":           "Rahul Kumar",
 *   "membershipId":   "KA-2024-001234",
 *   "epicNo":         "ABC1234567",
 *   "phoneNumber":    "+91 98765 43210",
 *   "acNo":           "143",
 *   "constituency":   "Shivajinagar",
 *   "photoBase64":    "data:image/jpeg;base64,...",   // optional
 *   "signatureBase64":"data:image/png;base64,..."    // optional
 * }
 *
 * Response: PNG image (image/png)
 */
app.post("/generate-card", async (req, res) => {
  if (!FONTS) {
    return res.status(500).json({
      error:
        "Fonts not loaded. Place NotoSans-Regular.ttf in the project root and restart.",
    });
  }

  const {
    name,
    membershipId,
    epicNo,
    phoneNumber,
    acNo,
    constituency,
    photoBase64 = null,
    signatureBase64 = null,
  } = req.body;

  // Basic validation
  if (!name && !membershipId) {
    return res.status(400).json({ error: "Provide at least name or membershipId." });
  }

  try {
    // 1. Build JSX-like element tree
    const element = buildCardElement({
      name,
      membershipId,
      epicNo,
      phoneNumber,
      acNo,
      constituency,
      photoBase64,
      signatureBase64,
      logoBase64: LOGO_BASE64,
      bgBase64: BG_BASE64,
    });

    // 2. Convert to SVG via Satori
    const svg = await satori(element, {
      width: 600,
      height: 375,
      fonts: FONTS,
    });

    // 3. Render SVG → PNG via resvg-js
    const resvg = new Resvg(svg, {
      fitTo: { mode: "width", value: 600 },
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `inline; filename="kpcc-card.png"`);
    res.send(pngBuffer);
  } catch (err) {
    console.error("Card generation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ─────────────────────────────────────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

loadFonts().then(() => loadLogo()).then(() => loadBg()).then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 KPCC Card API running on http://localhost:${PORT}`);
    console.log(`   POST /generate-card  → returns PNG`);
    console.log(`   GET  /health         → status check`);
  });
});