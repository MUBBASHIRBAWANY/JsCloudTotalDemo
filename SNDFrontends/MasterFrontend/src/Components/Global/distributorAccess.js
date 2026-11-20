export const ALL_DISTRIBUTORS = "all";

export const isAdminUser = (user) => user?.email === "admin@js.com";

export const canSeeAllDistributors = (user) => {
  if (isAdminUser(user)) return true;
  const vendor = user?.Vendor;
  if (!Array.isArray(vendor)) return false;
  return vendor.some((id) => String(id).toLowerCase() === ALL_DISTRIBUTORS);
};

export const getAssignedDistributorIds = (user) => {
  if (canSeeAllDistributors(user)) return null;
  const vendor = Array.isArray(user?.Vendor)
    ? user.Vendor.filter((id) => id && String(id).toLowerCase() !== ALL_DISTRIBUTORS)
    : [];
  if (!vendor.length) return null;
  return vendor;
};

export const filterByAssignedDistributors = (list, user, getId) => {
  const ids = getAssignedDistributorIds(user);
  if (!ids) return list || [];
  const assigned = new Set(ids.map(String));
  return (list || []).filter((item) => {
    const raw = getId(item);
    if (Array.isArray(raw)) {
      return raw.some((id) => assigned.has(String(id)));
    }
    return assigned.has(String(raw));
  });
};

export const filterDistributorOptions = (distributors, user) => {
  const ids = getAssignedDistributorIds(user);
  if (!ids) return distributors || [];
  const assigned = new Set(ids.map(String));
  return (distributors || []).filter((d) => assigned.has(String(d._id)));
};

const idString = (id) => {
  if (id && typeof id === "object") return String(id._id || id.id || "");
  return id == null ? "" : String(id);
};

// null = every distributor (admin or Vendor/distributor "all").
// [] = no distributor assigned, so reports stay empty.
export const reportDistributorIds = (user) => {
  if (canSeeAllDistributors(user)) return null;
  if (String(user?.distributor || "").toLowerCase() === ALL_DISTRIBUTORS) return null;
  const vendor = Array.isArray(user?.Vendor) ? user.Vendor : [];
  const ids = vendor
    .map(idString)
    .filter((id) => id && id.toLowerCase() !== ALL_DISTRIBUTORS);
  if (ids.length) return ids;
  const single = idString(user?.distributor);
  if (single && single.toLowerCase() !== ALL_DISTRIBUTORS) return [single];
  return [];
};

export const distributorIdOf = (item) => {
  if (!item || typeof item !== "object") return "";
  return idString(
    item.Distrbutor ??
      item.Distributor ??
      item.DistributorId ??
      item.distributor ??
      item.distributorId
  );
};

export const listFromResponse = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.alldata)) return payload.alldata;
  return [];
};
