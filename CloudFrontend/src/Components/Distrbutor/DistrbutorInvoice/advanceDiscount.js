/** API may return a list or `{ data: list }`. Either shape is a policy list. */
export const normalizePolicyList = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  return []
}

const isActivePolicy = (policy) => {
  if (!policy || typeof policy !== "object") return true
  if (policy.Status == null || policy.Status === "") return true
  return String(policy.Status).trim().toLowerCase() === "active"
}

const percentFromPolicy = (policy) => {
  if (policy == null || policy === "") return null
  if (typeof policy === "number" || typeof policy === "string") {
    const direct = Number(policy)
    return Number.isFinite(direct) ? direct : null
  }
  const raw = policy.value ?? policy.percent ?? policy.percentage ?? policy.AdvanceDiscountPercent
  const numeric = Number(raw)
  if (Number.isFinite(numeric)) return numeric
  const fromLabel = String(policy.label ?? "").match(/-?\d+(?:\.\d+)?/)
  if (!fromLabel) return null
  const labeled = Number(fromLabel[0])
  return Number.isFinite(labeled) ? labeled : null
}

/**
 * Percent comes from the distributor's advanceDiscountPolicy.
 * The policy may be an id, or the policy document itself.
 */
export const resolveAdvanceDiscountPercent = (distributor, policies = []) => {
  const ref = distributor?.advanceDiscountPolicy
  if (ref == null || ref === "") return 0

  if (typeof ref === "object" && !isActivePolicy(ref)) return 0
  const embedded = percentFromPolicy(ref)
  if (typeof ref === "object" && embedded !== null) return embedded >= 0 ? embedded : 0

  const policyId = typeof ref === "object" ? (ref._id || ref.id || ref.value) : ref
  if (policyId == null || policyId === "") return 0
  const policy = (policies || []).find((item) => String(item?._id) === String(policyId))
  if (!isActivePolicy(policy)) return 0
  const percent = percentFromPolicy(policy)
  return percent !== null && percent >= 0 ? percent : 0
}

/** Ledger value the invoice screen can compare. Empty or invalid is missing, not zero. */
export const parseLedgerBalance = (balance) => {
  if (balance === undefined || balance === null || balance === "") return null
  const value = Number(balance)
  return Number.isFinite(value) ? value : null
}

/** Extra room used only to decide if Yes/No can open. It is never added to the discount. */
export const ADVANCE_DISCOUNT_RELIEF_PERCENT = 0.5

/**
 * Yes/No opens when the ledger is negative and the invoice is within the
 * profile percent plus 0.5%. Example: profile 1.5%, net 100,000, ledger -98,300
 * checks 2% (98,000). Choosing Yes still subtracts only the profile 1.5%.
 */
export const canChooseAdvanceDiscount = (balance, invoiceNet, policyPercent = 0) => {
  const balanceNum = parseLedgerBalance(balance)
  const net = Number(invoiceNet) || 0
  const profile = Number(policyPercent)
  const percent = Number.isFinite(profile) && profile > 0 ? profile : 0
  if (balanceNum === null || balanceNum >= 0 || net <= 0) return false

  const checkPercent = percent + ADVANCE_DISCOUNT_RELIEF_PERCENT
  const relief = Number(((net / 100) * checkPercent).toFixed(2))
  const coveredNet = Number((net - relief).toFixed(2))
  return Math.abs(balanceNum) + 0.001 >= coveredNet
}

/** Selecting a DC never applies advance discount. The user chooses Yes or No. */
export const advanceAfterDcSelect = () => ({
  advance: "no",
  advanceDis: 0,
})

export const applyAdvanceDiscount = ({
  choice,
  invoiceNet,
  percent,
  biltyType,
  biltyAmount,
  otherAmount,
}) => {
  const advance = String(choice || "").toLowerCase() === "yes" ? "yes" : "no"
  if (advance !== "yes") {
    return { advance: "no", advanceDis: 0, netAmount: otherAmount }
  }

  const calcNet = Number(invoiceNet) || 0
  const advanceDis = Number(((calcNet / 100) * Number(percent || 0)).toFixed(2))
  const netAmount =
    biltyType == "BTP"
      ? calcNet - advanceDis
      : Number(calcNet || 0) - Number(advanceDis || 0) - Number(biltyAmount || 0)

  return { advance: "yes", advanceDis, netAmount }
}
