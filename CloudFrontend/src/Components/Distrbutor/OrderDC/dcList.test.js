import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDcListRows, canDeleteDc, dcStatusLabel, distributorLabel } from "./dcList.js";

describe("Order DC list rows", () => {
  const distributors = [
    { _id: "d1", DistrbutorName: "Ali Traders", OldCode: "A-1" },
  ];

  it("shows the distributor name without keeping product lines", () => {
    const rows = buildDcListRows([
      { _id: "dc1", DCCode: "000001", Distrbutor: "d1", PostStatus: "Deliverd", lineCount: 2 },
    ], distributors);

    assert.equal(rows[0].Distrbutor, "Ali Traders A-1");
    assert.equal(rows[0].lineCount, 2);
    assert.equal(rows[0].DCData, undefined);
  });

  it("does not throw when the distributor is missing", () => {
    const rows = buildDcListRows([
      { _id: "dc2", Distrbutor: "missing", DCData: [{ product: "p1" }] },
    ], distributors);

    assert.equal(rows[0].Distrbutor, "");
    assert.equal(rows[0].lineCount, 1);
  });

  it("returns an empty list for empty input", () => {
    assert.deepEqual(buildDcListRows(null, null), []);
    assert.equal(distributorLabel(null), "");
  });
});

describe("Order DC status and delete", () => {
  it("labels a false challan as Cancel and allows delete only then", () => {
    assert.equal(dcStatusLabel("False"), "Cancel");
    assert.equal(dcStatusLabel("Deliverd"), "Deliverd");
    assert.equal(dcStatusLabel("Invoiced"), "Invoiced");
    assert.equal(dcStatusLabel(""), "");
    assert.equal(canDeleteDc({ PostStatus: "False" }), true);
    assert.equal(canDeleteDc({ PostStatus: "Deliverd" }), false);
    assert.equal(canDeleteDc({ PostStatus: "Invoiced" }), false);
    assert.equal(canDeleteDc(null), false);
  });
});
