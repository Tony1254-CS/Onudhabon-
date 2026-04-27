import type { StudentRow } from "@/routes/dashboard";

function lerpColor(t: number) {
  // 0 = dark red, 1 = bright gold
  const r1 = [120, 20, 30]; // dark red
  const r2 = [245, 158, 11]; // gold
  const c = r1.map((a, i) => Math.round(a + (r2[i] - a) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

export function ConceptHeatmap({ students, topConcepts, matrix }: {
  students: StudentRow[];
  topConcepts: string[];
  matrix: Record<string, Record<string, number>>; // matrix[studentId][concept] = mastery
}) {
  if (!students.length || !topConcepts.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-white/50">
        কোনো ডেটা নেই — শিক্ষার্থীরা সেশন সম্পন্ন করলে এখানে দেখা যাবে।
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-1 text-xs"
        style={{ gridTemplateColumns: `140px repeat(${topConcepts.length}, minmax(70px, 1fr))` }}
      >
        <div />
        {topConcepts.map((c) => (
          <div key={c} className="truncate p-2 text-center font-medium text-white/70" title={c}>{c}</div>
        ))}
        {students.map((s) => (
          <FragmentRow key={s.id} student={s} concepts={topConcepts} row={matrix[s.id] || {}} />
        ))}
      </div>
    </div>
  );
}

function FragmentRow({ student, concepts, row }: { student: StudentRow; concepts: string[]; row: Record<string, number> }) {
  return (
    <>
      <div className="flex items-center truncate p-2 text-white/80">{student.full_name || "Unnamed"}</div>
      {concepts.map((c) => {
        const v = row[c];
        if (v === undefined) {
          return <div key={c} className="rounded-md bg-white/[0.03] p-2" title={`${student.full_name} — ${c} — N/A`} />;
        }
        return (
          <div
            key={c}
            className="group relative rounded-md p-2 text-center font-semibold text-black/80 transition-transform hover:scale-105"
            style={{ background: lerpColor(v) }}
            title={`${student.full_name} — ${c} — ${Math.round(v * 100)}%`}
          >
            {Math.round(v * 100)}
            {v < 0.4 && <span className="ml-1">⚠</span>}
          </div>
        );
      })}
    </>
  );
}
