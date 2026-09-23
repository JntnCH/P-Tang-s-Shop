import { PageHeader } from "@/components/layout/PageHeader";
import { PhaseNotice } from "@/components/layout/PhaseNotice";
import { Card, CardContent } from "@/components/ui/card";

export function PlaceholderPage({
  title,
  description,
  phase,
  notice,
  sections,
}: {
  title: string;
  description: string;
  phase: string;
  notice: string;
  sections: string[];
}) {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={title} description={description} />
      <div className="mb-6 grid gap-3 md:grid-cols-2">
        {sections.map((s) => (
          <Card key={s}>
            <CardContent className="flex min-h-24 items-center text-sm font-medium text-muted-foreground">
              {s}
            </CardContent>
          </Card>
        ))}
      </div>
      <PhaseNotice phase={phase}>{notice}</PhaseNotice>
    </div>
  );
}
