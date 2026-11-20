export const distributorLabel = (distributor) => {
  if (!distributor) return "";
  return `${distributor.DistrbutorName || ""} ${distributor.OldCode || ""}`.trim();
};

export const buildDcListRows = (documents, distributors) => {
  const byId = new Map((distributors || []).map((item) => [String(item._id), item]));
  return (documents || []).map((item) => {
    const match = byId.get(String(item?.Distrbutor ?? ""));
    const lineCount = item?.lineCount ?? (Array.isArray(item?.DCData) ? item.DCData.length : 0);
    return {
      ...item,
      Distrbutor: distributorLabel(match),
      lineCount,
    };
  });
};

export const canDeleteDc = (row) => String(row?.PostStatus || "") === "False";

export const dcStatusLabel = (status) => (status === "False" ? "Cancel" : (status || ""));
