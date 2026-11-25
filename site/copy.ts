// A code block's copy button: the home's install command (the command shown, as the framework and
// package manager chosen make it; the `$` is a CSS prompt, not text) and a demo's files (L5.15).
const status = document.getElementById("copied");
const timers = new Map<HTMLButtonElement, ReturnType<typeof setTimeout>>();
for (const button of document.querySelectorAll<HTMLButtonElement>("pre .copy")) {
  button.addEventListener("click", async () => {
    const command = button.parentElement?.querySelector("code")?.innerText.trim() ?? "";
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      return; // no clipboard here: the command stays selectable by hand
    }
    // A second copy restarts the check's time, and is announced again (the text changes back).
    clearTimeout(timers.get(button));
    button.dataset.copied = "";
    if (status) status.textContent = "";
    setTimeout(() => {
      if (status) status.textContent = "Copied";
    }, 50);
    timers.set(
      button,
      setTimeout(() => {
        delete button.dataset.copied;
        if (status) status.textContent = "";
      }, 1500),
    );
  });
}
