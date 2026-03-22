import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    GMAIL_ADDRESS: process.env.GMAIL_ADDRESS,
    GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD,
  },
};

export default nextConfig;
