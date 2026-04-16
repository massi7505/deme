/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["pdfkit"],
  experimental: {
    outputFileTracingIncludes: {
      "/api/webhooks/mollie": ["./node_modules/pdfkit/js/data/*"],
      "/api/leads/unlock": ["./node_modules/pdfkit/js/data/*"],
    },
  },
};

export default nextConfig;
