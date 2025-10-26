import type { NextConfig } from "next";

const nextConfig = {
  experimental: {
    mdxRs: true
  },

  // Other config properties
  webpack(config) {
    return config;
  },

  turbopack: {
    rules: {
      "*.react.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    }
  }
} satisfies NextConfig;

const withMDX = require("@next/mdx")();
export default withMDX(nextConfig);
