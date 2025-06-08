/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'polymarket-upload.s3.us-east-2.amazonaws.com', // Polymarket S3 bucket
      'sleepercdn.com', // Sleeper CDN for fantasy league logos
      'i1.sndcdn.com', // SoundCloud images used in avatars
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    minimumCacheTTL: 31536000, // Cache images for 1 year
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Merge existing config options here if needed
};

module.exports = nextConfig; 