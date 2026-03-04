const { getClassHeatmapColor } = require("@/lib/school/attendance/heatmap");

export function ClassAttendanceHeatmap({ days, summary, totalStudents }) {
  return (
    <div className="rounded-xl bg-(--bg-card)">
      <div className="flex justify-start items-center gap-2 flex-wrap">
        {days.map(d => {
          const s = summary[d];
          if (!s) {
            return (
              <div
                key={d}
                className="w-12 h-14 flex items-center rounded-md justify-center bg-(--bg) text-xs"
              >
                -
              </div>
            );
          }
          const total =
            s.P + s.A + s.L + s.M;
          const presentScore =
            s.P + 0.5 * (s.L + s.M);
          const percent =
            total === 0 ? 0 : Math.round((presentScore / total) * 100);
          return (
            <div
              key={d}
              title={`Day ${d} - ${percent}% Present`}
              className={`w-12 cursor-pointer h-14 flex flex-col shadow-xs border border-(--border) items-center rounded-md justify-center gap-1 text-xs font-semibold ${getClassHeatmapColor(
                percent
              )}`}
            >
              <span>{d == 0 ? '0' : d.toString().padStart(2, '0')}</span>
              <span>{percent}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
