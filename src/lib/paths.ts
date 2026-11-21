import path from "path";

export const REPO_ROOT = path.join(process.cwd());
export const CASES_DIR = path.join(REPO_ROOT, "cases");
export const LEGAL_PATH = path.join(REPO_ROOT, "legal", "legal-dataset-sample.json");

export const FAMILY_SLUGS = [
  "michael-carter",
  "daniel-emily-johnson",
  "samantha-lewis",
  "timothy-melanie-weah",
] as const;

export type FamilySlug = (typeof FAMILY_SLUGS)[number];
