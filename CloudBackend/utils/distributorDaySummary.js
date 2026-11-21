import mongoose from "mongoose";
import DistrbutorModal from "../Modal/DistributerModal.js";
import DistributorSaleOrderModal from "../Modal/DistributorSaleOrderModal.js";
import OrderBookerModal from "../Modal/DitriButorOrderBookerModal.js";
import ProductModal from "../Modal/ProductModal.js";
import PurchaseInvoiceModal from "../Modal/PurchaseInvoiceModal.js";

const CLOSED = new Set(["reject", "rejected", "cancel", "cancelled", "canceled"]);

const asNumber = (value) => {
    const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value) => Math.round(asNumber(value) * 100) / 100;

const objectIds = (ids) => ids.filter((id) => mongoose.Types.ObjectId.isValid(id));

export const isCountedOrder = (order) => !CLOSED.has(String(order?.PostStatus || "").trim().toLowerCase());

const orderLines = (order) => (Array.isArray(order?.OrderData) ? order.OrderData : []);

const lineAmount = (line, keys, fallback = 0) => {
    for (const key of keys) {
        if (line?.[key] != null && line[key] !== "") return money(line[key]);
    }
    return money(fallback);
};

const lineNet = (line) => {
    const gross = lineAmount(line, ["GrossAmount", "Amount"]);
    const gst = lineAmount(line, ["Gst"]);
    return lineAmount(line, ["netAmunt", "netAmount", "NetAmount"], gross + gst);
};

const mlEach = (name) => {
    const text = String(name || "");
    const ml = text.match(/(\d+(?:\.\d+)?)\s*ml\b/i);
    if (ml) return asNumber(ml[1]);
    const liters = text.match(/(\d+(?:\.\d+)?)\s*(?:ltr|litre|liter)\b/i);
    return liters ? asNumber(liters[1]) * 1000 : 0;
};

const packLine = (line, product) => {
    const pcsInBox = asNumber(product?.PcsinBox);
    const boxInCarton = asNumber(product?.BoxinCarton);
    const gram = asNumber(product?.GRAM);
    const carton = Math.trunc(asNumber(line?.carton));
    const box = Math.trunc(asNumber(line?.box));
    const units = Math.round(pcsInBox * (carton * boxInCarton + box));
    const cartons = carton + (boxInCarton > 0 ? box / boxInCarton : 0);
    const ml = mlEach(product?.ProductName || line?.productName);
    return {
        units,
        cartons: money(cartons),
        liters: ml > 0 ? money((units * ml) / 1000) : 0,
        kg: ml > 0 ? 0 : money((units * gram) / 1000),
    };
};

const skuCount = (lines) => {
    const ids = new Set(lines.map((line) => String(line?.productId || line?.product || "")).filter(Boolean));
    return ids.size || lines.length;
};

