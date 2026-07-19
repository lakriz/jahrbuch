import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Schlankes, selbst-tragendes Server-Bundle für den Docker-Betrieb
  output: "standalone",
};

export default nextConfig;
