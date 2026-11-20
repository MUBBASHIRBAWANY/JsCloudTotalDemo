import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import DistrbutorModal from "../modal/DistributerModal.js";
import DistributorSaleOrderModal from "../modal/DistributorSaleOrderModal.js";
import DitriButorOrderBookerModal from "../modal/DitriButorOrderBookerModal.js";
import { buildDistributorDaySummary, buildDistributorDayTrend } from "../utils/distributorDaySummary.js";



const text = (value) => (value == null ? "" : String(value).trim());

const amount = (value) => {
    const raw = typeof value === "string" ? value.replace(/,/g, "") : value;
    const number = Number(raw);
    return Number.isFinite(number) ? number : 0;
};

const parseJsonField = (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!trimmed || (trimmed[0] !== "[" && trimmed[0] !== "{")) return value;
    return JSON.parse(trimmed);
};

const imageRecord = (image, index) => {
    if (typeof image === "string" && image.trim()) {
        const uri = image.trim();
        const filename = uri.split("/").pop()?.split("?")[0] || `photo-${index + 1}.jpg`;
        return { filename, type: "", uri };
    }
    if (image && typeof image === "object" && typeof image.uri === "string" && image.uri.trim()) {
        const uri = image.uri.trim();
        return {
            filename: text(image.filename) || uri.split("/").pop()?.split("?")[0] || `photo-${index + 1}.jpg`,
            type: text(image.type),
            uri,
        };
    }
    return null;
};

const imageList = (images) => {
    const parsed = parseJsonField(images);
    const list = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
    return list.map(imageRecord).filter(Boolean);
};

const cloudinaryClient = () => {
    const cloud_name = text(process.env.cloudName || process.env.CLOUDINARY_CLOUD_NAME);
    const api_key = text(process.env.CLOUDINARY_API_KEY);
    const api_secret = text(process.env.CLOUDINARY_API_SECRET);
    if (!cloud_name || !api_key || !api_secret) {
        throw new Error("Cloudinary is not configured");
    }
    cloudinary.config({ cloud_name, api_key, api_secret });
    return cloudinary;
};

const isCloudinaryUrl = (uri) => /^https?:\/\/res\.cloudinary\.com\//i.test(uri);

