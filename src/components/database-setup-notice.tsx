import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DatabaseSetupNotice({
  title = "Database setup required",
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <div className="mx-auto max-w-2xl py-12">
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-amber-950">
          <p>{message}</p>
          <pre className="overflow-x-auto rounded-lg bg-white/80 p-3 text-xs text-slate-700 ring-1 ring-amber-200">
            npx prisma generate{"\n"}npx prisma db push
          </pre>
          <p className="text-amber-800">
            Then restart the dev server with <code className="rounded bg-white/80 px-1">npm run dev</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
