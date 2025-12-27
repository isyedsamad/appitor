export function getHeatmapColor(status) {
  if (!status) return "bg-slate-100 dark:bg-slate-800";

  const score =
    status === "P" ? 1 :
    status === "L" || status === "M" ? 0.5 :
    status === "A" ? 0 : null;

  if (score === 1) return "bg-green-500";
  if (score >= 0.7) return "bg-green-400";
  if (score >= 0.5) return "bg-yellow-400";
  if (score > 0) return "bg-orange-400";
  return "bg-red-500";
}


export function getClassHeatmapColor(percent) {
  if (percent >= 90)
    return "bg-(--status-p-bg) text-(--status-p-text)";
  if (percent >= 75)
    return "bg-(--status-p-bg) text-(--status-p-text)";
  if (percent >= 60)
    return "bg-(--status-l-bg) text-(--status-l-text)";
  if (percent >= 40)
    return "bg-(--status-a-bg) text-(--status-a-text)";
  return "bg-(--bg-card) text-(--text)";
}
