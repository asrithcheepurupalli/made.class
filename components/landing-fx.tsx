"use client";

import { useEffect } from "react";

// Landing-page motion: scroll reveals (.rv → .in), staggered hero phone
// messages (.seq), and count-up numbers ([data-count]). Respects
// prefers-reduced-motion by revealing everything immediately.
export function LandingFx() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // hero phone message sequence
    const seqs = [...document.querySelectorAll<HTMLElement>(".seq")];
    seqs.forEach((el, i) => {
      if (reduced) el.classList.add("in");
      else setTimeout(() => el.classList.add("in"), 600 + i * 650);
    });

    // scroll reveals
    const rvs = [...document.querySelectorAll<HTMLElement>(".rv")];
    if (reduced) {
      rvs.forEach((el) => el.classList.add("in"));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              (e.target as HTMLElement).classList.add("in");
              io.unobserve(e.target);
            }
          }
        },
        { threshold: 0.15 }
      );
      rvs.forEach((el) => io.observe(el));
    }

    // count-ups
    const counters = [...document.querySelectorAll<HTMLElement>("[data-count]")];
    const run = (el: HTMLElement) => {
      const target = Number(el.dataset.count ?? 0);
      const suffix = el.dataset.suffix ?? "";
      if (reduced) {
        el.textContent = `${target}${suffix}`;
        return;
      }
      const t0 = performance.now();
      const dur = 1200;
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / dur);
        el.textContent = `${Math.round(target * (1 - Math.pow(1 - p, 3)))}${suffix}`;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const io2 = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            run(e.target as HTMLElement);
            io2.unobserve(e.target);
          }
        }
      },
      { threshold: 0.4 }
    );
    counters.forEach((el) => io2.observe(el));

    return () => {
      io2.disconnect();
    };
  }, []);

  return null;
}
