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
  },
  // Merge existing config options here if needed
};

module.exports = nextConfig; 