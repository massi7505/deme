/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      "/api/**": ["./node_modules/pdfkit/js/data/**/*"],
    },
  },
};

export default nextConfig;
