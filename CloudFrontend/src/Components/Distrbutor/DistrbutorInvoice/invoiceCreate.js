/** True when every invoice line was priced from the distributor price list. */
export const canCreateInvoice = (lines) =>
  Array.isArray(lines) &&
  lines.length > 0 &&
  lines.every((line) => line?.hasPriceList === true)
