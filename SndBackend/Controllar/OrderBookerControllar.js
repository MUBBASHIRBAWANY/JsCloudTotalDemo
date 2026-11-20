import mongoose from "mongoose";
import OrderBookerModal from "../modal/OrderBookerModal.js";
import DistributerModal from "../modal/DistributerModal.js"
import CutomerModal from "../modal/CustomorModal.js";
import ProductModal from "../modal/ProductModal.js";
import TotalProductModal from "../modal/TotalProductModal.js";
import { withCustomerAging } from "./customerAging.js";
import { comparePassword, getAuthontication, hashPassword } from "../modal/UserModal.js";
import jwt from "jsonwebtoken";

/** Products with TotalQuantity > 0 for the order booker's distributor. */
const productsInStockForDistributor = async (distributorId) => {
    const dist = String(distributorId || "").trim();
    if (!dist) return [];

    const stockRows = await TotalProductModal.find({
        Distrbutor: dist,
        TotalQuantity: { $gt: 0 },
    })
        .select("ProductName TotalQuantity")
        .lean();

    const qtyById = new Map();
    const objectIds = [];
    for (const row of stockRows) {
        const id = String(row.ProductName || "").trim();
        if (!id || !mongoose.Types.ObjectId.isValid(id)) continue;
        qtyById.set(id, Number(row.TotalQuantity) || 0);
        objectIds.push(new mongoose.Types.ObjectId(id));
    }
    if (!objectIds.length) return [];

    const products = await ProductModal.find({ _id: { $in: objectIds } }).lean();
    return products
        .map((product) => ({
            ...product,
            TotalQuantity: qtyById.get(String(product._id)) || 0,
        }))
        .sort((a, b) =>
            String(a.ProductName || "").localeCompare(String(b.ProductName || "")),
        );
};

export const CreateOrderBooker = async (req, res) => {
    try {
        const {Password} = req.body;
        const OrderBookerPassword = await hashPassword(Password);
     const allData = {
            ...req.body,
            passord : OrderBookerPassword
        }
            console.log(allData)
            const data = await OrderBookerModal.create(allData)
            res.status(200).send("data Add")
     
     
    }
    catch (err) {
        console.log(err)
        res.status(400).send("some thing went wrong")
    }
}
export const getLastOrderBookerCode = async (req, res) => {
    try {
        const LastOrderBookerCode = await OrderBookerModal.findOne({}).sort({ _id: -1 }).limit(1)
        console.log(LastOrderBookerCode)
        res.send({ status: true, data: LastOrderBookerCode });
    } catch (err) {
        console.log(err)
    }
}
export const updateOrderBooker = async (req, res) => {
    const { id } = req.params
    try {
        const data = await OrderBookerModal.findByIdAndUpdate(id, req.body)
        res.status(200).send("Data Edit")
    }
    catch (err) {
        res.status(400).send("some thing went wrong")
    }
}

export const getAllOrderBooker = async (req, res) => {
    try {
        const data = await OrderBookerModal.find()
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        res.status(400).send("some thing went wrong")

    }
}

export const deleteOrderBooker = async (req, res) => {
    const { id } = req.params
    try {
        const data = await OrderBookerModal.findByIdAndDelete(id)
        res.status(200).send({ status: true, data: data });
    }
    catch (err) {
        res.status(400).send("some thing went wrong")
    }
}

export const getOrderBookerByDistributor = async (req, res) => {
    const { Distributor } = req.params
    
    try {
        console.log(Distributor)
        const data = await OrderBookerModal.find({ Distributor: Distributor }).sort({ _id: -1 })
        res.status(200).send({
            status: true,
            data: data
        });
    } catch (err) {
        console.error('Error fetching categories by vendor:', err);
        res.status(500).send({
            status: false,
            message: 'Failed to fetch categories',
            error: err.message
        });
    }
}


export const PushBulkData = async (req, res) => {
    console.log(req.body)
    try {
        const insertedIds = [];

        for (const item of req.body) {
            const code = await OrderBookerModal.find({ Vendor: item.Vendor }).sort({ _id: -1 }).limit(1)
            console.log(code)
            let nextCode
            if (code.length == 0) {
                const nextNumber = parseInt("000", 10) + 1;
                nextCode = nextNumber.toString().padStart(3, '0')
            }
            else {
                const nextNumber = parseInt(code[0].code, 10) + 1;
                nextCode = nextNumber.toString().padStart(3, '0')
            }

            if (nextCode == "100") {
                res.status(500).send({
                    status: false,
                    message: 'Failed to fetch categories',
                    error: err.message
                });
            }
            const newOrderBooker = new OrderBookerModal({
                OrderBookerName: item.OrderBookerName,
                Vendor: item.Vendor,
                code: nextCode,
                masterCode: item.vendorCode + nextCode,
                salesFlowRef: item.SalesFLowRef,
                // Add other fields if needed
            });

            const savedItem = await newOrderBooker.save();
            insertedIds.push(savedItem._id);
            console.log(`Inserted: ${item.OrderBookerName}`);
        }
        res.status(200).send({
            status: true,
            data: insertedIds
        });
        console.log('All documents inserted successfully!');
        return insertedIds;
    } catch (error) {
        console.error('Error inserting documents:', error.message);
        throw error;
    }
};


