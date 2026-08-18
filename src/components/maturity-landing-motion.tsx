"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE_PREMIUM = "cubic-bezier(0.16, 1, 0.3, 1)";
const MATURITY_SCROLL_SELECTOR = "[data-maturity-scroll]";

function getMaturityScrollRoot(): HTMLElement {
  if (typeof document === "undefined") {
    return null as unknown as HTMLElement;
  }
  return (
    (document.querySelector(MATURITY_SCROLL_SELECTOR) as HTMLElement | null) ??
    document.documentElement
  );
}

function isDocumentScrollRoot(root: HTMLElement): boolean {
  return root === document.documentElement || root === document.body;
}

function getScrollTop(root: HTMLElement): number {
  return isDocumentScrollRoot(root) ? window.scrollY : root.scrollTop;
}

function getScrollMetrics(root: HTMLElement): { scrollTop: number; scrollable: number } {
  if (isDocumentScrollRoot(root)) {
    return {
      scrollTop: window.scrollY,
      scrollable: document.documentElement.scrollHeight - window.innerHeight,
    };
  }
  return {
    scrollTop: root.scrollTop,
    scrollable: root.scrollHeight - root.clientHeight,
  };
}

function subscribeMaturityScroll(onScroll: () => void): () => void {
  const root = getMaturityScrollRoot();
  const handler = () => onScroll();
  if (isDocumentScrollRoot(root)) {
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }
  root.addEventListener("scroll", handler, { passive: true });
  return () => root.removeEventListener("scroll", handler);
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

function useScrollY(): number {
  const [scrollY, setScrollY] = useState(0);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrollY(getScrollTop(getMaturityScrollRoot()));
          ticking = false;
        });
        ticking = true;
      }
    };
    onScroll();
    return subscribeMaturityScroll(onScroll);
  }, [reduced]);

  return scrollY;
}

/** Thin progress line — Linear / Stripe style. */
export function ScrollProgressBar() {
  const reduced = usePrefersReducedMotion();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const onScroll = () => {
      const { scrollTop, scrollable } = getScrollMetrics(getMaturityScrollRoot());
      setProgress(scrollable > 0 ? scrollTop / scrollable : 0);
    };
    onScroll();
    return subscribeMaturityScroll(onScroll);
  }, [reduced]);

  if (reduced) return null;

  return (
    <div
      className="pointer-events-none sticky top-0 z-[60] h-[2px] w-full origin-left bg-[var(--theme-brand)] shadow-[0_0_12px_color-mix(in_srgb,var(--theme-brand)_60%,transparent)]"
      style={{ transform: `scaleX(${progress})` }}
      aria-hidden
    />
  );
}

/** Header that tightens on scroll. */
export function useScrolledPast(threshold = 48): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(getScrollTop(getMaturityScrollRoot()) > threshold);
    onScroll();
    return subscribeMaturityScroll(onScroll);
  }, [threshold]);

  return scrolled;
}

/** True when a `[data-header-theme="light"]` section is in the upper viewport. */
export function useLightHeaderZone(): boolean {
  const [light, setLight] = useState(false);

  useEffect(() => {
    const targets = document.querySelectorAll('[data-header-theme="light"]');
    if (!targets.length) return;

    const root = getMaturityScrollRoot();
    const observer = new IntersectionObserver(
      (entries) => {
        setLight(entries.some((e) => e.isIntersecting));
      },
      {
        threshold: 0,
        root: isDocumentScrollRoot(root) ? null : root,
        rootMargin: "-64px 0px -55% 0px",
      }
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return light;
}

/** Subtle vertical parallax tied to scroll. */
export function Parallax({
  children,
  className,
  speed = 0.12,
}: {
  children: ReactNode;
  className?: string;
  speed?: number;
}) {
  const scrollY = useScrollY();
  const reduced = usePrefersReducedMotion();

  return (
    <div
      className={className}
      style={
        reduced
          ? undefined
          : ({ transform: `translate3d(0, ${scrollY * speed}px, 0)` } as CSSProperties)
      }
    >
      {children}
    </div>
  );
}

/** Fade + rise on first paint (hero). */
export function MountReveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: ElementType;
}) {
  const reduced = usePrefersReducedMotion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (reduced) {
      setReady(true);
      return;
    }
    const id = window.setTimeout(() => setReady(true), 40 + delay);
    return () => window.clearTimeout(id);
  }, [reduced, delay]);

  return (
    <Tag
      className={cn("will-change-[transform,opacity]", className)}
      style={{
        transition: `opacity 1.1s ${EASE_PREMIUM}, transform 1.1s ${EASE_PREMIUM}`,
        transitionDelay: `${delay}ms`,
        opacity: ready ? 1 : 0,
        transform: ready ? "translateY(0) scale(1)" : "translateY(28px) scale(0.98)",
      }}
    >
      {children}
    </Tag>
  );
}

