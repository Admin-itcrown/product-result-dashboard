import type { PieceShapeKind } from "./KilnDashboardStyles";

/** Leading tokens to skip before the model code (same as kiln-dashboard). */
const SKIP_DESCRIPTION_PROCESS_TOKEN = new Set(["W/W", "WW", "BIS", "B/W", "D/W", "G/W", "S/W"]);

function normalizeLeadingTokensForModelCode(text: string): string {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  while (tokens.length > 0 && SKIP_DESCRIPTION_PROCESS_TOKEN.has(tokens[0].toUpperCase())) {
    tokens.shift();
  }
  return tokens.join(" ").trim();
}

/**
 * Model code = first meaningful alphanumeric segment within the first 6 character positions
 * of the description body (after stripping W/W · BIS …).
 */
export function extractProductCodeFromDescription(description: string | null | undefined): string | null {
  if (description == null || typeof description !== "string") return null;
  const body = normalizeLeadingTokensForModelCode(description);
  if (!body) return null;

  const window = body.slice(0, Math.min(6, body.length));
  let core = window.replace(/[^A-Z0-9-]/gi, "").toUpperCase();
  if (core.length > 6) core = core.slice(0, 6);
  if (core.length < 4) return null;

  const bodyUp = body.toUpperCase();
  if (bodyUp.includes("-L") && !core.includes("-L")) {
    core = `${core}-L`;
  }
  return core;
}

function pieceShapeFromModelCode(code: string): PieceShapeKind | null {
  if (code.includes("-L")) return "lid";
  if (code.length < 2) return null;
  const c2 = code[1].toUpperCase();
  if (c2 === "R" || c2 === "O") return "plate";
  if (c2 === "T") return "teapot";
  if (c2 === "J") return "jar";
  if (c2 === "V") return "vessel";
  if (c2 === "C") return "cup";
  if (c2 === "A") return "acc";
  if (c2 === "M" || c2 === "E" || c2 === "S") return "mug";
  if (c2 === "P") return "plate";
  if (c2 === "B") return "bowl";
  return null;
}

/** ประเภทชิ้นงานจาก Description — หลักการเดียวกับ kiln-dashboard production */
export function getPieceShapeFromDescription(description: string | null | undefined): PieceShapeKind {
  const code = extractProductCodeFromDescription(description);
  if (!code) return "other";
  return pieceShapeFromModelCode(code) ?? "other";
}
