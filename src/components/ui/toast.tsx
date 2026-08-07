"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "default" | "success" | "error";

type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
};

type ToastState = { items: ToastItem[] };

type ToastAction =
  | { type: "push"; item: ToastItem }
  | { type: "dismiss"; id: string };

let toastState: ToastState = { items: [] };
const listeners = new Set<() => void>();
let nextId = 0;

function emit() {
  listeners.forEach((l) => l());
}

function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case "push":
      return { items: [...state.items, action.item].slice(-4) };
    case "dismiss":
      return { items: state.items.filter((t) => t.id !== action.id) };
    default:
      return state;
  }
}

function dispatch(action: ToastAction) {
  toastState = toastReducer(toastState, action);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return toastState;
}

export function toast(message: string, options?: { variant?: ToastVariant; durationMs?: number }) {
  const id = `toast-${++nextId}`;
  const variant = options?.variant ?? "default";
  dispatch({ type: "push", item: { id, message, variant } });
  const duration = options?.durationMs ?? (variant === "error" ? 6000 : 4500);
  window.setTimeout(() => dispatch({ type: "dismiss", id }), duration);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const dismiss = useCallback((id: string) => {
    dispatch({ type: "dismiss", id });
  }, []);

  return (
    <>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
        aria-live="polite"
        aria-relevant="additions"
      >
        {state.items.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
        ))}
      </div>
    </>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const Icon = item.variant === "error" ? AlertCircle : item.variant === "success" ? CheckCircle2 : null;

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm animate-in slide-in-from-bottom-2",
        item.variant === "error" && "border-rose-200 bg-rose-50 text-rose-900",
        item.variant === "success" && "border-emerald-200 bg-emerald-50 text-emerald-900",
        item.variant === "default" && "border-slate-200 bg-white text-slate-900"
      )}
      role="status"
    >
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0" />}
      <p className="min-w-0 flex-1 text-sm leading-snug">{item.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded-md p-0.5 opacity-60 hover:opacity-100"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** Hook for components that prefer context (optional). */
const ToastContext = createContext<typeof toast | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  return useMemo(() => ctx ?? toast, [ctx]);
}
