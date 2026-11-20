const asId = (val) => {
  if (!val) return "";
  if (typeof val === "object") return String(val._id || "");
  return String(val);
};

export const buildInvoiceGeoLookups = (data = {}) => ({
  cityMap: new Map((data.City || []).map((c) => [asId(c._id), c])),
  orderBookerMap: new Map((data.OrderBooker || []).map((o) => [asId(o._id), o])),
  zsmMap: new Map((data.Zsm || []).map((z) => [asId(z._id), z])),
  zoneMap: new Map((data.Zone || []).map((z) => [asId(z._id), z])),
  regionMap: new Map((data.Region || []).map((r) => [asId(r._id), r])),
});

export const resolveInvoiceGeo = (client, lookups) => {
  const cityData = lookups.cityMap.get(asId(client?.City));
  const obData = lookups.orderBookerMap.get(asId(client?.OrderBooker));
  const zsmData = lookups.zsmMap.get(asId(obData?.ZSM));
  const zoneData = lookups.zoneMap.get(asId(zsmData?.Zone || obData?.Zone || client?.Zone));
  const regionData =
    lookups.regionMap.get(asId(zoneData?.Region)) ||
    lookups.regionMap.get(asId(cityData?.Region)) ||
    lookups.regionMap.get(asId(obData?.Region));

  return {
    City: cityData?.CityName || "-",
    Zone: zoneData?.ZoneName || "-",
    Region: regionData?.RegionName || "-",
  };
};
