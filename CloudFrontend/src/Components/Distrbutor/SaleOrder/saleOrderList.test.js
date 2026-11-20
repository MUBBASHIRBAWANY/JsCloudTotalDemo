import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSaleOrderRows, canEditSaleOrder } from "./saleOrderList.js";

describe("Distributor sale order list rows", () => {
  const distributors = [
    { _id: "d1", DistrbutorName: "Ali Traders", OldCode: "A-1", City: "c1" },
    { _id: "d2", DistrbutorName: "Karachi Store", OldCode: "K-2", City: "c2" },
  ];
  const cities = [
    { _id: "c1", CityName: "Lahore" },
    { _id: "c2", CityName: "Karachi" },
  ];
  const orders = [
    { _id: "o1", OrderCode: "000001", Distrbutor: "d1", PostStatus: "Accept", lineCount: 3 },
    { _id: "o2", OrderCode: "000002", Distrbutor: "d2", PostStatus: "Deliverd", lineCount: 1 },
    { _id: "o3", OrderCode: "000003", Distrbutor: "missing", PostStatus: "Process" },
  ];

  it("adds the distributor name and city without product lines", () => {
    const rows = buildSaleOrderRows(orders, distributors, cities);
    assert.equal(rows[0].Distrbutor, "Ali Traders A-1");
    assert.equal(rows[0].City, "Lahore");
    assert.equal(rows[0].lineCount, 3);
    assert.equal(rows[0].OrderData, undefined);
  });

  it("keeps only the logged-in city", () => {
    const rows = buildSaleOrderRows(orders, distributors, cities, "c2");
    assert.deepEqual(rows.map((row) => row.OrderCode), ["000002"]);
    assert.equal(rows[0].City, "Karachi");
  });

  it("does not throw when the distributor or city is missing", () => {
    const rows = buildSaleOrderRows(orders, distributors, cities);
    assert.equal(rows[2].Distrbutor, "");
    assert.equal(rows[2].City, "");
    assert.deepEqual(buildSaleOrderRows(null, null, null), []);
  });
});

describe("Distributor sale order edit", () => {
  it("blocks edit only after the order is delivered", () => {
    assert.equal(canEditSaleOrder({ PostStatus: "Accept" }), true);
    assert.equal(canEditSaleOrder({ PostStatus: "Process" }), true);
    assert.equal(canEditSaleOrder({ PostStatus: "Deliverd" }), false);
    assert.equal(canEditSaleOrder(null), true);
  });
});
