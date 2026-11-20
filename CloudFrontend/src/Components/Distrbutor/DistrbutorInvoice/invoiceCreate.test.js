import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { canCreateInvoice } from "./invoiceCreate.js"

describe("Create button and price list", () => {
  it("stays disabled when a product has no price list", () => {
    assert.equal(
      canCreateInvoice([
        { product: "a", hasPriceList: true },
        { product: "b", hasPriceList: false },
      ]),
      false
    )
  })

  it("stays disabled when the price list was not applied at all", () => {
    assert.equal(canCreateInvoice([{ product: "a" }]), false)
    assert.equal(canCreateInvoice([]), false)
    assert.equal(canCreateInvoice(null), false)
  })

  it("is enabled when every product has a price list", () => {
    assert.equal(
      canCreateInvoice([
        { product: "a", hasPriceList: true },
        { product: "b", hasPriceList: true },
      ]),
      true
    )
  })
})
