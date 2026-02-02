const root = document.documentElement;

if (localStorage.theme === "dark") root.classList.add("dark");

function toggleDark() {
    root.classList.toggle("dark");
    localStorage.theme = root.classList.contains("dark") ? "dark" : "light";
}
