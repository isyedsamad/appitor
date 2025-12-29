export const buildMonthsForSession = (session) => {
  if (!session) return [];
  const months = [
    { m: 4, name: "April", q:true, y:true },
    { m: 5, name: "May" },
    { m: 6, name: "June" },
    { m: 7, name: "July", q: true },
    { m: 8, name: "August" },
    { m: 9, name: "September" },
    { m: 10, name: "October", q: true },
    { m: 11, name: "November" },
    { m: 12, name: "December" },
    { m: 1, name: "January", q: true },
    { m: 2, name: "February" },
    { m: 3, name: "March" },
  ];
  const [startYear, endYearShort] = session.id.split("-");
  const startYearNum = Number(startYear);
  const endYearNum = Number(`20${endYearShort}`);
  return months.map((m, index) => {
    const year =
      m.m >= 4 ? startYearNum : endYearNum;
    return {
      key: `${year}-${String(m.m).padStart(2, "0")}`,
      label: `${m.name} ${year}`,
      q: m.q || false,
      y: index === 0,
    };
  });
};
