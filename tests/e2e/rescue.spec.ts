import { test, expect } from "@playwright/test";

test("ingredient edits and narrow layouts keep the form usable", async ({
  page,
}) => {
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/rescue?example=1"]) {
      await page.goto(path);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
  await page
    .getByRole("button", { name: "Remove ingredient 2", exact: true })
    .click();
  await expect(page.getByLabel("Ingredient 2", { exact: true })).toHaveValue(
    "Yeast",
  );
  await page
    .getByRole("button", { name: "Add ingredient", exact: true })
    .click();
  await page.getByLabel("Ingredient 6", { exact: true }).fill("Cardamom");
  await page.getByLabel("Amount for ingredient 6", { exact: true }).fill("1");
  await page.getByLabel("Unit for ingredient 6", { exact: true }).fill("tsp");
  await page.getByRole("button", { name: "Find a way forward" }).click();
  await expect(
    page.getByRole("heading", { name: "One useful question first." }),
  ).toBeVisible();
  await expect(page.getByText("Cardamom", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit recipe", exact: true }).click();
  await expect(page.getByLabel("Ingredient 6", { exact: true })).toHaveValue(
    "Cardamom",
  );
  await expect(
    page.getByLabel("Amount for ingredient 6", { exact: true }),
  ).toHaveValue("1");
  await expect(
    page.getByLabel("Unit for ingredient 6", { exact: true }),
  ).toHaveValue("tsp");
  await expect(page.locator('[aria-current="step"]')).toHaveText("Your recipe");
});

test("landing and complete demo journey are usable without horizontal overflow", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    page.getByRole("heading", { name: "A kitchen mishap. Not a lost cause." }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: testInfo.outputPath("home.png"),
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Try the cinnamon-roll example" })
    .click();
  await expect(page.getByLabel("What are you making?")).toHaveValue(
    "Cinnamon rolls",
  );
  await expect(page.getByText("Demo · no AI analysis")).toBeVisible();
  await page.getByLabel("Amount for ingredient 1", { exact: true }).fill("500");
  await page.getByLabel("Unit for ingredient 1", { exact: true }).fill("g");
  await page.screenshot({
    path: testInfo.outputPath("workspace.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Find a way forward" }).click();
  await expect(
    page.getByRole("heading", { name: "One useful question first." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "One useful question first." }),
  ).toBeFocused();
  await expect(page.getByText("500 g", { exact: true })).toBeVisible();
  await expect(page.locator('[aria-current="step"]')).toHaveText(
    "A useful question",
  );
  await page.screenshot({
    path: testInfo.outputPath("clarification.png"),
    fullPage: true,
  });
  await page
    .getByLabel("Your answer", { exact: true })
    .fill("Bread flour, 500 g flour and 250 ml milk. I kneaded by hand.");
  await page.getByRole("button", { name: "Continue to next steps" }).click();
  await expect(
    page.getByRole("heading", { name: "Try this next" }),
  ).toBeVisible();
  await expect(page.getByText("Demo · illustrative guidance")).toBeVisible();
  await expect(page.locator(".rescue-steps > li")).toHaveCount(3);
  await expect(page.locator('[aria-current="step"]')).toHaveText("Next steps");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: testInfo.outputPath("results.png"),
    fullPage: true,
  });
});

test("validation and failed requests preserve entered data", async ({
  page,
}) => {
  await page.goto("/rescue");
  await page.getByRole("button", { name: "Find a way forward" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Review a few recipe details" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Load cinnamon-roll example" })
    .click();
  await page.route("/api/rescue", (route) =>
    route.fulfill({
      status: 502,
      json: { error: "The model is unavailable. Try again." },
    }),
  );
  await page.getByRole("button", { name: "Find a way forward" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "The model is unavailable" }),
  ).toBeVisible();
  await expect(page.getByLabel("What are you making?")).toHaveValue(
    "Cinnamon rolls",
  );
  await expect(
    page.getByRole("heading", { name: "Try this next" }),
  ).toHaveCount(0);
});

test("safety concern pauses rescue steps", async ({ page }, testInfo) => {
  await page.goto("/rescue?example=1");
  await page.getByLabel("Any concerns about food safety?").selectOption("yes");
  await page.getByRole("button", { name: "Find a way forward" }).click();
  await expect(
    page.getByText("Food-safety guidance", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Read food safety guidance" }),
  ).toBeVisible();
  await expect(page.locator(".rescue-steps")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "A recipe fix isn’t the next step." }),
  ).toBeVisible();
  await expect(page.locator(".rescue-progress")).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("safety.png"),
    fullPage: true,
  });
  await page.getByRole("textbox").fill("It looks fine now, is it safe?");
  await page.getByRole("button", { name: "Update the guidance" }).click();
  await expect(
    page.getByRole("heading", { name: "A recipe fix isn’t the next step." }),
  ).toBeFocused();
  await expect(page.locator(".rescue-steps")).toHaveCount(0);
});

