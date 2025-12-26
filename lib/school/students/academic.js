export function buildNextClassMap(classes = []) {
  const sorted = [...classes].sort(
    (a, b) => a.order - b.order
  );
  const map = {};
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    map[current.name] = next
      ? next.name
      : null;
  }
  return map;
}
