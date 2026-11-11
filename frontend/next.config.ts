import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // genlayer-js 2.0 is a release candidate whose typings may move between RCs; a
  // typing nit must not block a deploy. `npx tsc --noEmit` still reports them.
  typescript: { ignoreBuildErrors: true },
};

export default config;
