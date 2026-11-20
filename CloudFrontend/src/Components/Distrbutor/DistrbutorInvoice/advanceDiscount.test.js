import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  advanceAfterDcSelect,
  applyAdvanceDiscount,
  canChooseAdvanceDiscount,
  normalizePolicyList,
  resolveAdvanceDiscountPercent,
} from "./advanceDiscount.js"

describe("Advance discount policy percent", () => {
  const policies = [
    { _id: "p0", label: "0%", value: 0 },
    { _id: "p2", label: "2%", value: 2 },
  ]

  it("reads a plain list or a wrapped list", () => {
    assert.equal(normalizePolicyList(policies).length, 2)
    assert.equal(normalizePolicyList({ status: true, data: policies }).length, 2)
    assert.equal(normalizePolicyList({ data: { data: policies } }).length, 2)
    assert.deepEqual(normalizePolicyList(null), [])
  })

  it("uses the distributor policy percent", () => {
    assert.equal(resolveAdvanceDiscountPercent({ advanceDiscountPolicy: "p2" }, policies), 2)
    assert.equal(resolveAdvanceDiscountPercent({ advanceDiscountPolicy: "p0" }, policies), 0)
  })

  it("reads the percent when the policy document is already on the distributor", () => {
    assert.equal(resolveAdvanceDiscountPercent({ advanceDiscountPolicy: { _id: "p2", value: 2 } }, []), 2)
    assert.equal(resolveAdvanceDiscountPercent({ advanceDiscountPolicy: { label: "1.5%" } }, []), 1.5)
  })

  it("uses value from an Active policy and ignores an inactive one", () => {
    const active = [{ _id: "p1", value: 1, label: "1%", Status: "Active" }]
    const inactive = [{ _id: "p1", value: 1, label: "1%", Status: "InActive" }]
    assert.equal(resolveAdvanceDiscountPercent({ advanceDiscountPolicy: "p1" }, active), 1)
    assert.equal(resolveAdvanceDiscountPercent({ advanceDiscountPolicy: "p1" }, inactive), 0)
  })

  it("stays at zero when the distributor has no policy", () => {
    assert.equal(resolveAdvanceDiscountPercent({}, policies), 0)
    assert.equal(resolveAdvanceDiscountPercent({ advanceDiscountPolicy: "" }, policies), 0)
  })
})

describe("Advance Discount dropdown", () => {
  it("enables Yes/No when invoice is 50,000 and ledger is -500,000", () => {
    assert.equal(canChooseAdvanceDiscount("-500000.00", 50000), true)
  })

  it("enables Yes/No when the negative ledger exactly covers the invoice", () => {
    assert.equal(canChooseAdvanceDiscount(-50000, 50000), true)
  })

  it("stays disabled when the negative ledger needs more than 0.5% relief", () => {
    assert.equal(canChooseAdvanceDiscount(-10000, 50000), false)
    assert.equal(canChooseAdvanceDiscount(-49000, 50000, 0), false)
  })

  it("enables when a 1.5% profile and 0.5% check bring 100,000 down to 98,000", () => {
    assert.equal(canChooseAdvanceDiscount(-98300, 100000, 1.5), true)
    assert.equal(canChooseAdvanceDiscount("-98300.00", 100000, 1.5), true)
  })

  it("stays disabled when the ledger is still short after the profile percent plus 0.5%", () => {
    assert.equal(canChooseAdvanceDiscount(-97999, 100000, 1.5), false)
  })

  it("does not treat a positive ledger of 98,300 as advance credit", () => {
    assert.equal(canChooseAdvanceDiscount(98300, 100000, 1.5), false)
  })

  it("stays disabled when the ledger is zero or positive", () => {
    assert.equal(canChooseAdvanceDiscount(0, 50000), false)
    assert.equal(canChooseAdvanceDiscount(50000, 50000), false)
    assert.equal(canChooseAdvanceDiscount(80000, 50000), false)
  })

  it("stays disabled when the ledger or the invoice is missing", () => {
    assert.equal(canChooseAdvanceDiscount("", 50000), false)
    assert.equal(canChooseAdvanceDiscount(null, 50000), false)
    assert.equal(canChooseAdvanceDiscount(undefined, 50000), false)
    assert.equal(canChooseAdvanceDiscount("abc", 50000), false)
    assert.equal(canChooseAdvanceDiscount(-500000, 0), false)
  })
})

describe("DC select does not apply Advance Discount", () => {
  it("leaves the choice on No and the discount at zero", () => {
    assert.deepEqual(advanceAfterDcSelect(), { advance: "no", advanceDis: 0 })
  })

  it("does not turn Yes on just because the invoice is greater than a positive ledger", () => {
    const afterDc = advanceAfterDcSelect()
    assert.equal(afterDc.advance, "no")
    assert.equal(canChooseAdvanceDiscount(10000, 50000), false)
  })
})

describe("User chooses Yes or No", () => {
  it("subtracts only the profile percent, not the 0.5% check", () => {
    const result = applyAdvanceDiscount({
      choice: "yes",
      invoiceNet: 100000,
      percent: 1.5,
      biltyType: "BTP",
      biltyAmount: 0,
      otherAmount: 100000,
    })

    assert.equal(result.advanceDis, 1500)
    assert.equal(result.netAmount, 98500)
  })

  it("applies the policy percent only when the user chooses Yes", () => {
    const result = applyAdvanceDiscount({
      choice: "yes",
      invoiceNet: 50000,
      percent: 2,
      biltyType: "BTP",
      biltyAmount: 500,
      otherAmount: 50000,
    })

    assert.deepEqual(result, { advance: "yes", advanceDis: 1000, netAmount: 49000 })
  })

  it("subtracts freight as well when the bilty is not BTP", () => {
    const result = applyAdvanceDiscount({
      choice: "Yes",
      invoiceNet: 50000,
      percent: 1,
      biltyType: "LTP",
      biltyAmount: 200,
      otherAmount: 49800,
    })

    assert.equal(result.advance, "yes")
    assert.equal(result.advanceDis, 500)
    assert.equal(result.netAmount, 49300)
  })

  it("clears the discount when the user chooses No", () => {
    const result = applyAdvanceDiscount({
      choice: "no",
      invoiceNet: 50000,
      percent: 2,
      biltyType: "LTP",
      biltyAmount: 200,
      otherAmount: 49800,
    })

    assert.deepEqual(result, { advance: "no", advanceDis: 0, netAmount: 49800 })
  })
})
