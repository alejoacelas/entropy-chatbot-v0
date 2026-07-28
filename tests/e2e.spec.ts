import { expect, test } from "@playwright/test";

test("capture, experiment, results, and prompt editing work", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Desktop workflow check");
  await page.route("**/api/generate", async (route) => {
    const body = route.request().postDataJSON() as {
      modelId: string;
      messages: Array<{ content: string }>;
    };
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        output: `Mock answer from ${body.modelId}: ${body.messages.at(-1)?.content}`,
        latencyMs: 320,
      }),
    });
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Try the assistant/ })).toBeVisible();
  const capture = page.getByTestId("capture-toggle");
  await expect(capture).toHaveAttribute("aria-pressed", "true");

  await capture.click();
  await page.getByTestId("chat-input").fill("Do not save this");
  await page.getByLabel("Send").click();
  await expect(page.getByText(/Mock answer/)).toBeVisible();

  await capture.click();
  await page.getByTestId("chat-input").fill("How should I test our policy?");
  await page.getByLabel("Send").click();
  await expect(page.getByText("How should I test our policy?")).toBeVisible();

  await page.getByRole("button", { name: "Experiments" }).click();
  await expect(page.getByText("1 in this set")).toBeVisible();
  await page.getByTestId("quick-add-cases").fill("Case two\nCase three");
  await page.getByRole("button", { name: "Add lines" }).click();
  await expect(page.getByText("3 in this set")).toBeVisible();

  const runButton = page.getByTestId("run-experiment");
  await expect(runButton).toContainText("Run 6 completions");
  await runButton.click();
  await expect(page.getByText("LATEST RUN")).toBeVisible();
  await expect(page.getByText("6 completions · 0 errors")).toBeVisible();

  await page.getByRole("button", { name: "Library" }).click();
  await page.getByRole("button", { name: "New prompt" }).click();
  await page.getByLabel("Name").fill("Short answer");
  await page.getByLabel("System prompt").fill("Answer in one sentence.");
  await page.getByRole("button", { name: "Save prompt" }).click();
  await expect(page.getByRole("heading", { name: "Short answer" })).toBeVisible();
});

test("mobile navigation and composer remain usable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile-only check");
  await page.goto("/");
  await expect(page.getByTestId("chat-input")).toBeVisible();
  await page.getByRole("button", { name: "Experiments" }).click();
  await expect(page.getByRole("heading", { name: /Compare every useful combination/ })).toBeVisible();
});
