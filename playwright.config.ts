import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:3001", trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium",
        deviceScaleFactor: 1,
      },
    },
  ],
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3001",
    url: "http://127.0.0.1:3001",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      DEMO_MODE: "true",
      APP_ORIGIN: "http://127.0.0.1:3001",
      AI_BASE_URL: "http://127.0.0.1:1/v1",
      AI_API_KEY: "e2e-secret-canary",
      AI_SUPPORTS_IMAGES: "false",
      AI_TIMEOUT_MS: "45000",
      AI_RESPONSE_FORMAT: "json_schema",
      DATABASE_PATH: "./data/e2e.db",
    },
  },
});
