const ALL = "all";

const asId = (id) => {
  if (id && typeof id === "object") return String(id._id || id.id || "");
  return id == null ? "" : String(id);
};

const profileOf = (user) => {
  if (user?.val && typeof user.val === "object") return user.val;
  return user && typeof user === "object" && !Array.isArray(user) ? user : null;
};

// null = every distributor (admin, or Vendor/distributor "all").
// [] = nothing assigned, so the report stays empty.
// A distributor login is assigned to its own _id.
export const assignedDistributorIds = (user) => {
  const raw = profileOf(user);
  if (!raw) return [];
  if (raw.email === "admin@js.com") return null;
  const vendor = Array.isArray(raw.Vendor) ? raw.Vendor : [];
  if (vendor.some((id) => asId(id).toLowerCase() === ALL)) return null;
  if (String(raw.distributor || "").toLowerCase() === ALL) return null;
  const ids = [...new Set(
    vendor.map(asId).filter((id) => id && id.toLowerCase() !== ALL)
  )];
  if (ids.length) return ids;
  if (raw.distributor) return [asId(raw.distributor)];
  if (raw._id) return [asId(raw._id)];
  return [];
};

export const listFromResponse = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};
