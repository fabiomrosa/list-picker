// The home's install command (L4 site): its copy button puts the visible command on the clipboard,
// as the framework and package manager chosen show it (the `$` is a CSS prompt, not text).
const status = document.getElementById("copied");
for (const button of document.querySelectorAll<HTMLButtonElement>(".install .copy")) {
  button.addEventListener("click", async () => {
    const command = button.parentElement?.querySelector("code")?.innerText.trim() ?? "";
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      return; // no clipboard here: the command stays selectable by hand
    }
    button.dataset.copied = "";
    if (status) status.textContent = "Copied";
    setTimeout(() => {
      delete button.dataset.copied;
      if (status) status.textContent = "";
    }, 1500);
  });
}
