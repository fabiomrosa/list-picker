// The theme button (every page): auto (the system's), light or dark, saved in this browser. The
// saved choice is applied before the page paints by the inline script in each page's <head>.
const KEY = "list-picker-theme";
type Mode = "auto" | "light" | "dark";
const NEXT: Record<Mode, Mode> = { auto: "light", light: "dark", dark: "auto" };
const NAME: Record<Mode, string> = {
  auto: "Theme: automatic (switch to light)",
  light: "Theme: light (switch to dark)",
  dark: "Theme: dark (switch to automatic)",
};

function saved(): Mode {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : "auto";
  } catch {
    return "auto"; // storage blocked: follow the system
  }
}

function apply(mode: Mode): void {
  if (mode === "auto") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = mode;
  for (const button of document.querySelectorAll<HTMLButtonElement>(".nav-theme")) {
    button.dataset.mode = mode;
    button.setAttribute("aria-label", NAME[mode]);
    button.title = NAME[mode];
  }
}

let current = saved();
for (const button of document.querySelectorAll<HTMLButtonElement>(".nav-theme")) {
  button.addEventListener("click", () => {
    const mode = NEXT[current];
    current = mode;
    try {
      if (mode === "auto") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, mode);
    } catch {
      // storage blocked: the choice lasts this page only
    }
    apply(mode);
  });
}
apply(current);
