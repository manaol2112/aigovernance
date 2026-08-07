"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Compass,
  FileText,
  Gauge,
  Lock,
  Map,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MountReveal, Parallax, usePrefersReducedMotion } from "@/components/maturity-landing-motion";

const CYCLE_MS = 4800;

type SlideId = "score" | "heatmap" | "gaps" | "roadmap" | "frameworks" | "executive";

type SlideDef = {
  id: SlideId;
  label: string;
  icon: LucideIcon;
};

const SLIDES: SlideDef[] = [
  { id: "score", label: "Maturity score", icon: Gauge },
  { id: "heatmap", label: "Pillar heatmap", icon: BarChart3 },
  { id: "gaps", label: "Gap analysis", icon: AlertTriangle },
  { id: "roadmap", label: "90-day plan", icon: Map },
  { id: "frameworks", label: "Framework map", icon: Shield },
  { id: "executive", label: "Board brief", icon: FileText },
];

const HEATMAP_PILLARS: {
  short: string;
  pct: number;
  tone: "emerald" | "amber" | "red";
  weakest?: boolean;
}[] = [
  { short: "Gov", pct: 72, tone: "emerald" },
  { short: "Fair", pct: 41, tone: "amber" },
  { short: "Priv", pct: 58, tone: "amber" },
  { short: "Safe", pct: 63, tone: "emerald" },
  { short: "Sec", pct: 38, tone: "red", weakest: true },
  { short: "Trans", pct: 55, tone: "amber" },
  { short: "Hum", pct: 67, tone: "emerald" },
  { short: "Comp", pct: 61, tone: "emerald" },
  { short: "3rd", pct: 44, tone: "amber" },
  { short: "Sys", pct: 49, tone: "amber" },
];

const GAP_ITEMS = [
  {
    severity: "critical" as const,
    pillar: "Security",
    code: "SEC-004",
    title: "No adversarial testing or red-team program",
  },
  {
    severity: "critical" as const,
    pillar: "Fairness",
    code: "FAI-002",
    title: "Bias monitoring not operational in production",
  },
  {
    severity: "high" as const,
    pillar: "Privacy",
    code: "PRI-007",
    title: "Training data lineage gaps across vendors",
  },
];

const ROADMAP_PHASES = [
  {
    phase: "0–90 days",
    tone: "red",
    items: ["Establish AI risk committee charter", "Deploy model inventory register"],
  },
  {
    phase: "3–6 months",
    tone: "amber",
    items: ["Launch bias monitoring pipeline", "Complete EU AI Act gap assessment"],
  },
  {
    phase: "6–12 months",
    tone: "indigo",
    items: ["Achieve ISO 42001 readiness review", "Board-level maturity reporting"],
  },
];

const FRAMEWORK_ROWS = [
  { name: "NIST AI RMF", pct: 68, status: "partial" as const },
  { name: "ISO 42001", pct: 42, status: "gap" as const },
  { name: "EU AI Act", pct: 55, status: "partial" as const },
  { name: "OECD AI", pct: 71, status: "aligned" as const },
];

const TONE_BG: Record<string, string> = {
  emerald: "bg-emerald-500/80",
  amber: "bg-amber-500/80",
  red: "bg-red-500/80",
};

const TONE_TEXT: Record<string, string> = {
  emerald: "text-emerald-300",
  amber: "text-amber-300",
  red: "text-red-300",
};

function useAnimatedValue(target: number, active: boolean, duration = 1200) {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);

  useEffect(() => {
    if (!active) {
      setValue(reduced ? target : 0);
      return;
    }
    if (reduced) {
      setValue(target);
      return;
    }

    const start = performance.now();
    let frame: number;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, target, duration, reduced]);

  return value;
}

function ScoreSlide({ active }: { active: boolean }) {
  const score = useAnimatedValue(54, active);
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const dash = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-28 w-28 items-center justify-center">
        <svg viewBox="0 0 96 96" className="h-full w-full -rotate-90">
          <circle cx={48} cy={48} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} />
          <circle
            cx={48}
            cy={48}
            r={r}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            className="transition-[stroke-dasharray] duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums text-white">{score}%</span>
          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
            Overall
          </span>
        </div>
      </div>
      <p className="mt-3 text-sm font-semibold text-amber-400">Developing maturity</p>
      <div className="mt-4 flex w-full max-w-[200px] gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-all duration-700",
              n <= 3 ? "bg-amber-500" : "bg-white/10"
            )}
            style={{ transitionDelay: active ? `${n * 80}ms` : "0ms" }}
          />
        ))}
      </div>
      <p className="mt-3 text-center text-[10px] text-slate-500">
        Weighted across 10 governance pillars
      </p>
    </div>
  );
}

