import CounterModal from "../modal/CounterModal.js"
import SaleOrderDcModal from "../modal/SaleOrderDcModal.js"
import SaleOrderModal from "../modal/SaleOrderModal.js"
import { buildSaleOrderDaySummary, buildSaleOrderDayTrend } from "../utils/saleOrderDaySummary.js"

const sendDayReport = async (res, work) => {
    try {
        const data = await work();
        res.status(200).send({ status: true, data });
    } catch (err) {
        console.log(err);
        res.status(err.statusCode || 500).send({
            status: false,
            message: err.statusCode ? err.message : "Server Error",
        });
    }
};

export const getSaleOrderDaySummary = (req, res) =>
    sendDayReport(res, () => buildSaleOrderDaySummary(req.query.OrderBooker, req.query.date));

export const getSaleOrderDayTrend = (req, res) =>
    sendDayReport(res, () => buildSaleOrderDayTrend(req.query.OrderBooker, req.query.from, req.query.to));

// Generates a unique, sequential 6-digit SaleOrderNumber from the backend.
// Uses an atomic counter so concurrent requests never get the same number.
const getNextSaleOrderNumber = async () => {
    // If the counter is behind existing data (e.g. old client-side generated orders),
    // jump it ahead so new numbers never collide with existing ones.
    const lastOrder = await SaleOrderModal.findOne().sort({ SaleOrderNumber: -1 }).select("SaleOrderNumber");
    const maxSeq = lastOrder ? parseInt(lastOrder.SaleOrderNumber, 10) || 0 : 0;

    try {
        // Create the counter (or bump it up to maxSeq) BEFORE incrementing.
        // NOTE: $inc and $max cannot target the same path in one update (ConflictingUpdateOperators),
        // so the catch-up and the increment are two separate atomic operations.
        await CounterModal.updateOne(
            { name: "saleOrder", sequence_value: { $lt: maxSeq } },
            { $set: { sequence_value: maxSeq } },
            { upsert: true }
        );
    } catch (err) {
        // Rare race: two requests tried to create the counter at the same time.
        // The document now exists — bump it if it is still behind.
        if (err.code === 11000) {
            await CounterModal.updateOne(
                { name: "saleOrder", sequence_value: { $lt: maxSeq } },
                { $set: { sequence_value: maxSeq } }
            );
        } else {
            throw err;
        }
    }

    // Atomic increment — guaranteed unique per request
    const counter = await CounterModal.findOneAndUpdate(
        { name: "saleOrder" },
        { $inc: { sequence_value: 1 } },
        { upsert: true, new: true }
    );

    return String(counter.sequence_value).padStart(6, '0');
};

/**
 * Delivery = SaleOrderDate + 1 day.
 * Sunday is off — if that day is Sunday, move to Monday (e.g. Sat order → Mon).
 */
const deliveryDateFromOrderDate = (saleOrderDate) => {
    const raw = String(saleOrderDate || "").trim().slice(0, 10);
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (!m) return raw || "";
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (Number.isNaN(dt.getTime())) return raw;
    dt.setUTCDate(dt.getUTCDate() + 1);
    // UTC day: 0 = Sunday
    if (dt.getUTCDay() === 0) {
        dt.setUTCDate(dt.getUTCDate() + 1);
    }
    return dt.toISOString().slice(0, 10);
};

export const CreateSaleOrder = async (req, res) => {
    try {
        const saleOrderNumber = await getNextSaleOrderNumber();
        const saleOrderDate = req.body?.SaleOrderDate || req.body?.OrderDate;
        const data = await SaleOrderModal.create({
            ...req.body,
            SaleOrderNumber: saleOrderNumber,
            DeliveryDate: deliveryDateFromOrderDate(saleOrderDate),
        })
        res.status(200).send(data)
    }
    catch (err) {
        console.log(err)
        res.status(400).send("some thing went wrong", err)
    }
}

export const updateSaleOrder = async (req, res) => {
    const { id } = req.params
    try {
        // SaleOrderNumber is owned by the backend counter — never allow renumbering via update
        const { SaleOrderNumber, ...updateData } = req.body
        if (updateData.SaleOrderDate) {
            updateData.DeliveryDate = deliveryDateFromOrderDate(updateData.SaleOrderDate);
        }
        await SaleOrderModal.findByIdAndUpdate(id, updateData)
        const findedData = await SaleOrderModal.findById(id)
        res.status(200).send(findedData)

    }
    catch (err) {
        res.status(400).send("some thing went wrong")
    }
}

export const getAllSaleOrder = async (req, res) => {
    try {
        const data = await SaleOrderModal.find().sort({ _id: -1 })
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        res.status(400).send("some thing went wrong")

    }
}


export const getAllSaleOrderBYDistrbutor = async (req, res) => {
    try {
        const data = await SaleOrderModal.find({ Distrbutor: req.params.Distributor }).sort({ _id: -1 })
        console.log(req.params.Distributor)
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        res.status(400).send("some thing went wrong")

    }
}

