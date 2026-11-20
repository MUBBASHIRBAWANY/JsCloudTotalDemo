export const distributorLabel = (distributor) => {
  if (!distributor) return "";
  return `${distributor.DistrbutorName || ""} ${distributor.OldCode || ""}`.trim();
};

export const buildSaleOrderRows = (documents, distributors, cities, cityId) => {
  const distById = new Map((distributors || []).map((item) => [String(item._id), item]));
  const cityById = new Map((cities || []).map((item) => [String(item._id), item.CityName || ""]));
  const rows = (documents || []).map((item) => {
    const distributor = distById.get(String(item?.Distrbutor ?? ""));
    return {
      ...item,
      Distrbutor: distributorLabel(distributor),
      City: cityById.get(String(distributor?.City || "")) || "",
      citi1: distributor?.City || "",
    };
  });
  if (!cityId) return rows;
  return rows.filter((item) => String(item.citi1) === String(cityId));
};

export const canEditSaleOrder = (order) => String(order?.PostStatus || "") !== "Deliverd";