const bookerFolder = (name) => {
    const clean = text(name).replace(/[\\/#?&%<>:"|]+/g, " ").replace(/\s+/g, " ").slice(0, 80);
    return `distributor-sale-orders/${clean || "order-booker"}`;
};

const orderBookerName = async (id, fallback) => {
    const given = text(fallback);
    if (given) return given;
    if (!mongoose.Types.ObjectId.isValid(text(id))) return "";
    const booker = await DitriButorOrderBookerModal.findById(id).select("OrderBookerName").lean();
    return booker?.OrderBookerName || "";
};

const uploadBuffer = (file, bookerName) => new Promise((resolve, reject) => {
    const upload = cloudinaryClient().uploader.upload_stream(
        { folder: bookerFolder(bookerName), resource_type: "image" },
        (error, result) => {
            if (error || !result?.secure_url) {
                reject(error || new Error("Cloudinary did not return a url"));
                return;
            }
            resolve({
                filename: file.originalname || "",
                type: file.mimetype || "",
                uri: result.secure_url,
            });
        }
    );
    upload.end(file.buffer);
});

const imagesFromFiles = async (files, bookerName) => {
    const saved = [];
    for (const file of Array.isArray(files) ? files : []) {
        if (!file?.buffer?.length) continue;
        saved.push(await uploadBuffer(file, bookerName));
    }
    return saved;
};

const imagesFromBody = async (images, bookerName) => {
    const saved = [];
    for (const image of imageList(images)) {
        if (isCloudinaryUrl(image.uri)) {
            saved.push(image);
            continue;
        }
        if (/^https?:\/\//i.test(image.uri) || image.uri.startsWith("data:image/")) {
            const result = await cloudinaryClient().uploader.upload(image.uri, {
                folder: bookerFolder(bookerName),
                resource_type: "image",
            });
            if (!result?.secure_url) throw new Error("Cloudinary did not return a url");
            saved.push({ ...image, uri: result.secure_url });
        }
    }
    return saved;
};

const nextOrderCode = async () => {
    const code = await DistributorSaleOrderModal.findOne({ FromSNd: { $ne: "true" } }).sort({ OrderCode: -1 }).limit(1);
    const current = code?.OrderCode ? parseInt(code.OrderCode, 10) : 0;
    const nextNumber = (Number.isFinite(current) ? current : 0) + 1;
    return nextNumber.toString().padStart(6, "0");
};

export const createDistributorSaleOrder = async (req, res) => {
    try {
        const body = { ...(req.body || {}) };
        body.OrderData = parseJsonField(body.OrderData);

        let distributorId = text(body.Distrbutor || body.Distributor || body.Customer);
        console.log(body.OrderData)
        if (!distributorId && body.DistrbutorCode) {
            const found = await DistrbutorModal.findOne({ DistrbutorSystemCode: body.DistrbutorCode }).select("_id DistrbutorName");
            if (!found) return res.status(400).send("Distributor not found");
            distributorId = found._id.toHexString();
            if (!text(body.DistrbutorName)) body.DistrbutorName = found.DistrbutorName || "";
        }

        const lines = Array.isArray(body.OrderData) ? body.OrderData : [];
        const visit = body.Visit === true || text(body.Visit).toLowerCase() === "true";
        if (!distributorId) return res.status(400).send("Distributor is required");
        if (lines.length === 0 && !visit) return res.status(400).send("Order lines are required");

        const orderDate = text(body.OrderDate || body.SaleOrderDate);
        if (!orderDate) return res.status(400).send("Order date is required");

        const clientOrderId = text(body.id || body.ClientOrderId);
        if (clientOrderId) {
            const existing = await DistributorSaleOrderModal.findOne({ ClientOrderId: clientOrderId });
            if (existing) return res.status(200).send(existing);
        }

        const bookerName = await orderBookerName(body.OrderBookerId || body.UserId, body.bookername || body.OrderBookerName);
        const files = await imagesFromFiles(req.files, bookerName);
        const images = files.length ? files : await imagesFromBody(body.Images, bookerName);
        const saved = await DistributorSaleOrderModal.create({
            OrderCode: text(body.OrderCode) || await nextOrderCode(),
            OrderData: lines,
            Distrbutor: distributorId,
            Distributor: text(body.Distributor) || distributorId,
            Customer: text(body.Customer) || distributorId,
            DistrbutorName: text(body.DistrbutorName),
            OrderDate: orderDate,
            SaleOrderDate: text(body.SaleOrderDate) || orderDate,
            PostStatus: text(body.PostStatus) || "Accept",
            Visit: body.Visit === true || text(body.Visit).toLowerCase() === "true",
            TotalAmount: amount(body.TotalAmount),
            Balance: amount(body.Balance),
            Remarks: text(body.Remarks),
            purchase: text(body.purchase),
            Images: images,
            latitude: text(body.latitude),
            longitude: text(body.longitude),
            UserId: text(body.UserId || body.OrderBookerId),
            OrderBookerId: text(body.OrderBookerId || body.UserId),
            kind: text(body.kind) || "distributor",
            ClientOrderId: clientOrderId || undefined,
            FromSNd: body.FromSNd,
            type: body.type,
            CleareDetail: body.CleareDetail,
        });
        res.status(200).send(saved);
    } catch (err) {
        console.log(err);
        const duplicate = err?.code === 11000;
        res.status(400).send(duplicate ? "This order was already saved" : (err?.message || "Order could not be saved"));
    }
}
export const getDistributorDaySummary = (req, res) =>
    sendDayReport(res, () => buildDistributorDaySummary(req.query.OrderBooker, req.query.date));

export const getDistributorDayTrend = (req, res) =>
    sendDayReport(res, () => buildDistributorDayTrend(req.query.OrderBooker, req.query.from, req.query.to));



export const GetAllDistributorSaleOrder = async (req, res) => {
    try {

        const Order = await DistributorSaleOrderModal.find()
        res.status(200).send(Order)
    } catch (err) {
        console.log(err)
        res.status(400).send(err)

    }
}


export const UpdateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params
        const { status, RejectReson } = req.body

        if (status === "Process") {
            const order = await DistributorSaleOrderModal.findById(id).lean();
            if (!order) {
                return res.status(404).send({ success: false, message: "Order not found" });
            }

            const dist = await DistrbutorModal.findById(order.Distrbutor).lean();
            if (dist?.checkCredit) {
                const check = await checkCreditLimit(dist, Number(order.TotalAmount) || 0);
                console.log("check---->", check);
                if (!check.allowed) {
                    return res.status(400).send({ success: false, message: check.reasons.join(" | ") });
                }
            }
        }

        if (status == "Reject") {
            console.log(status, RejectReson)
            const data = await DistributorSaleOrderModal.findByIdAndUpdate(
                id,
                { PostStatus: status, RejectReson: RejectReson },
                { new: true }
            );

            res.status(200).send(data)

        }
        else {
            const data = await DistributorSaleOrderModal.findByIdAndUpdate(
                id,
                { PostStatus: status },
                { new: true }
            );


            res.status(200).send(data)
        }


    } catch (err) {
        res.status(400).send(err)
    }
}

