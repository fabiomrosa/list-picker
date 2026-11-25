import { expect, type Page, test } from "@playwright/test";

// The theme button on every page: auto (the system's) → light → dark → auto, saved in the browser.
const background = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const LIGHT = "rgb(246, 244, 239)";
const DARK = "rgb(20, 19, 17)";

for (const [name, url] of [
  ["the home", "http://localhost:5181/list-picker/"],
  ["the playground", "http://localhost:5180/"],
] as const) {
  test(`${name}: the theme button cycles auto, light, dark, and the choice survives a reload`, async ({
    page,
  }) => {
    // A light system: auto is light, the button's dark wins over it, and survives a reload.
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(url);
    const button = () => page.locator(".nav-theme");
    await expect(button()).toHaveAccessibleName("Theme: automatic (switch to light)");
    expect(await background(page)).toBe(LIGHT);
    await button().click();
    await expect(button()).toHaveAccessibleName("Theme: light (switch to dark)");
    await button().click();
    await expect(button()).toHaveAccessibleName("Theme: dark (switch to automatic)");
    expect(await background(page)).toBe(DARK);
    await page.reload();
    expect(await background(page)).toBe(DARK);
    // A dark system: back to light by the button, then auto follows the system again.
    await page.emulateMedia({ colorScheme: "dark" });
    await button().click(); // auto
    expect(await background(page)).toBe(DARK);
    await button().click(); // light
    expect(await background(page)).toBe(LIGHT);
  });
}

test("a stored theme is there in the first frame, before the page's scripts run", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(() => {
    localStorage.setItem("list-picker-theme", "dark");
    const w = window as unknown as { firstTheme?: string | undefined };
    requestAnimationFrame(() => {
      w.firstTheme = document.documentElement.dataset.theme;
    });
  });
  await page.goto("http://localhost:5181/list-picker/");
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { firstTheme?: string | undefined }).firstTheme),
    )
    .toBe("dark");
});

test("the home's outlined button fills with the accent on hover, its label readable", async ({
  page,
}) => {
  await page.goto("http://localhost:5181/list-picker/");
  const ghost = page.locator(".hero a.button.ghost");
  await ghost.hover();
  await expect(ghost).toHaveCSS("background-color", "rgb(184, 60, 12)");
  await expect(ghost).toHaveCSS("color", "rgb(246, 244, 239)");
});
