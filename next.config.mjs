import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // No `output: 'standalone'` — Railway invokes `next start`, which doesn't
  // support standalone builds. The default server output is what we want here.
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  // Pin Turbopack's workspace root to this project (Next 16 was picking up a
  // stray lockfile in the parent directory).
  turbopack: {
    root: __dirname,
  },
  experimental: {
    optimizePackageImports: ['pg', 'jose'],
  },
};

export default nextConfig;