const dayKey = (value) => {
    const text = String(value || "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
};

const shiftDay = (iso, days) => {
    const [year, month, day] = iso.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + days);
    const monthText = String(date.getMonth() + 1).padStart(2, "0");
    const dayText = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${monthText}-${dayText}`;
};

const eachDay = (from, to) => {
    const days = [];
    let cursor = from;
    while (cursor <= to && days.length < 84) {
        days.push(cursor);
        cursor = shiftDay(cursor, 1);
    }
    return days;
};

const badRequest = (message) => {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
};

const partyId = (order) => String(order?.Distrbutor || order?.Customer || order?.Distributor || "");

// One day of distributor sale orders for an order booker: each distributor, its lines, and the grand total.
export const summarizeDayOrders = ({ date, orderBookerId, orderBookerName, orders, distributors, products }) => {
    const distributorById = new Map((distributors || []).map((row) => [String(row._id), row]));
    const productById = new Map((products || []).map((row) => [String(row._id), row]));

    const customerCards = (orders || []).filter(isCountedOrder).map((order) => {
        const distributor = distributorById.get(partyId(order));
        const lines = orderLines(order).map((line) => {
            const product = productById.get(String(line?.product || ""));
            const gross = lineAmount(line, ["GrossAmount", "Amount"]);
            const gst = lineAmount(line, ["Gst"]);
            const packed = packLine(line, product);
            return {
                productId: String(line?.product || ""),
                productName: String(line?.productName || product?.ProductName || "Product"),
                productCode: String(product?.code || line?.code || ""),
                carton: Math.trunc(asNumber(line?.carton)),
                box: Math.trunc(asNumber(line?.box)),
                rate: lineAmount(line, ["Rate", "rate"]),
                gross,
                gst,
                net: lineNet(line),
                units: packed.units,
                kg: packed.kg,
                liters: packed.liters,
                cartons: packed.cartons,
            };
        });
        const totals = lines.reduce((sum, line) => ({
            carton: sum.carton + line.carton,
            box: sum.box + line.box,
            gross: money(sum.gross + line.gross),
            gst: money(sum.gst + line.gst),
            net: money(sum.net + line.net),
            units: sum.units + line.units,
            kg: money(sum.kg + line.kg),
            liters: money(sum.liters + line.liters),
            cartons: money(sum.cartons + line.cartons),
        }), { carton: 0, box: 0, gross: 0, gst: 0, net: 0, units: 0, kg: 0, liters: 0, cartons: 0 });

        return {
            saleOrderId: String(order._id || ""),
            saleOrderNumber: order.OrderCode || "",
            customerId: partyId(order),
            customerName: distributor?.DistrbutorName || order.DistrbutorName || "Distributor",
            customerCode: distributor?.DistrbutorSystemCode || "",
            remarks: order.Remarks || "",
            lines,
            ...totals,
        };
    });

    const totals = customerCards.reduce((sum, card) => ({
        orders: sum.orders + 1,
        carton: sum.carton + card.carton,
        box: sum.box + card.box,
        gross: money(sum.gross + card.gross),
        gst: money(sum.gst + card.gst),
        net: money(sum.net + card.net),
        units: sum.units + card.units,
        kg: money(sum.kg + card.kg),
        liters: money(sum.liters + card.liters),
        cartons: money(sum.cartons + card.cartons),
    }), { orders: 0, carton: 0, box: 0, gross: 0, gst: 0, net: 0, units: 0, kg: 0, liters: 0, cartons: 0 });
    const sellingCards = customerCards.filter((card) => card.lines.length > 0);
    const outletSets = new Map();
    for (const card of sellingCards) {
        const key = card.customerId || card.saleOrderId;
        if (!outletSets.has(key)) outletSets.set(key, new Set());
        const set = outletSets.get(key);
        for (const line of card.lines) {
            if (line.productId) set.add(line.productId);
        }
        if (set.size === 0) {
            card.lines.forEach((_, index) => set.add(`${card.saleOrderId}-${index}`));
        }
    }
    const outletSku = [...outletSets.values()].reduce((sum, set) => sum + set.size, 0);
    const billSku = sellingCards.reduce((sum, card) => sum + skuCount(card.lines), 0);
    totals.customers = outletSets.size;
    totals.avgSkuPerOutlet = outletSets.size ? money(outletSku / outletSets.size) : 0;
    totals.avgSkuPerBill = sellingCards.length ? money(billSku / sellingCards.length) : 0;

    return {
        date: String(date || ""),
        orderBookerId: String(orderBookerId || ""),
        orderBookerName: orderBookerName || "",
        customers: customerCards,
        totals,
    };
};

const ordersForBooker = (bookerId, dateQuery) => DistributorSaleOrderModal.find({
    OrderBookerId: bookerId,
    PostStatus: { $nin: [...CLOSED, "Reject", "Rejected", "Cancel", "Cancelled", "Canceled"] },
    ...dateQuery,
}).lean();

export const buildDistributorDaySummary = async (orderBookerId, date) => {
    const bookerId = String(orderBookerId || "").trim();
    const saleDate = dayKey(date);
    if (!bookerId || !saleDate) throw badRequest("OrderBooker and date are required");

    const orders = await ordersForBooker(bookerId, {
        $or: [{ SaleOrderDate: saleDate }, { OrderDate: saleDate }],
    });
    orders.sort((left, right) => String(left.OrderCode || "").localeCompare(String(right.OrderCode || "")));

    const distributorIds = [...new Set(orders.map(partyId).filter(Boolean))];
    const productIds = [...new Set(orders.flatMap((order) =>
        orderLines(order).map((line) => String(line?.product || "")).filter(Boolean)
    ))];

    const [distributors, products, booker] = await Promise.all([
        distributorIds.length
            ? DistrbutorModal.find({ _id: { $in: objectIds(distributorIds) } }).select("DistrbutorName DistrbutorSystemCode").lean()
            : [],
        productIds.length
            ? ProductModal.find({ _id: { $in: objectIds(productIds) } }).select("ProductName code PcsinBox BoxinCarton GRAM").lean()
            : [],
        mongoose.Types.ObjectId.isValid(bookerId)
            ? OrderBookerModal.findById(bookerId).select("OrderBookerName").lean()
            : null,
    ]);

    return summarizeDayOrders({
        date: saleDate,
        orderBookerId: bookerId,
        orderBookerName: booker?.OrderBookerName || "",
        orders,
        distributors,
        products,
    });
};

export const buildDistributorDayTrend = async (orderBookerId, fromDate, toDate) => {
    const bookerId = String(orderBookerId || "").trim();
    const to = dayKey(toDate);
    const from = dayKey(fromDate);
    if (!bookerId || !from || !to || from > to) throw badRequest("OrderBooker, from, and to are required");

    const orders = await ordersForBooker(bookerId, {
        $or: [
            { SaleOrderDate: { $gte: from, $lte: to } },
            { OrderDate: { $gte: from, $lte: to } },
        ],
    });

    const buckets = new Map(eachDay(from, to).map((date) => [date, {
        date,
        orders: 0,
        customers: new Set(),
        sku: 0,
        net: 0,
        sales: 0,
    }]));

    for (const order of orders) {
        if (!isCountedOrder(order)) continue;
        const saleDate = dayKey(order.SaleOrderDate);
        const orderDate = dayKey(order.OrderDate);
        const date = buckets.has(saleDate) ? saleDate : orderDate;
        const bucket = buckets.get(date);
        if (!bucket) continue;
        const lines = orderLines(order);
        bucket.orders += 1;
        const customer = partyId(order);
        if (customer && lines.length > 0) bucket.customers.add(customer);
        bucket.sku += skuCount(lines);
        const lineTotal = lines.reduce((sum, line) => sum + lineNet(line), 0);
        bucket.net = money(bucket.net + (lineTotal || asNumber(order.TotalAmount)));
    }

    const purchaseInvoices = await PurchaseInvoiceModal.find({
        PurchaseInvoiceDate: { $gte: from, $lte: to },
    }).select("PurchaseInvoiceDate TotalAmount").lean();

    for (const invoice of purchaseInvoices) {
        const bucket = buckets.get(dayKey(invoice.PurchaseInvoiceDate));
        if (!bucket) continue;
        bucket.sales = money(bucket.sales + asNumber(invoice.TotalAmount));
    }

    return {
        from,
        to,
        days: [...buckets.values()].map((bucket) => ({
            date: bucket.date,
            orders: bucket.orders,
            customers: bucket.customers.size,
            sku: bucket.sku,
            avgSkuPerBill: bucket.orders ? money(bucket.sku / bucket.orders) : 0,
            net: bucket.net,
            sales: bucket.sales,
        })),
    };
};