function HeatmapSlide({ active }: { active: boolean }) {
  return (
    <div>
      <p className="mb-3 text-center text-[10px] font-medium uppercase tracking-widest text-slate-500">
        10-pillar maturity heatmap
      </p>
      <div className="grid grid-cols-5 gap-1.5">
        {HEATMAP_PILLARS.map((p, i) => (
          <div
            key={p.short}
            className={cn(
              "relative flex aspect-square flex-col items-center justify-center rounded-lg border transition-all duration-500",
              p.weakest
                ? "border-red-500/50 bg-red-500/15 animate-maturity-heatmap-pulse"
                : "border-white/10 bg-white/5",
              active && "animate-maturity-fade-in-up"
            )}
            style={{ animationDelay: active ? `${i * 50}ms` : "0ms" }}
          >
            <span className={cn("text-[9px] font-bold", TONE_TEXT[p.tone])}>{p.short}</span>
            <span className="mt-0.5 text-[10px] font-semibold tabular-nums text-white">
              {p.pct}%
            </span>
            {p.weakest && (
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[7px] font-bold text-white">
                !
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-[11px] text-red-300/90">
        Security is your blind spot — 38% vs 72% governance
      </p>
    </div>
  );
}

function GapsSlide({ active }: { active: boolean }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">
        Priority gaps · board-ready
      </p>
      {GAP_ITEMS.map((gap, i) => (
        <div
          key={gap.code}
          className={cn(
            "rounded-xl border px-3 py-2.5 transition-all",
            gap.severity === "critical"
              ? "border-red-500/25 bg-red-500/10"
              : "border-amber-500/25 bg-amber-500/10",
            active && "animate-maturity-fade-in-up"
          )}
          style={{ animationDelay: active ? `${i * 120}ms` : "0ms" }}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide",
                gap.severity === "critical"
                  ? "bg-red-500/20 text-red-300"
                  : "bg-amber-500/20 text-amber-300"
              )}
            >
              {gap.severity}
            </span>
            <span className="font-mono text-[9px] text-slate-500">{gap.code}</span>
          </div>
          <p className="mt-1 text-[11px] font-semibold text-white">{gap.title}</p>
          <p className="mt-0.5 text-[9px] text-slate-500">{gap.pillar} pillar</p>
        </div>
      ))}
    </div>
  );
}

function RoadmapSlide({ active }: { active: boolean }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">
        Phased remediation roadmap
      </p>
      <div className="grid grid-cols-3 gap-2">
        {ROADMAP_PHASES.map((phase, pi) => (
          <div
            key={phase.phase}
            className={cn(
              "rounded-xl border border-white/10 bg-white/[0.04] p-2",
              active && "animate-maturity-fade-in-up"
            )}
            style={{ animationDelay: active ? `${pi * 100}ms` : "0ms" }}
          >
            <p
              className={cn(
                "text-[9px] font-bold uppercase tracking-wide",
                phase.tone === "red"
                  ? "text-red-300"
                  : phase.tone === "amber"
                    ? "text-amber-300"
                    : "text-indigo-300"
              )}
            >
              {phase.phase}
            </p>
            <ul className="mt-1.5 space-y-1">
              {phase.items.map((item, ii) => (
                <li
                  key={item}
                  className="flex gap-1 text-[9px] leading-snug text-slate-400"
                  style={{ animationDelay: active ? `${pi * 100 + ii * 60}ms` : "0ms" }}
                >
                  <Compass className="mt-0.5 h-2.5 w-2.5 shrink-0 text-slate-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function FrameworksSlide({ active }: { active: boolean }) {
  const statusStyle = {
    aligned: "text-emerald-300 bg-emerald-500/15",
    partial: "text-amber-300 bg-amber-500/15",
    gap: "text-red-300 bg-red-500/15",
  };

  return (
    <div className="space-y-2.5">
      <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">
        Regulatory alignment snapshot
      </p>
      {FRAMEWORK_ROWS.map((fw, i) => (
        <div
          key={fw.name}
          className={cn(active && "animate-maturity-fade-in-up")}
          style={{ animationDelay: active ? `${i * 80}ms` : "0ms" }}
        >
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-300">{fw.name}</span>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[8px] font-bold uppercase",
                statusStyle[fw.status]
              )}
            >
              {fw.status}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-1000 ease-out",
                fw.status === "aligned"
                  ? TONE_BG.emerald
                  : fw.status === "partial"
                    ? TONE_BG.amber
                    : TONE_BG.red
              )}
              style={{ width: active ? `${fw.pct}%` : "0%" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ExecutiveSlide({ active }: { active: boolean }) {
  const lines = [
    "Overall AI governance maturity sits at Developing (54%).",
    "Security and fairness pillars present critical exposure.",
    "Immediate action: establish adversarial testing and bias monitoring.",
    "Board should prioritize 90-day remediation charter.",
  ];

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">
        Executive narrative · audit-ready
      </p>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="mb-2 flex items-center gap-2 border-b border-white/5 pb-2">
          <FileText className="h-3.5 w-3.5 text-indigo-400" />
          <span className="text-[10px] font-semibold text-indigo-300">
            Sample organization · AI Maturity Brief
          </span>
        </div>
        <div className="space-y-2">
          {lines.map((line, i) => (
            <p
              key={i}
              className={cn(
                "text-[10px] leading-relaxed text-slate-400",
                active && "animate-maturity-typewriter-line"
              )}
              style={{
                animationDelay: active ? `${i * 400}ms` : "0ms",
                opacity: active ? undefined : 0.4,
              }}
            >
              <span className="mr-1.5 text-indigo-500/60">▸</span>
              {line}
            </p>
          ))}
        </div>
      </div>
      <p className="text-center text-[9px] text-slate-600">
        Exportable PDF for board & audit committee
      </p>
    </div>
  );
}

function SlideContent({ id, active }: { id: SlideId; active: boolean }) {
  switch (id) {
    case "score":
      return <ScoreSlide active={active} />;
    case "heatmap":
      return <HeatmapSlide active={active} />;
    case "gaps":
      return <GapsSlide active={active} />;
    case "roadmap":
      return <RoadmapSlide active={active} />;
    case "frameworks":
      return <FrameworksSlide active={active} />;
    case "executive":
      return <ExecutiveSlide active={active} />;
  }
}

export function MaturityReportPreviewShowcase() {
  const reduced = usePrefersReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [cycleKey, setCycleKey] = useState(0);

  const goTo = useCallback((index: number) => {
    setActiveIndex(index);
    setCycleKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (reduced || paused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % SLIDES.length);
      setCycleKey((k) => k + 1);
    }, CYCLE_MS);
    return () => window.clearInterval(timer);
  }, [reduced, paused]);

  return (
    <Parallax speed={-0.06} className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="animate-maturity-float pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-indigo-500/30 blur-3xl" />
      <div className="animate-maturity-float-delayed pointer-events-none absolute -left-4 bottom-8 h-24 w-24 rounded-full bg-violet-500/20 blur-3xl" />

      <MountReveal delay={200} className="relative">
        {/* Stacked depth cards */}
        <div
          aria-hidden
          className="absolute inset-x-3 top-2 h-full rounded-2xl border border-white/5 bg-slate-800/40"
          style={{ transform: "translateY(6px) scale(0.97)" }}
        />
        <div
          aria-hidden
          className="absolute inset-x-1.5 top-1 h-full rounded-2xl border border-white/5 bg-slate-800/60"
          style={{ transform: "translateY(3px) scale(0.985)" }}
        />

        <div
          className="relative overflow-hidden rounded-2xl border border-white/15 bg-slate-900/85 shadow-2xl shadow-indigo-500/25 backdrop-blur-xl"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          {/* Header + tabs */}
          <div className="border-b border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-300">
                What you&apos;ll receive
              </p>
              <Badge className="border-emerald-500/30 bg-emerald-500/10 text-[9px] text-emerald-300">
                {paused ? "Paused" : "Live preview"}
              </Badge>
            </div>
            <div className="mt-2.5 flex gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none]">
              {SLIDES.map((slide, i) => {
                const Icon = slide.icon;
                const isActive = i === activeIndex;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => goTo(i)}
                    className={cn(
                      "relative flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-semibold transition-all",
                      isActive
                        ? "bg-indigo-500/20 text-indigo-200"
                        : "text-slate-500 hover:bg-white/5 hover:text-slate-400"
                    )}
                    aria-current={isActive ? "true" : undefined}
                  >
                    <Icon className="h-3 w-3" />
                    <span className="hidden sm:inline">{slide.label}</span>
                  </button>
                );
              })}
            </div>
            {!reduced && (
              <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-white/10">
                <div
                  key={cycleKey}
                  className="h-full origin-left rounded-full bg-indigo-500/80 animate-maturity-report-progress"
                  style={{ animationDuration: `${CYCLE_MS}ms` }}
                />
              </div>
            )}
          </div>

          {/* Slide body */}
          <div className="relative min-h-[220px] p-5">
            {SLIDES.map((slide, i) => (
              <div
                key={slide.id}
                className={cn(
                  "transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                  i === activeIndex
                    ? "relative opacity-100 translate-y-0 scale-100"
                    : "pointer-events-none absolute inset-5 opacity-0 translate-y-3 scale-[0.98]"
                )}
                aria-hidden={i !== activeIndex}
              >
                <SlideContent id={slide.id} active={i === activeIndex} />
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 bg-slate-950/60 px-4 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                <Lock className="h-3 w-3" />
                Confidential to your organization
              </div>
              <div className="flex gap-1">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goTo(i)}
                    className={cn(
                      "h-1 rounded-full transition-all",
                      i === activeIndex ? "w-4 bg-indigo-400" : "w-1 bg-white/20 hover:bg-white/40"
                    )}
                    aria-label={`Show report ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </MountReveal>
    </Parallax>
  );
}