export const UpdateOrder = async (req, res) => {
    try {
        const { id } = req.params
        

        const data = await DistributorSaleOrderModal.findByIdAndUpdate(
            id,
            req.body,
        );

            res.status(200).send(data)
    } catch (err) {
        res.status(400).send(err)
    }
}

export const UpdateOrderStatusByNumber = async (req, res) => {
    try {
        const { OrderCode } = req.params
        const { status, RejectReson } = req.body
        console.log(status)
        if (status == "Reject") {
            console.log(status, RejectReson)
            const data = await DistributorSaleOrderModal.findOne(
                { OrderCode: OrderCode },
                { PostStatus: status, RejectReson: RejectReson },
                { new: true }
            );

            res.status(200).send(data)

        }
        else {
            const data = await DistributorSaleOrderModal.findOneAndUpdate({ OrderCode: OrderCode }, { PostStatus: status });


            res.status(200).send(data)
        }


    } catch (err) {
        console.log(err)
        res.status(400).send(err)
    }
}


export const CleareDistributor = async (req, res) => {
    try {
        const { OrderCode } = req.params

        const data = await DistributorSaleOrderModal.findOneAndUpdate({ OrderCode: OrderCode }, req.body)
        res.status(200).send(data)
    } catch (err) {
        console.log(err)
        res.status(400).send(err)

    }
}


export const cleareOrder = async (req, res) => {
    try {

        const data = await DistributorSaleOrderModal.find(
            {
                type: "cleared",
            },
            {
                _id: 0,
                OrderCode: 1,
                type: 1,
                CleareDetail: 1,

            }
        ).sort({ OrderDate: 1 });

        res.status(200).send(data);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Server error" });
    }
};


export const GetOnlyUnDeliverdOrder = async (req, res) => {
    try {
        const { startDate, endDate } = req.query
        const data = await DistributorSaleOrderModal.find(
            {
                OrderDate
            },

        ).sort({ OrderDate: 1 });

        res.status(200).send(data);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Server error" });
    }
};


export const CancelOrder = async (req, res) => {
    try {
        const orderForClear = req.body;

        const orderCodes = [
            ...new Set(orderForClear.map(i => i.OrderCode))
        ];

        for (const orderCode of orderCodes) {
            const order = await DistributorSaleOrderModal.findOne({ OrderCode: orderCode });
            if (!order || !order.OrderData?.length) continue;

            // update CancelBox per product line
            orderForClear
                .filter(i => i.OrderCode === orderCode)
                .forEach(i => {
                    const productLine = order.OrderData.find(
                        p => String(p.id) === String(i.row)
                    );
                    if (productLine) {
                        productLine.CancelBox = Number(i.CancelBox || 0);
                    }
                    console.log(productLine)
                });
            const updateDorder = await DistributorSaleOrderModal.findOneAndUpdate({ OrderCode: order.OrderCode }, {
                OrderData: order.OrderData
            })
            // calculate status ONCE
            const UpdateDedOrder = await DistributorSaleOrderModal.findOne({ OrderCode: updateDorder.OrderCode })
            const isDelivered = UpdateDedOrder.OrderData.every(p =>
                Number(p.CancelBox || 0) + Number(p.Deliver || 0) ===
                Number(p.totalBox || 0)
            );

            const isPartiallyDelivered = UpdateDedOrder.OrderData.some(p =>
                Number(p.Deliver || 0) > 0
            );

            order.PostStatus = isDelivered
                ? "Delivered"
                : isPartiallyDelivered
                    ? "Partially Delivered"
                    : "Process";

            await UpdateDedOrder.save()
            const CheckOrder = await DistributorSaleOrderModal.findOneAndUpdate({ OrderCode: order.OrderCode })
            const checking = CheckOrder.OrderData.find((item) => item.id == "1769583366343")
            console.log(checking)
        }

        return res.status(200).json({
            success: true,
            message: "Order cancel boxes updated successfully"
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

export const GetRemarks = async (req, res) => {
    try {
        const { Order } = req.params
        const Remarks = await DistributorSaleOrderModal.findOne({ OrderCode: Order }).select({ Remarks: 1 })
        console.log(Remarks)
        res.status(200).send(Remarks)
    } catch (err) {
        res.status(400).send(err)
    }
}

