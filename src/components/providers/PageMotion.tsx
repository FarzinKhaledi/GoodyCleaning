"use client";

import { useEffect } from "react";

export function PageMotion({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches || !("IntersectionObserver" in window)) return;
    const elements = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -24px 0px" });
    elements.forEach(element => { element.classList.add("reveal-ready"); observer.observe(element); });
    function onMotionChange() {
      if (media.matches) { elements.forEach(element=>element.classList.remove("reveal-ready")); observer.disconnect(); }
    }
    media.addEventListener("change", onMotionChange);
    return () => { observer.disconnect(); media.removeEventListener("change", onMotionChange); elements.forEach(element=>element.classList.remove("reveal-ready")); };
  }, []);
  return <>{children}</>;
}
