// Shared helpers to round numeric values to 2 decimal places in reports.
// round2  - returns a string with exactly 2 decimals (safe for display)
// fmt2    - returns a comma-grouped string with exactly 2 decimals (display with separators)
// round2n - returns a Number rounded to 2 decimals (safe for further calculations)

export const round2 = (value) => {
  if (value === null || value === undefined || value === "") return value ?? "";
  const num = Number(value);
  if (isNaN(num)) return value;
  return num.toFixed(2);
};

export const fmt2 = (value) => {
  if (value === null || value === undefined || value === "") return "";
  const num = Number(value);
  if (isNaN(num)) return "";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const round2n = (value) => {
  if (value === null || value === undefined || value === "" || isNaN(Number(value))) return 0;
  return Number(Number(value).toFixed(2));
};
