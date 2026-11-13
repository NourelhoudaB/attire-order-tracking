import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:8889",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
    { name: "tablet", use: { viewport: { width: 820, height: 1180 } } },
    { name: "desktop", use: { viewport: { width: 1280, height: 900 } } },
  ],
});
