/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export', // 👈 replaces `next export`
    images: {
        unoptimized: true, // 👈 needed for static export (disables Image Optimization API)
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
};

module.exports = nextConfig;
