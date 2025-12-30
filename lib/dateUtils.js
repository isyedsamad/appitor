export function formatInputDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}-${m}-${y}`;
}

export function toInputDate(dateStr) {
  if (!dateStr) return "";
  const [d, m, y] = dateStr.split("-");
  return `${y}-${m}-${d}`;
}

export function todayDDMMYYYY() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function formatDate(input = new Date()) {
  const date = input instanceof Date ? input : new Date(input);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${day}-${month}-${year}`;
}

export function formatMonth(date = new Date()) {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${m}-${y}`;
}

export function formatMonthMMYYYYToYYYYMM(value) {
  const split = value.split('-');
  return `${split[1]}-${split[0]}`;
}