test("unsaved guidance stays visible without offering follow-up", async ({
  page,
}) => {
  await page.route("/api/rescue", async (route) => {
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    const result = await response.json();
    await route.fulfill({ response, json: { ...result, saved: false } });
  });
  await page.goto("/rescue?example=1");
  await page.getByRole("button", { name: "Find a way forward" }).click();
  await expect(
    page.getByRole("heading", { name: "One useful question first." }),
  ).toBeVisible();
  await expect(
    page.getByRole("alert").filter({ hasText: "couldn’t be saved" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your recipe" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue to next steps" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Edit recipe" }).click();
  await expect(page.getByLabel("What are you making?")).toHaveValue(
    "Cinnamon rolls",
  );
});

test("API rejects cross-site requests and unsupported photos", async ({
  request,
  baseURL,
}) => {
  if (!baseURL) throw new Error("Set baseURL in the Playwright configuration.");
  const origin = new URL(baseURL).origin;
  const response = await request.post("/api/rescue", {
    headers: { origin: "https://untrusted.example" },
    multipart: { payload: "{}" },
  });
  expect(response.status()).toBe(403);
  const { exampleRecipe } = await import("../../src/domain/rescue");
  const image = await request.post("/api/rescue", {
    headers: { origin },
    multipart: {
      payload: JSON.stringify({ recipe: exampleRecipe }),
      image: {
        name: "fake.png",
        mimeType: "image/png",
        buffer: Buffer.from("fake image"),
      },
    },
  });
  expect(image.status()).toBe(400);
  expect(await image.text()).toContain("Photo analysis is not available");
  const invalid = await request.post("/api/rescue", {
    headers: { origin },
    multipart: { payload: "{}" },
  });
  expect(invalid.status()).toBe(400);
  expect(invalid.headers()["cache-control"]).toBe("no-store");
  const textPhoto = await request.post("/api/rescue", {
    headers: { origin },
    multipart: {
      payload: JSON.stringify({ recipe: exampleRecipe }),
      image: "not a file",
    },
  });
  expect(textPhoto.status()).toBe(400);
});

test("keyboard users can reach the form and locate an invalid ingredient", async ({
  page,
}) => {
  await page.goto("/rescue");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Load cinnamon-roll example" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Find a way forward" }).click();
  const alert = page
    .getByRole("alert")
    .filter({ hasText: "Review a few recipe details" });
  await expect(alert).toBeFocused();
  await alert.getByRole("link", { name: "Name this ingredient." }).click();
  const ingredient = page.getByRole("textbox", {
    name: "Ingredient 1",
    exact: true,
  });
  await expect(ingredient).toBeFocused();
  await expect(ingredient).toHaveAccessibleDescription(/Name this ingredient/);
});

test("cancel and non-JSON errors preserve the recipe", async ({ page }) => {
  await page.goto("/rescue?example=1");
  let finishRequest: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    finishRequest = resolve;
  });
  let requestCount = 0;
  await page.route("/api/rescue", async (route) => {
    if (++requestCount === 1) {
      await pending;
      await route.abort().catch(() => {});
    } else {
      await route.fulfill({
        status: 502,
        contentType: "text/html",
        body: "<h1>Gateway unavailable</h1>",
      });
    }
  });
  const firstRequest = page.waitForRequest("**/api/rescue");
  await page.getByRole("button", { name: "Find a way forward" }).click();
  await firstRequest;
  await expect(
    page.getByRole("button", { name: "Checking your recipe…" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Request cancelled");
  finishRequest();
  await page.getByRole("button", { name: "Find a way forward" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "unreadable response" }),
  ).toBeVisible();
  await expect(page.getByLabel("What are you making?")).toHaveValue(
    "Cinnamon rolls",
  );
});

test("server credentials stay out of page content and browser scripts", async ({
  page,
  request,
}) => {
  const response = await request.get("/rescue");
  expect(await response.text()).not.toContain("e2e-secret-canary");
  const scripts: Promise<string>[] = [];
  page.on("response", (response) => {
    if (response.request().resourceType() === "script")
      scripts.push(response.text());
  });
  await page.goto("/rescue");
  await page
    .getByRole("button", { name: "Load cinnamon-roll example" })
    .click();
  expect(scripts.length).toBeGreaterThan(0);
  for (const script of await Promise.all(scripts))
    expect(script).not.toContain("e2e-secret-canary");
});
