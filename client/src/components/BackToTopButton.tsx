import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

const SHOW_AFTER_PX = 360;

export default function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => {
      setVisible(window.scrollY > SHOW_AFTER_PX);
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    window.scrollTo({
      top: 0,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  return (
    <button
      type="button"
      aria-label="Remonter en haut de la page"
      aria-hidden={!visible}
      title="Remonter en haut"
      tabIndex={visible ? 0 : -1}
      onClick={scrollToTop}
      data-testid="back-to-top"
      className={`group fixed right-[calc(1rem+env(safe-area-inset-right,0px))] bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] z-[89] grid size-14 place-items-center rounded-full border border-white/35 bg-gradient-to-br from-emerald-500 via-teal-700 to-[#12372f] text-white shadow-[0_12px_32px_rgba(5,46,39,0.42)] ring-1 ring-amber-200/50 outline-none transition-[opacity,transform,filter,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:scale-105 hover:shadow-[0_16px_38px_rgba(5,46,39,0.5)] focus-visible:ring-4 focus-visible:ring-amber-300/70 active:scale-95 sm:right-[calc(1.5rem+env(safe-area-inset-right,0px))] sm:bottom-[calc(6.5rem+env(safe-area-inset-bottom,0px))] ${
        visible
          ? "translate-y-0 scale-100 opacity-100"
          : "pointer-events-none translate-y-3 scale-75 opacity-0"
      } before:pointer-events-none before:absolute before:-inset-1 before:-z-10 before:rounded-full before:bg-gradient-to-br before:from-amber-300/50 before:via-emerald-400/35 before:to-transparent before:opacity-70 before:blur-md before:transition-opacity before:duration-300 group-hover:before:opacity-100 group-focus-visible:before:opacity-100`}
    >
      <span className="absolute inset-[3px] rounded-full border border-white/20 bg-white/[0.04]" />
      <ArrowUp
        aria-hidden="true"
        className="relative size-6 stroke-[2.5] transition-transform duration-300 group-hover:-translate-y-0.5"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-[calc(100%+0.75rem)] whitespace-nowrap rounded-full border border-white/10 bg-[#102d26]/95 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg backdrop-blur-xl transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        Haut de page
      </span>
    </button>
  );
}
