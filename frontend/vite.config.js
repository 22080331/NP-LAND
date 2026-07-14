import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: false, // đã có sẵn frontend/public/manifest.json
      includeAssets: ["logo.png", "apple-touch-icon.png", "icon-192.png", "icon-512.png"],
      workbox: {
        // Ảnh BĐS ảnh hưởng size cache — chỉ cache app shell (JS/CSS/HTML/icon), không cache ảnh upload
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
        runtimeCaching: [
          {
            // Ảnh BĐS: backend là domain riêng (API tách khỏi frontend khi deploy) nên match theo path, không theo origin
            urlPattern: ({ url }) => url.pathname.startsWith("/uploads/"),
            handler: "CacheFirst",
            options: { cacheName: "np-land-images", expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 3600 } },
          },
          {
            // Danh sách tin BĐS: cache lại lần gọi gần nhất để mở app vẫn thấy dữ liệu cũ khi mất mạng
            urlPattern: ({ url }) => url.pathname === "/api/properties",
            handler: "NetworkFirst",
            options: { cacheName: "np-land-api", networkTimeoutSeconds: 4, expiration: { maxEntries: 20, maxAgeSeconds: 24 * 3600 } },
          },
        ],
      },
    }),
  ],
  server: { port: 5173, host: true },
});
