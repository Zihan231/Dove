import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static files for the offline kiosk app (npm run dist:kiosk).
  ...(process.env.KIOSK ? { output: "export" as const } : {}),
  /* config options here */
  // These need a server, so they are off for the static export.
  ...(process.env.KIOSK ? {} : { cacheComponents: true, partialPrefetching: true }),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
