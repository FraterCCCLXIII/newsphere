/** Run before React render so the first paint uses the correct `dark` class on `<html>`. */
try {
  const t =
    localStorage.getItem("newsphere-theme") ??
    localStorage.getItem("newsfeed-theme");
  if (t === "dark") document.documentElement.classList.add("dark");
  else if (t === "light") document.documentElement.classList.remove("dark");
  else if (window.matchMedia?.("(prefers-color-scheme: dark)").matches)
    document.documentElement.classList.add("dark");
} catch {
  /* ignore */
}
