import dotenv from "dotenv";
dotenv.config();

import { v2 as cloudinary } from "cloudinary";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

import express from "express";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFile } from "fs/promises";
import { buildCardElement } from "./cardTemplate.js";

const app = express();
app.use(express.json({ limit: "10mb" }));

// ── Load assets once at startup ───────────────────────────────────────────
let BG_BASE64 = null;
let LOGO_BASE64 = null;
let SIGNATURE_BASE64 = null;
let FONTS = null;

async function loadBg() {
  const bgPath = new URL("./assets/bg.png", import.meta.url).pathname;
  try {
    const data = await readFile(bgPath);
    BG_BASE64 = `data:image/png;base64,${data.toString("base64")}`;
    console.log("✅ Loaded assets/bg.png as background");
  } catch {
    console.warn("⚠️  assets/bg.png not found — card will have no background.");
  }
}

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

async function loadSignature() {
  const sigPath = new URL("./assets/sign.png", import.meta.url).pathname;
  try {
    const data = await readFile(sigPath);
    SIGNATURE_BASE64 = `data:image/png;base64,${data.toString("base64")}`;
    console.log("✅ Loaded assets/sign.png as signature");
  } catch {
    console.warn("⚠️  assets/sign.png not found — signature will be blank.");
  }
}

async function loadFonts() {
  const candidates = [
    new URL("./NotoSans-Regular.ttf", import.meta.url).pathname,
    "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
    "/usr/share/fonts/noto/NotoSans-Regular.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "C:\\Windows\\Fonts\\arial.ttf",
  ];

  const boldCandidates = [
    new URL("./NotoSans-Bold.ttf", import.meta.url).pathname,
    "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
    "/usr/share/fonts/noto/NotoSans-Bold.ttf",
  ];

  let regularData = null;
  let boldData = null;

  for (const path of candidates) {
    try {
      regularData = await readFile(path);
      break;
    } catch { /* try next */ }
  }

  for (const path of boldCandidates) {
    try {
      boldData = await readFile(path);
      break;
    } catch { /* try next */ }
  }

  if (!regularData) {
    console.warn(
      "⚠️  No system fonts found. Place NotoSans-Regular.ttf and NotoSans-Bold.ttf " +
      "in the project root, or install the noto-fonts package."
    );
    FONTS = null;
    return;
  }

  FONTS = [
    { name: "sans-serif", data: regularData, weight: 400, style: "normal" },
    { name: "sans-serif", data: regularData, weight: 500, style: "normal" },
    { name: "sans-serif", data: boldData ?? regularData, weight: 700, style: "normal" },
    { name: "sans-serif", data: boldData ?? regularData, weight: 900, style: "normal" },
  ];

  console.log(`✅ Loaded ${FONTS.length} font weight(s) for Satori`);
}

// ── POST /generate-card ───────────────────────────────────────────────────
/**
 * Request body (JSON):
 * {
 *   "name":          "Rahul Kumar",
 *   "membershipId":  "KA-2024-001234",
 *   "epicNo":        "ABC1234567",
 *   "phoneNumber":   "+91 98765 43210",
 *   "acNo":          "143",
 *   "constituency":  "Shivajinagar"
 * }
 *
 * Response: { url: "https://res.cloudinary.com/..." }
 */
app.post("/generate-card", async (req, res) => {
  if (!FONTS) {
    return res.status(500).json({
      error: "Fonts not loaded. Place NotoSans-Regular.ttf in the project root and restart.",
    });
  }

  const {
    name,
    membershipId,
    epicNo,
    phoneNumber,
    acNo,
    constituency,
  } = req.body;

  if (!name && !membershipId) {
    return res.status(400).json({ error: "Provide at least name or membershipId." });
  }

  try {
    // 1. Build element tree (signature comes from local file, not request)
    const element = buildCardElement({
      name,
      membershipId,
      epicNo,
      phoneNumber,
      acNo,
      constituency,
      signatureBase64: SIGNATURE_BASE64,
      logoBase64: LOGO_BASE64,
      bgBase64: BG_BASE64,
    });

    // 2. Convert to SVG via Satori
    const svg = await satori(element, {
      width: 600,
      height: 375,
      fonts: FONTS,
    });

    // 3. Render SVG → PNG via resvg-js (1200 = 2x for sharpness)
    const resvg = new Resvg(svg, {
      fitTo: { mode: "width", value: 1200 },
    });
    const pngBuffer = resvg.render().asPng();

    // 4. Upload to Cloudinary
    const imageUrl = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: "kpcc-cards" },
        (error, result) => {
          if (error) return reject(error);
          resolve(result.secure_url);
        }
      ).end(pngBuffer);
    });

    res.json({ url: imageUrl });
  } catch (err) {
    console.error("Card generation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── Health check ──────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ── Start ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

Promise.all([loadFonts(), loadLogo(), loadBg(), loadSignature()]).then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 KPCC Card API running on http://localhost:${PORT}`);
    console.log(`   POST /generate-card  → returns { url }`);
    console.log(`   GET  /health         → status check`);
  });
});