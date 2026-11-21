/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["rss-parser"],
  // Case JSON is read with fs at runtime; include it in the Vercel bundle.
  outputFileTracingIncludes: {
    "/*": ["./cases/**/*", "./legal/**/*"],
  },
};

export default nextConfig;
