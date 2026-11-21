import path from "path";

export const REPO_ROOT = process.cwd();
export const CASES_DIR = path.join(process.cwd(), "cases");
export const LEGAL_PATH = path.join(process.cwd(), "legal", "legal-dataset-sample.json");

export const FAMILY_SLUGS = [
  "michael-carter",
  "daniel-emily-johnson",
  "samantha-lewis",
  "timothy-melanie-weah",
] as const;

export type FamilySlug = (typeof FAMILY_SLUGS)[number];