export const getLastSaleOrderCode = async (req, res) => {
    try {
        const LastSaleOrderCode = await SaleOrderModal.findOne().sort({ _id: -1 }).limit(1)

        res.send({ status: true, data: LastSaleOrderCode });
    } catch (err) {
        console.log(err)
    }
}


export const deleteSaleOrder = async (req, res) => {
    const { id } = req.params;

    try {
        const saleOrder = await SaleOrderModal.findById(id);
        if (!saleOrder) {
            return res.status(404).json({ status: false, message: "Sale Order not found" });
        }

        const orderNumber = saleOrder.SaleOrderNumber;
        const relatedDcs = await SaleOrderDcModal.find({
            "DcData.Order": orderNumber
        });
        if (relatedDcs.length !== 0) {
            res.status(400).send(`it is used in Dc ${relatedDcs[0].DcNumber}`)
        }
        else {
            await SaleOrderModal.findByIdAndDelete(id)
            res.status(200).send("Data Delete")
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: false, message: "Something went wrong" });
    }
};



export const updateOrderStatus = async (req, res) => {
    const { id } = req.params
    const { Status } = req.body
    try {
        const data = await SaleOrderModal.findByIdAndUpdate(id, { Status: Status })
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        res.status(400).send("some thing went wrong")

    }

}



export const getDataByOrderBooker = async (req, res) => {
    try {
        const data = await SaleOrderModal.find({ OrderBookerId: req.params.OrderBooker, Status: true }).sort({ _id: -1 })
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        res.status(400).send("some thing went wrong")
    }
}


export const getSaleOrder = async (req, res) => {
    try {
       const  {date , OrderBooker} = req.query
       console.log(date ,OrderBooker )
       const data = await SaleOrderModal.find({SaleOrderDate : date , OrderBookerId:  OrderBooker , Status : "true" })
       res.status(200).send({ status: true, data: data });
       
    } catch (err) {

    }
}

const text = (value) => (value == null ? "" : String(value).trim());

const parseMaybeJson = (value, fallback) => {
    if (value == null || value === "") return fallback;
    if (typeof value === "object") return value;
    try {
        return JSON.parse(String(value));
    } catch {
        return fallback;
    }
};

/** Mobile app posts multipart FormData (with optional photos). */
export const MobileCreateSaleOrder = async (req, res) => {
    try {
        const body = req.body && typeof req.body === "object" ? req.body : {};
        console.log("MobileCreateSaleOrder body keys:", Object.keys(body));

        const saleOrderNumber = await getNextSaleOrderNumber();
        const saleOrderData = parseMaybeJson(body.SaleOrderData ?? body.OrderData, []);
        const lines = Array.isArray(saleOrderData) ? saleOrderData : [];
        const delivery = parseMaybeJson(body.deliveryLocation, {}) || {};

        const customer = text(body.Customer || body.Distrbutor || body.Distributor);
        const distributor = text(body.Distrbutor || body.Distributor || body.Customer);
        const orderBookerId = text(body.OrderBookerId || body.UserId || body.orderBookerId);
        const saleOrderDate = text(body.SaleOrderDate || body.OrderDate);

        if (!customer) {
            return res.status(400).send({ status: false, message: "Customer is required" });
        }
        if (!distributor) {
            return res.status(400).send({ status: false, message: "Distributor is required" });
        }
        if (!orderBookerId) {
            return res.status(400).send({ status: false, message: "OrderBookerId is required" });
        }
        if (!saleOrderDate) {
            return res.status(400).send({ status: false, message: "SaleOrderDate is required" });
        }

        const imageUrls = [];
        if (Array.isArray(req.files) && req.files.length) {
            for (const file of req.files) {
                if (file?.originalname) imageUrls.push(file.originalname);
            }
        }

        const newOrder = await SaleOrderModal.create({
            Customer: customer,
            Distrbutor: distributor,
            SaleOrderData: lines,
            SaleOrderDate: saleOrderDate,
            DeliveryDate: deliveryDateFromOrderDate(saleOrderDate),
            Remarks: text(body.Remarks),
            OrderBookerId: orderBookerId,
            Status: text(body.Status) || "true",
            SaleOrderNumber: saleOrderNumber,
            latitude: text(body.latitude || delivery.latitude),
            longitude: text(body.longitude || delivery.longitude),
            Visit: body.Visit === true || body.Visit === "true",
            Images: imageUrls,
            createdAt: new Date(),
        });

        res.status(201).send({
            status: true,
            message: "Sale Order Created Successfully",
            data: newOrder,
        });
    } catch (err) {
        console.log(err);
        res.status(500).send({
            status: false,
            message: err?.message || "Server Error",
            err: err?.message || String(err),
        });
    }
};

export const getSalesOrderByNumber = async (req ,res)=>{
    try{
        const {OrderNumber} = req.params
    const data =  await SaleOrderModal.findOne({SaleOrderNumber : OrderNumber})
    res.status(200).send(data)
    }catch(err){
        res.status(500).send({ status: false, message: "Server Error" , err});
    }
}