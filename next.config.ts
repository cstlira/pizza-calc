import path from "node:path";
import type { NextConfig } from "next";

// GitHub Pages serves este projeto em /pizza-calc/ (site de projeto, não de
// usuário/org), então o prefixo só é necessário no build de CI — localmente
// (dev/build) o app continua servido na raiz.
const isGithubActions = process.env.GITHUB_ACTIONS === "true";
const basePath = isGithubActions ? "/pizza-calc" : "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
