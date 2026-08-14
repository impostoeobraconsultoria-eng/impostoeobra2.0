/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/politica/aviso-de-privacidade.html",
        destination: "/politica/aviso-de-privacidade",
        statusCode: 301,
      },
    ];
  },
};

export default nextConfig;