/** Premium scroll reveal — blur, scale, and rise. */
export function ScrollReveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
  variant = "premium",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: ElementType;
  variant?: "default" | "premium";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (reduced) {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced]);

  const Component = Tag as ElementType;
  const isPremium = variant === "premium";

  return (
    <Component
      ref={ref}
      className={cn("will-change-[transform,opacity,filter]", className)}
      style={{
        transition: `opacity 1s ${EASE_PREMIUM}, transform 1s ${EASE_PREMIUM}, filter 1s ${EASE_PREMIUM}`,
        transitionDelay: `${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible
          ? "translateY(0) scale(1)"
          : isPremium
            ? "translateY(48px) scale(0.96)"
            : "translateY(32px) scale(1)",
        filter: visible ? "blur(0px)" : isPremium ? "blur(6px)" : "blur(0px)",
      }}
    >
      {children}
    </Component>
  );
}

/** Section wrapper with scroll-linked background glow. */
export function ScrollSection({
  children,
  className,
  glow = "indigo",
  id,
  "data-header-theme": headerTheme,
}: {
  children: ReactNode;
  className?: string;
  glow?: "indigo" | "emerald" | "none";
  id?: string;
  "data-header-theme"?: "light" | "dark";
}) {
  const scrollY = useScrollY();
  const reduced = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(false);
  const glowColors = {
    indigo: "rgba(99,102,241,0.12)",
    emerald: "rgba(16,185,129,0.08)",
    none: "transparent",
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const glowTransform =
    !mounted || reduced ? "translateX(-50%)" : `translate3d(-50%, ${scrollY * 0.04}px, 0)`;

  return (
    <section id={id} data-header-theme={headerTheme} className={cn("relative overflow-hidden", className)}>
      {glow !== "none" && (
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[min(100%,900px)] -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background: `radial-gradient(ellipse, ${glowColors[glow]}, transparent 70%)`,
            transform: glowTransform,
          }}
        />
      )}
      <div className="relative">{children}</div>
    </section>
  );
}

/** Gradient seam between sections. */
export function SectionSeam({ from = "dark", to = "light" }: { from?: "dark" | "light"; to?: "dark" | "light" }) {
  const top = from === "dark" ? "#020617" : "#f8fafc";
  const bottom = to === "dark" ? "#020617" : "#f8fafc";
  return (
    <div
      aria-hidden
      className="h-px w-full"
      style={{ background: `linear-gradient(90deg, transparent, ${top}, ${bottom}, transparent)` }}
    />
  );
}

/** Subtle film grain for depth. */
export function FilmGrain() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-overlay"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }}
    />
  );
}

/** Floating CTA after scrolling past hero. */
export function StickyScrollCTA() {
  const [visible, setVisible] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const onScroll = () => setVisible(getScrollTop(getMaturityScrollRoot()) > 520);
    onScroll();
    return subscribeMaturityScroll(onScroll);
  }, [reduced]);

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transition-all duration-500",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-8 opacity-0"
      )}
      style={{ transitionTimingFunction: EASE_PREMIUM }}
    >
      <Link
        href="/maturity-assessment/new"
        className="group flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/90 px-5 py-2.5 text-sm font-semibold text-white shadow-2xl shadow-indigo-500/25 backdrop-blur-md transition-transform hover:scale-[1.03]"
      >
        Start your maturity diagnostic
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

export function HeroAmbientOrbs() {
  const scrollY = useScrollY();
  const reduced = usePrefersReducedMotion();
  const y = reduced ? 0 : scrollY * 0.08;

  return (
    <>
      <div
        aria-hidden
        className="animate-maturity-float pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-indigo-500/25 blur-3xl"
        style={{ transform: `translate3d(0, ${y}px, 0)` }}
      />
      <div
        aria-hidden
        className="animate-maturity-float-delayed pointer-events-none absolute -right-16 top-32 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl"
        style={{ transform: `translate3d(0, ${-y * 0.6}px, 0)` }}
      />
      <div
        aria-hidden
        className="animate-maturity-pulse-ring pointer-events-none absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl"
      />
    </>
  );
}

export function ShimmerGradientText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block bg-clip-text text-transparent animate-maturity-shimmer",
        className
      )}
      style={{
        backgroundImage:
          "linear-gradient(to right, var(--theme-shimmer-from), var(--theme-shimmer-via), var(--theme-shimmer-to))",
        backgroundSize: "200% auto",
      }}
    >
      {children}
    </span>
  );
}

export function HoverLift({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
        "hover:-translate-y-1.5 hover:shadow-xl",
        className
      )}
    >
      {children}
    </div>
  );
}
