/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'polymarket-upload.s3.us-east-2.amazonaws.com', // Polymarket S3 bucket
    ],
  },
  // Merge existing config options here if needed
};

module.exports = nextConfig; 