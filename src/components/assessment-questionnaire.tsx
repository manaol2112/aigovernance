"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { titleCase } from "@/lib/utils";

const MATURITY_LEVELS = [
  "not_implemented",
  "initial",
  "developing",
  "defined",
  "managed",
  "optimized",
] as const;

type ControlItem = {
  id: string;
  code: string;
  title: string;
  description: string;
  maturity: string;
  evidenceNotes: string;
  implementationNotes: string;
};

export function AssessmentQuestionnaire({
  assessmentId,
  controls,
}: {
  assessmentId: string;
  controls: ControlItem[];
}) {
  const [items, setItems] = useState(controls);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function saveResponse(controlId: string) {
    const item = items.find((i) => i.id === controlId);
    if (!item) return;
    setSaving(controlId);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          controlId,
          maturity: item.maturity,
          evidenceNotes: item.evidenceNotes,
          implementationNotes: item.implementationNotes,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(controlId);
      setTimeout(() => setSaved(null), 2000);
    } catch {
      alert("Failed to save response");
    } finally {
      setSaving(null);
    }
  }

  function updateItem(controlId: string, field: keyof ControlItem, value: string) {
    setItems((prev) =>
      prev.map((i) => (i.id === controlId ? { ...i, [field]: value } : i))
    );
  }

  const maturityColor = (m: string) => {
    if (m === "optimized" || m === "managed") return "success";
    if (m === "defined" || m === "developing") return "warning";
    return "danger";
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Control Questionnaire</h2>
      {items.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <code className="text-xs font-mono text-slate-500">{item.code}</code>
              <Badge variant={maturityColor(item.maturity)}>{titleCase(item.maturity)}</Badge>
              {saved === item.id && <Badge variant="success">Saved</Badge>}
            </div>
            <CardTitle className="text-base">{item.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">{item.description}</p>
            <div>
              <label className="text-sm font-medium">Maturity Level</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={item.maturity}
                onChange={(e) => updateItem(item.id, "maturity", e.target.value)}
              >
                {MATURITY_LEVELS.map((l) => (
                  <option key={l} value={l}>{titleCase(l)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Evidence Notes</label>
              <textarea
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                rows={2}
                value={item.evidenceNotes}
                onChange={(e) => updateItem(item.id, "evidenceNotes", e.target.value)}
                placeholder="Reference evidence artifacts collected..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Implementation Notes</label>
              <textarea
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                rows={2}
                value={item.implementationNotes}
                onChange={(e) => updateItem(item.id, "implementationNotes", e.target.value)}
                placeholder="Describe current implementation status..."
              />
            </div>
            <Button
              size="sm"
              onClick={() => saveResponse(item.id)}
              disabled={saving === item.id}
            >
              {saving === item.id ? "Saving..." : "Save Response"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
