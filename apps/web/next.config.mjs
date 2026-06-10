import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Monorepo: trace files from the repo root so workspace packages are included.
  outputFileTracingRoot: path.join(__dirname, "../../"),
};

export default nextConfig;
