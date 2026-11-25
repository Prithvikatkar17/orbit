import withSerwistInit from "@serwist/next";

const isStaticExport = process.env.ORBIT_STATIC_EXPORT === "1";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = isStaticExport
  ? {
      output: "export",
      images: { unoptimized: true },
      trailingSlash: true,
    }
  : {
      serverExternalPackages: ["better-sqlite3"],
    };

export default withSerwist(nextConfig);
