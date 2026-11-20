import mongoose from "mongoose"
import TotalProductModal from "../modal/TotalProductModal.js"
import PurchaseOrderDcModal from "../modal/PurchaseOrderDcModal.js"
import SalesInvoiceModal from "../modal/SalesInvoiceModal.js"
import StockAdjustmentModal from "../modal/StockAdjustmentModal.js"
import ProductModal from "../modal/ProductModal.js"
import DistrbutorModal from "../modal/DistributerModal.js"

const ADMIN_EMAIL = "admin@js.com"

const toNum = (path) => ({
    $convert: { input: path, to: "double", onError: 0, onNull: 0 }
})

const toId = (path) => ({
    $toString: { $ifNull: [`${path}._id`, path] }
})

const makeKey = (dist, product) => `${String(dist)}::${String(product)}`

export const getAllProductQty = async (req,res) => {
    try {
        const data = await TotalProductModal.find()
         res.status(200).send({ status: true, data: data });

    } catch(err) {
        res.status(400).send("Some Thing Went Wrong")
        
    }
}

export const getProductByDistriButor = async (req,res) => {
    const {Distrbutor} = req.params
    try {
        const data = await TotalProductModal.find({Distrbutor : Distrbutor})
         res.status(200).send({ status: true, data: data });
    } catch(err) {
        res.status(400).send("Some Thing Went Wrong")
        
    }
}

const assertAdmin = (req) => {
    const email = req.body?.email || req.query?.email
    return email === ADMIN_EMAIL
}

const distMatch = (field, distId) => {
    if (!distId) return {}
    const values = [String(distId)]
    if (mongoose.Types.ObjectId.isValid(String(distId))) {
        values.push(new mongoose.Types.ObjectId(String(distId)))
    }
    return { [field]: { $in: values } }
}

