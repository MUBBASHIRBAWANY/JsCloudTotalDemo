import mongoose from "mongoose";
import DistributorSaleOrderModal from "../Modal/DistributorSaleOrderModal.js";
import OrderDcModal from "../Modal/SaleOrderDcModal.js";
import ProductModal from "../Modal/ProductModal.js";
import DistrbutorModal from "../Modal/DistributerModal.js";
import CityModal from "../Modal/CityModal.js";
import StoreModal from "../Modal/StoreModal.js";

const num = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const nextDay = (day) => {
    const date = new Date(`${day}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return day;
    date.setUTCDate(date.getUTCDate() + 1);
    return date.toISOString().slice(0, 10);
};

const toDay = (value) => {
    if (!value) return "";
    const text = String(value);
    const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : text;
};

const splitIds = (value) => String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const objectIds = (ids) => ids
    .filter((id) => mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id));

const measureLine = (line, product) => {
    const boxesPerCarton = num(product?.BoxinCarton);
    const loose = num(line?.box ?? line?.Box);
    const carton = num(line?.carton ?? line?.Carton);
    const storedTotal = line?.totalBox ?? line?.TotalBox;
    let totalBox = storedTotal != null && storedTotal !== "" ? num(storedTotal) : 0;
    if (!totalBox) {
        totalBox = boxesPerCarton > 0 ? carton * boxesPerCarton + loose : loose || carton;
    }
    const delivered = num(line?.DeliveredBox ?? line?.Deliver);
    const remaining = line?.ReamingBox != null && line?.ReamingBox !== ""
        ? num(line.ReamingBox)
        : Math.max(totalBox - delivered, 0);
    const rate = num(line?.Rate || line?.PerBoxValueGrs || product?.TPSale);
    const hasGross = line?.GrossAmount != null || line?.Amount != null;
    const gross = hasGross ? num(line?.GrossAmount ?? line?.Amount) : rate * totalBox;
    const discount = num(line?.discount) + num(line?.specialdiscount) + num(line?.SpecialTO);
    const hasNet = line?.netAmount != null || line?.netAmunt != null;
    const net = hasNet ? num(line?.netAmount ?? line?.netAmunt) : gross - discount;
    return { carton, totalBox, delivered, remaining, rate, gross, discount, net };
};

const dcCategory = (doc) => {
    const status = String(doc?.PostStatus || "").trim().toLowerCase();
    const invoice = doc?.Invoice;
    const hasInvoice = invoice != null && String(invoice).trim() !== "";
    if (status === "false" || status === "cancel" || status === "canceled" || status === "cancelled") return "Cancel";
    if (status === "invoiced" || hasInvoice) return "Invoiced";
    if (status === "deliverd" || status === "delivered") return "Delivered";
    return "";
};

const dcStatusMatch = (status) => {
    const wanted = String(status || "Delivered").trim().toLowerCase();
    if (wanted === "all") {
        return {
            $or: [
                { PostStatus: { $in: ["Deliverd", "Delivered", "Invoiced", "False", "Cancel", "Canceled", "Cancelled"] } },
                { Invoice: { $nin: [null, ""] } },
            ],
        };
    }
    if (wanted === "cancel") {
        return { PostStatus: { $in: ["False", "Cancel", "Canceled", "Cancelled"] } };
    }
    if (wanted === "invoiced") {
        return {
            $or: [
                { PostStatus: { $regex: "^invoiced$", $options: "i" } },
                {
                    PostStatus: { $nin: ["False", "Cancel", "Canceled", "Cancelled"] },
                    Invoice: { $nin: [null, ""] },
                },
            ],
        };
    }
    if (wanted === "deliveredinvoiced" || wanted === "both") {
        return {
            $or: [
                { PostStatus: { $in: ["Deliverd", "Delivered", "Invoiced"] } },
                {
                    PostStatus: { $nin: ["False", "Cancel", "Canceled", "Cancelled"] },
                    Invoice: { $nin: [null, ""] },
                },
            ],
        };
    }
    return {
        PostStatus: { $in: ["Deliverd", "Delivered"] },
        $or: [{ Invoice: { $exists: false } }, { Invoice: null }, { Invoice: "" }],
    };
};

const emptyTotals = () => ({
    carton: 0,
    totalBox: 0,
    delivered: 0,
    remaining: 0,
    gross: 0,
    discount: 0,
    net: 0,
});

const addMeasure = (bucket, measure) => {
    bucket.carton += measure.carton;
    bucket.totalBox += measure.totalBox;
    bucket.delivered += measure.delivered;
    bucket.remaining += measure.remaining;
    bucket.gross += measure.gross;
    bucket.discount += measure.discount;
    bucket.net += measure.net;
};

let reportIndexes;
const ensureReportIndexes = () => {
    if (!reportIndexes) {
        reportIndexes = Promise.all([
            DistributorSaleOrderModal.collection.createIndex({ OrderDate: 1, PostStatus: 1 }),
            DistributorSaleOrderModal.collection.createIndex({ OrderDate: 1, Distrbutor: 1 }),
            OrderDcModal.collection.createIndex({ DCDate: 1, PostStatus: 1 }),
            OrderDcModal.collection.createIndex({ DCDate: 1, Distrbutor: 1 }),
        ]).catch((err) => {
            reportIndexes = null;
            console.error("Qty report index", err);
        });
    }
    return reportIndexes;
};

const byId = async (model, ids, fields) => {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) return new Map();
    const rows = await model.find({ _id: { $in: objectIds(unique) } }).select(fields).lean();
    return new Map(rows.map((row) => [String(row._id), row]));
};

const buildRows = (docs, config, view, productIds, lookups) => {
    const selectedProducts = new Set(productIds);
    const applyProductFilter = view !== "Summary" && selectedProducts.size > 0;
    const productGroups = new Map();
    const rows = [];

    docs.forEach((doc) => {
        const distributor = lookups.distributors.get(String(doc.Distrbutor || ""));
        const header = {
            date: toDay(doc[config.dateKey]),
            code: doc[config.codeKey] || "",
            distributor: distributor?.DistrbutorName || "",
            city: lookups.cities.get(String(distributor?.City || "")) || "",
            store: lookups.stores.get(String(doc.Store || "")) || "",
            bilty: doc.BiltyNumber || "",
            status: config.dateKey === "DCDate" ? dcCategory(doc) : (doc.PostStatus || ""),
        };
        if (config.dateKey === "DCDate" && !header.status) return;
        const lines = Array.isArray(doc[config.linesKey]) ? doc[config.linesKey] : [];

        if (view === "Summary") {
            const totals = emptyTotals();
            lines.forEach((line) => addMeasure(totals, measureLine(line, lookups.products.get(String(line?.product || "")))));
            rows.push({ ...header, ...totals });
            return;
        }

        const matched = lines.filter((line) => !applyProductFilter || selectedProducts.has(String(line?.product || "")));
        if (matched.length === 0) return;

        if (view === "Detail") {
            matched.forEach((line) => {
                const product = lookups.products.get(String(line?.product || ""));
                rows.push({
                    ...header,
                    ...measureLine(line, product),
                    orderCode: line?.Order || line?.OrderCode || "",
                    sku: product?.salesFlowRef || "",
                    product: product?.ProductName || "Unknown Product",
                });
            });
            return;
        }

        matched.forEach((line) => {
            const productId = String(line?.product || "");
            const product = lookups.products.get(productId);
            if (!productGroups.has(productId)) {
                productGroups.set(productId, {
                    sku: product?.salesFlowRef || "",
                    product: product?.ProductName || "Unknown Product",
                    ...emptyTotals(),
                    documents: new Set(),
                });
            }
            const group = productGroups.get(productId);
            addMeasure(group, measureLine(line, product));
            group.documents.add(String(doc._id || header.code));
        });
    });

    if (view === "ProductSummary") {
        return [...productGroups.values()]
            .map((group) => ({ ...group, documents: group.documents.size }))
            .sort((a, b) => String(a.product).localeCompare(String(b.product)));
    }

    return rows.sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.code).localeCompare(String(a.code)));
};

const runReport = async (req, res, config) => {
    try {
        const { startDate, endDate } = req.query;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate || "") || !/^\d{4}-\d{2}-\d{2}$/.test(endDate || "")) {
            return res.status(400).send("Start and end date are required");
        }
        if (startDate > endDate) return res.status(400).send("Start date cannot be after end date");

        const view = ["Detail", "ProductSummary", "Summary"].includes(req.query.view) ? req.query.view : "Detail";
        const productIds = splitIds(req.query.products);
        let distributorIds = splitIds(req.query.distributors);

        if (req.query.city) {
            const inCity = await DistrbutorModal.find({ City: String(req.query.city) }).select("_id").lean();
            const cityIds = new Set(inCity.map((item) => String(item._id)));
            distributorIds = distributorIds.length
                ? distributorIds.filter((id) => cityIds.has(id))
                : [...cityIds];
            if (distributorIds.length === 0) return res.status(200).send([]);
        }

        const match = {
            [config.dateKey]: { $gte: startDate, $lt: nextDay(endDate) },
        };
        if (config.dateKey === "DCDate") {
            const summaryView = view === "ProductSummary" || view === "Summary";
            const wanted = String(req.query.status || "Delivered").trim().toLowerCase();
            const statusKey = summaryView && wanted !== "cancel" && wanted !== "all" ? "deliveredinvoiced" : req.query.status;
            Object.assign(match, dcStatusMatch(statusKey));
        } else if (req.query.status && req.query.status !== "All") {
            const status = String(req.query.status).trim();
            match.PostStatus = { $regex: `^${status.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" };
        }
        if (distributorIds.length) match.Distrbutor = { $in: distributorIds };
        if (req.query.store) match.Store = String(req.query.store);
        if (productIds.length && view !== "Summary") match[`${config.linesKey}.product`] = { $in: productIds };

        await ensureReportIndexes();
        const docs = await config.model.find(match).select(config.select).lean();

        const lineProductIds = [];
        const distributorIdList = [];
        const storeIds = [];
        docs.forEach((doc) => {
            distributorIdList.push(doc.Distrbutor);
            storeIds.push(doc.Store);
            (doc[config.linesKey] || []).forEach((line) => lineProductIds.push(line?.product));
        });

        const [products, distributors, stores] = await Promise.all([
            byId(ProductModal, lineProductIds, "ProductName salesFlowRef BoxinCarton TPSale"),
            byId(DistrbutorModal, distributorIdList, "DistrbutorName DistrbutorSystemCode City"),
            byId(StoreModal, storeIds, "StoreName"),
        ]);
        const cities = await byId(CityModal, [...distributors.values()].map((item) => item.City), "CityName");
        const storeNames = new Map([...stores.entries()].map(([id, store]) => [id, store.StoreName || ""]));
        const cityNames = new Map([...cities.entries()].map(([id, city]) => [id, city.CityName || ""]));

        res.status(200).send(buildRows(docs, config, view, productIds, {
            products,
            distributors,
            stores: storeNames,
            cities: cityNames,
        }));
    } catch (err) {
        console.error(err);
        res.status(500).send("Report failed");
    }
};

export const getDcQtyReport = (req, res) => runReport(req, res, {
    model: OrderDcModal,
    dateKey: "DCDate",
    codeKey: "DCCode",
    linesKey: "DCData",
    select: "DCCode DCDate Distrbutor Store PostStatus BiltyNumber Invoice DCData",
});

export const getOrderQtyReport = (req, res) => runReport(req, res, {
    model: DistributorSaleOrderModal,
    dateKey: "OrderDate",
    codeKey: "OrderCode",
    linesKey: "OrderData",
    select: "OrderCode OrderDate Distrbutor Store PostStatus OrderData",
});
