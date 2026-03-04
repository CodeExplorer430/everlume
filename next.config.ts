import type { NextConfig } from "next";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    protocol: "https",
    hostname: "res.cloudinary.com",
    pathname: "/**",
  },
];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl) {
  try {
    const parsed = new URL(supabaseUrl);
    const protocol = parsed.protocol === "http:" ? "http" : "https";
    remotePatterns.push({
      protocol,
      hostname: parsed.hostname,
      pathname: "/storage/v1/object/public/**",
    });
  } catch {
    // Ignore invalid env format in config parsing.
  }
}

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  allowedDevOrigins: ['localhost', '127.0.0.1'],
  images: {
    remotePatterns,
  },
};

export default nextConfig;
