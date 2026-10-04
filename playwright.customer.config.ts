import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests", testMatch: "customer.spec.ts", fullyParallel: false, workers: 1,
  timeout: 60000,
  use: { baseURL: "http://localhost:3101", browserName: "chromium", channel: "chrome", screenshot: "only-on-failure", trace: "retain-on-failure" },
  reporter: "list",
  webServer: [
    { command: "node --import tsx scripts/customer-test-api.mts", url: "http://127.0.0.1:4101/api/v1/health", reuseExistingServer: false, timeout: 60000 },
    { command: "node node_modules/next/dist/bin/next dev apps/web --port 3101", url: "http://localhost:3101/login", env: { API_INTERNAL_URL: "http://127.0.0.1:4101", DSU_BUILD_DIR: ".next-customer-test" }, reuseExistingServer: false, timeout: 120000 },
  ],
});

