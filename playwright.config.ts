import { defineConfig } from "@playwright/test";
import customerConfig from "./playwright.customer.config";
export default defineConfig({
  ...customerConfig,
  testMatch: "frontend.spec.ts",
});
