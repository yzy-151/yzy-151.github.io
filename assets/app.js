const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08 });
  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("visible"));
}

const navLinks = [...document.querySelectorAll("nav a")];
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

if ("IntersectionObserver" in window) {
  const sectionObserver = new IntersectionObserver((entries) => {
    const current = entries.find((entry) => entry.isIntersecting);
    if (!current) return;
    navLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${current.target.id}`);
    });
  }, { rootMargin: "-20% 0px -65%", threshold: 0 });
  sections.forEach((section) => sectionObserver.observe(section));
}

const filterButtons = document.querySelectorAll("[data-filter]");
const repositories = document.querySelectorAll(".repo-card[data-category]");

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle("active", item === button));
    repositories.forEach((repository) => {
      repository.hidden = filter !== "all" && repository.dataset.category !== filter;
    });
  });
});

document.querySelectorAll("img").forEach((image) => {
  image.addEventListener("error", () => {
    const fallback = document.createElement("div");
    fallback.className = "image-error";
    fallback.textContent = `IMAGE UNAVAILABLE / ${image.alt}`;
    image.replaceWith(fallback);
  }, { once: true });
});
