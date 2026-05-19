import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@k8event/shared"],
  async redirects() {
    return [
      { source: "/dashboard", destination: "/event", permanent: false },
      { source: "/shop", destination: "/reward", permanent: false },
      { source: "/shop/:id", destination: "/reward/:id", permanent: false },
      { source: "/chat", destination: "/livechat", permanent: false },
    ];
  },
};

export default nextConfig;
