import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/", // <- Required for Netlify routing to work
  server: {
    host: "0.0.0.0",
    port: 5174,
  },
});