export const updatePassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword, currentPassword } = req.body || {};
        if (!id) {
            return res.status(400).send("Order booker id is required");
        }
        if (!newPassword || typeof newPassword !== "string" || !newPassword.trim()) {
            return res.status(400).send("New password is required");
        }
        const nextPassword = newPassword.trim();
        if (nextPassword === "123") {
            return res.status(400).send("Password cannot be 123. Choose a different password.");
        }
        if (nextPassword.length < 4) {
            return res.status(400).send("Password must be at least 4 characters");
        }

        const user = await OrderBookerModal.findById(id).select("+passord");
        if (!user) {
            return res.status(404).send("Order booker not found");
        }

        if (currentPassword && typeof currentPassword === "string" && currentPassword.trim() !== "123") {
            const ok = await comparePassword(currentPassword.trim(), user.passord);
            if (!ok) {
                return res.status(400).send("Current password is incorrect");
            }
        }

        user.passord = await hashPassword(nextPassword);
        user.OtpUpdate = true;
        await user.save();

        const data = user.toObject();
        delete data.passord;
        res.status(200).send({ status: true, message: "Password updated", data });
    } catch (err) {
        console.log(err);
        res.status(400).send(err?.message || "Password could not be updated");
    }
};

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findOrderBookerForLogin = async (loginId) => {
    const id = String(loginId || "").trim();
    if (!id) return null;

    const exact = await OrderBookerModal.findOne({
        $or: [
            { LoginId: { $regex: `^${escapeRegex(id)}$`, $options: "i" } },
            { OrderBookerName: { $regex: `^${escapeRegex(id)}$`, $options: "i" } },
        ],
    }).select("+passord");
    if (exact) return exact;

    // Allow short ids like "Bilal" when LoginId is "Bilal khan" (unique prefix only).
    const prefixMatches = await OrderBookerModal.find({
        $or: [
            { LoginId: { $regex: `^${escapeRegex(id)}(\\s|$)`, $options: "i" } },
            { OrderBookerName: { $regex: `^${escapeRegex(id)}(\\s|$)`, $options: "i" } },
        ],
    }).select("+passord").limit(5);

    if (prefixMatches.length === 1) return prefixMatches[0];
    if (prefixMatches.length > 1) {
        const err = new Error(
            `Multiple order bookers match "${id}". Use full Login ID (e.g. ${prefixMatches[0].LoginId}).`,
        );
        err.statusCode = 400;
        throw err;
    }
    return null;
};

export const OrderBookerLogin = async (req, res) => {
    try {
        const { firstname, password } = req.body;
        console.log(firstname, password)
        if (!firstname || !password) {
            return res.status(400).send("All fields are required");
        }

        let user;
        try {
            user = await findOrderBookerForLogin(firstname);
        } catch (lookupError) {
            return res.status(lookupError.statusCode || 400).send(lookupError.message);
        }
        console.log(user)
        if (!user) {
            return res.status(400).send("Invalid UserName or password");
        }

        if (password == "123" && (user?.OtpUpdate === true || user?.OtpUpdate === "true")) {
            return res.status(400).send("Otp Is Updated");
        }

        const isValidPassword = await comparePassword(password, user.passord);
        if (!isValidPassword) {
            return res.status(400).send("Invalid email or password");
        }

        const userData = user.toObject();
        delete userData.passord;
        const token = await getAuthontication(userData);
        const customerRows = await CutomerModal.find({ OrderBooker: String(user._id) })
            .sort({ CustomorName: 1 })
            .lean();
        const customers = await withCustomerAging(customerRows);
        const products = await productsInStockForDistributor(user.Distributor);
        res.cookie("token", token);
        res.send({
            data: {
                status: "success",
                token: token,
                user: userData,
                customers,
                products,
                route: password == "123" ? "yes" : "no",
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send(`Server Error: ${err.message}`);
    }
};
export const OrderBookerProfile = async (req, res) => {

    try {
        
        const token = req.body.authorization
console.log(token)
        if (!token) {
            return res.status(403).send("Invalid Token");

        }

        jwt.verify(token, "peral-Dynamic", (err, decoded) => {
            if (err) {

                return res.status(403).send("Invalid Token");

            }
            res.status(200).send({ status: true, data: decoded });
        });
    } catch (err) {
        console.error(err);
        res.status(500).send(`Server Error: ${err.message}`);
    }
};


