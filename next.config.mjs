/** @type {import('next').NextConfig} */
const caseFiles = ["./cases/**/*", "./legal/**/*"];

const nextConfig = {
  serverExternalPackages: ["rss-parser"],
  // "/*" only matches one path segment, so /api/drafts never received the case files.
  outputFileTracingIncludes: {
    "/api/**/*": caseFiles,
    "/api/ingest": caseFiles,
    "/api/drafts": caseFiles,
    "/api/clients": caseFiles,
    "/api/clients/[slug]": caseFiles,
    "/api/clients/[slug]/meetings": caseFiles,
    "/api/profiles": caseFiles,
    "/api/workspace": caseFiles,
    "/api/inbox": caseFiles,
    "/**/*": caseFiles,
  },
};

export default nextConfig;