export const recalculateStock = async (req, res) => {
    try {
        if (!assertAdmin(req)) {
            return res.status(403).json({
                status: false,
                message: "Only admin can recalculate stock"
            })
        }

        const distId = req.body?.Distrbutor || req.query?.Distrbutor || ""
        const dryRun = Boolean(req.body?.dryRun || req.query?.dryRun)
        const today = new Date().toISOString().split("T")[0]
        const stockMap = new Map()

        const bump = (dist, product, fields) => {
            if (!dist || !product || dist === "null" || dist === "undefined") return
            const key = makeKey(dist, product)
            const current = stockMap.get(key) || {
                Distrbutor: String(dist),
                ProductName: String(product),
                adjustment: 0,
                adjAdd: 0,
                adjLess: 0,
                purchase: 0,
                sales: 0,
                amount: 0,
                carton: 0,
                unit: 0,
            }
            for (const [k, v] of Object.entries(fields)) {
                current[k] += Number(v) || 0
            }
            stockMap.set(key, current)
        }

        const purchaseBox = {
            $convert: {
                input: { $ifNull: ["$DCData.DeliveredBox", "$DCData.totalBox"] },
                to: "double",
                onError: 0,
                onNull: 0,
            },
        }

        const [adjustments, purchases, sales, products, distributors, existingStock] = await Promise.all([
            StockAdjustmentModal.aggregate([
                { $match: distMatch("Distrbutor", distId) },
                { $unwind: "$Adjustments" },
                {
                    $group: {
                        _id: {
                            dist: toId("$Distrbutor"),
                            product: toId("$Adjustments.product"),
                        },
                        addQty: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$Adjustments.adjustmentType", "Add"] },
                                    toNum("$Adjustments.Box"),
                                    0,
                                ],
                            },
                        },
                        lessQty: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$Adjustments.adjustmentType", "Less"] },
                                    toNum("$Adjustments.Box"),
                                    0,
                                ],
                            },
                        },
                        carton: { $sum: toNum("$Adjustments.Carton") },
                        unit: { $sum: toNum("$Adjustments.Unit") },
                    },
                },
            ]),
            PurchaseOrderDcModal.aggregate([
                {
                    $match: {
                        PostStatus: "Received",
                        ...distMatch("Distrbutor", distId),
                    },
                },
                { $unwind: "$DCData" },
                {
                    $group: {
                        _id: {
                            dist: toId("$Distrbutor"),
                            product: toId("$DCData.product"),
                        },
                        qty: { $sum: purchaseBox },
                        amount: { $sum: toNum("$DCData.ValueAfterDiscout") },
                        carton: { $sum: toNum("$DCData.carton") },
                    },
                },
            ]),
            SalesInvoiceModal.aggregate([
                {
                    $match: {
                        PostStatus: { $ne: "Cancel" },
                        ...distMatch("Distrbutor", distId),
                    },
                },
                { $unwind: "$SalesData" },
                {
                    $group: {
                        _id: {
                            dist: toId("$Distrbutor"),
                            product: toId("$SalesData.product"),
                        },
                        delivered: { $sum: toNum("$SalesData.DeliveredBox") },
                    },
                },
            ]),
            ProductModal.find({}, { BoxinCarton: 1, ProductName: 1 }).lean(),
            DistrbutorModal.find({}, { DistrbutorName: 1 }).lean(),
            TotalProductModal.find(distId ? distMatch("Distrbutor", distId) : {}).lean(),
        ])

        adjustments.forEach((row) => {
            bump(row._id.dist, row._id.product, {
                adjustment: (row.addQty || 0) - (row.lessQty || 0),
                adjAdd: row.addQty,
                adjLess: row.lessQty,
                carton: row.carton,
                unit: row.unit,
            })
        })
        purchases.forEach((row) => {
            bump(row._id.dist, row._id.product, {
                purchase: row.qty,
                amount: row.amount,
                carton: row.carton,
            })
        })
        sales.forEach((row) => {
            bump(row._id.dist, row._id.product, {
                sales: row.delivered,
            })
        })

        const currentMap = new Map()
        existingStock.forEach((item) => {
            if (!item.Distrbutor || !item.ProductName) return
            currentMap.set(makeKey(item.Distrbutor, item.ProductName), item)
        })

        const productMap = {}
        products.forEach((p) => {
            productMap[String(p._id)] = p
        })
        const distNameMap = {}
        distributors.forEach((d) => {
            distNameMap[String(d._id)] = d.DistrbutorName
        })

        const docs = []
        const negatives = []
        const changes = []
        const byDistributor = {}

        for (const row of stockMap.values()) {
            // Same remaining as StockFlow Report "With Open" for full history:
            // Purchase(DeliveredBox, not Cancel) + Adj Add - Sales(DeliveredBox, not Cancel) - Adj Less
            const rawQty = row.adjustment + row.purchase - row.sales
            const qty = Math.max(0, Math.round(rawQty * 1000) / 1000)
            if (rawQty < 0) {
                negatives.push({
                    Distrbutor: row.Distrbutor,
                    ProductName: row.ProductName,
                    calculated: rawQty,
                })
            }

            const product = productMap[row.ProductName]
            const boxInCarton = Number(product?.BoxinCarton) || 0
            const carton = boxInCarton > 0 ? Math.floor(qty / boxInCarton) : (row.carton || 0)
            const box = boxInCarton > 0 ? Math.round(qty % boxInCarton) : (row.unit || 0)
            const avgRate = qty > 0 ? row.amount / qty : 0
            const existing = currentMap.get(makeKey(row.Distrbutor, row.ProductName))
            const oldQty = Number(existing?.TotalQuantity) || 0

            const doc = {
                ProductName: row.ProductName,
                Distrbutor: row.Distrbutor,
                TotalQuantity: qty,
                AvgRate: String(Number.isFinite(avgRate) ? avgRate : 0),
                Amount: Number.isFinite(row.amount) ? row.amount : 0,
                Carton: carton,
                Box: box,
                Reason: "Stock Recalculate",
                AdjustmentDate: today,
                Type: "Recalculate",
            }
            docs.push(doc)

            if (Math.abs(oldQty - qty) > 0.0001) {
                changes.push({
                    Distrbutor: row.Distrbutor,
                    DistrbutorName: distNameMap[row.Distrbutor] || row.Distrbutor,
                    ProductName: row.ProductName,
                    ProductLabel: product?.ProductName || row.ProductName,
                    oldQty,
                    newQty: qty,
                    purchase: row.purchase,
                    sales: row.sales,
                    adjustment: row.adjustment,
                })
            }

            if (!byDistributor[row.Distrbutor]) {
                byDistributor[row.Distrbutor] = {
                    Distrbutor: row.Distrbutor,
                    DistrbutorName: distNameMap[row.Distrbutor] || row.Distrbutor,
                    products: 0,
                    totalQuantity: 0,
                    changed: 0,
                    fromOpeningAdjustment: 0,
                }
            }
            byDistributor[row.Distrbutor].products += 1
            byDistributor[row.Distrbutor].totalQuantity += qty
            if (Math.abs(oldQty - qty) > 0.0001) byDistributor[row.Distrbutor].changed += 1
            if (row.adjAdd || row.adjLess) byDistributor[row.Distrbutor].fromOpeningAdjustment += 1
        }

        if (!dryRun) {
            const distIds = distId ? [String(distId)] : [...new Set(docs.map((d) => d.Distrbutor))]

            for (const id of distIds) {
                await TotalProductModal.deleteMany({ Distrbutor: id })
            }

            if (!distId) {
                await TotalProductModal.deleteMany({
                    $or: [
                        { Distrbutor: null },
                        { Distrbutor: "" },
                        { Distrbutor: { $exists: false } },
                    ],
                })
            }

            if (docs.length > 0) {
                await TotalProductModal.insertMany(docs)
            }

            const saFilter = distId ? distMatch("Distrbutor", distId) : {}
            await StockAdjustmentModal.updateMany(saFilter, {
                $set: {
                    isPosted: true,
                    PostedAt: new Date(),
                    PostedBy: ADMIN_EMAIL,
                },
            })
        }

        return res.status(200).json({
            status: true,
            message: dryRun
                ? "Stock recalculate preview (not saved)"
                : "Stock recalculated and saved to TotalProduct",
            dryRun,
            formula: "Posted Purchase DC (DeliveredBox) + Stock Adj Add - Sales DeliveredBox (not Cancel) - Stock Adj Less",
            updated: docs.length,
            changed: changes.length,
            distributors: Object.values(byDistributor),
            changes,
            negatives,
        })
    } catch (err) {
        console.error("Stock recalculate failed:", err)
        return res.status(500).json({
            status: false,
            message: "Stock recalculate failed",
            error: err.message,
        })
    }
}