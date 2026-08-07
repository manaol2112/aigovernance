"use client";

import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "@/components/ui/toast";

export function DeleteMaturitySurveyButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/maturity-surveys/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast("Survey deleted.", { variant: "success" });
      router.refresh();
    } catch {
      toast("Failed to delete survey.", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
      title={`Delete ${title}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  );
}
