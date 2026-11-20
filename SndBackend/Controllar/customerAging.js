import SalesInvoiceModal from "../modal/SalesInvoiceModal.js";

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Sum of open invoice Remaining by customer Client id. */
export const customerAgingMap = async (customerIds = []) => {
  const ids = [...new Set(customerIds.map((id) => String(id || "").trim()).filter(Boolean))];
  const map = new Map();
  if (!ids.length) return map;

  const rows = await SalesInvoiceModal.aggregate([
    {
      $match: {
        Client: { $in: ids },
        PostStatus: { $ne: "Cancel" },
      },
    },
    {
      $project: {
        Client: 1,
        remaining: {
          $convert: {
            input: { $ifNull: ["$Remaining", 0] },
            to: "double",
            onError: 0,
            onNull: 0,
          },
        },
      },
    },
    { $match: { remaining: { $gt: 0 } } },
    {
      $group: {
        _id: "$Client",
        sumAging: { $sum: "$remaining" },
      },
    },
  ]);

  rows.forEach((row) => {
    map.set(String(row._id), round2(toNumber(row.sumAging)));
  });
  return map;
};

export const withCustomerAging = async (customers = []) => {
  const list = Array.isArray(customers) ? customers : [];
  const agingMap = await customerAgingMap(list.map((row) => row?._id));
  return list.map((row) => {
    const plain = typeof row?.toObject === "function" ? row.toObject() : { ...row };
    return {
      ...plain,
      sumAging: round2(agingMap.get(String(plain._id)) || 0),
    };
  });
};
