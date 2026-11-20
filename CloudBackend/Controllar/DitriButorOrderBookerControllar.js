import jwt from "jsonwebtoken";
import DitriButorOrderBookerModal from "../modal/DitriButorOrderBookerModal.js";
import { comparePassword, getAuthontication, hashPassword } from "../modal/userModal.js";
import VendorModal from "../modal/VendorModal.js"
import DistrbutorModal from "../modal/DistributerModal.js";
import DistrbutorInvoiceModal from "../modal/DistrbutorInvoiceModal.js";
import InvoiceOpeningModal from "../modal/OpeningInvoicesModal.js";
import PriceListModal from "../modal/PriceListModal.js";
import ProductModal from "../modal/ProductModal.js";
import DistributorSaleOrderModal from "../modal/DistributorSaleOrderModal.js";

const toNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const openingRemaining = (item) => {
    if (item?.RemainingAmount != null && item?.RemainingAmount !== "") return toNumber(item.RemainingAmount);
    if (item?.RemaingAmount != null && item?.RemaingAmount !== "") return toNumber(item.RemaingAmount);
    if (item?.Remaining != null && item?.Remaining !== "") return toNumber(item.Remaining);
    return toNumber(item?.Amount) - toNumber(item?.RecivedAmount);
};

const orderBookerLoginData = async (orderBookerId) => {
    const id = String(orderBookerId);
    const distributors = await DistrbutorModal.find({ OrderBooker: id }).lean();
    const distributorIds = distributors.map((item) => String(item._id));
    const agingMap = new Map();

    if (distributorIds.length) {
        const invoiceAging = await DistrbutorInvoiceModal.aggregate([
            { $match: { Distrbutor: { $in: distributorIds } } },
            {
                $project: {
                    Distrbutor: 1,
                    remaining: {
                        $convert: {
                            input: { $ifNull: ["$Remaining", 0] },
                            to: "double",
                            onError: 0,
                            onNull: 0
                        }
                    }
                }
            },
            { $match: { remaining: { $gt: 0 } } },
            { $group: { _id: "$Distrbutor", sumAging: { $sum: "$remaining" } } }
        ]);

        invoiceAging.forEach((row) => {
            agingMap.set(String(row._id), toNumber(row.sumAging));
        });

        const openingDocs = await InvoiceOpeningModal.find().select("InvoiceData").lean();
        const idSet = new Set(distributorIds);
        openingDocs.forEach((doc) => {
            const rows = Array.isArray(doc.InvoiceData)
                ? doc.InvoiceData
                : Object.values(doc.InvoiceData || {});
            rows.forEach((item) => {
                const clientId = String(item?.Client || "").trim();
                if (!idSet.has(clientId)) return;
                const remaining = openingRemaining(item);
                if (remaining > 0) {
                    agingMap.set(clientId, (agingMap.get(clientId) || 0) + remaining);
                }
            });
        });
    }

    const distributorsOut = distributors
        .map((item) => {
            const { Password, ...rest } = item;
            return {
                ...rest,
                sumAging: round2(agingMap.get(String(item._id)) || 0)
            };
        })
        .sort((a, b) => String(a.DistrbutorName || "").localeCompare(String(b.DistrbutorName || "")));

    const sumAging = round2(distributorsOut.reduce((sum, item) => sum + item.sumAging, 0));

    const priceListIds = [...new Set(distributors.map((item) => item.PriceList).filter(Boolean))];
    const priceLists = priceListIds.length
        ? await PriceListModal.find({ _id: { $in: priceListIds } }).lean()
        : [];

    const priceByProduct = new Map();
    priceLists.forEach((priceList) => {
        (priceList.PriceListData || []).forEach((row) => {
            const productId = String(row?.product || "").trim();
            if (!productId) return;
            if (!priceByProduct.has(productId)) priceByProduct.set(productId, []);
            priceByProduct.get(productId).push({
                priceList: String(priceList._id),
                priceListName: priceList.PriceListName || "",
                priceListStatus: priceList.PriceListStatus || "",
                TPSale: row.TPSale ?? 0,
                TO: row.TO ?? 0,
                DisPer: row.DisPer ?? 0,
                SpecialTO: row.SpecialTO ?? 0,
                NetSale: row.NetSale ?? 0,
                ClaimableSpecialTO: row.ClaimableSpecialTO ?? 0,
                UnClaimableSpecialTO: row.UnClaimableSpecialTO ?? 0,
                SchemeStartDate: row.SchemeStartDate || "",
                SchemeEndDate: row.SchemeEndDate || ""
            });
        });
    });

    const productDocs = priceByProduct.size
        ? await ProductModal.find({ _id: { $in: [...priceByProduct.keys()] } }).lean()
        : [];

    const products = productDocs
        .map((product) => ({
            ...product,
            prices: priceByProduct.get(String(product._id)) || []
        }))
        .sort((a, b) => String(a.ProductName || "").localeCompare(String(b.ProductName || "")));

    return { distributors: distributorsOut, customers: distributorsOut, sumAging, products };
};
export const CreateDitriButorOrderBooker = async (req, res) => {
    try {
        const {OrderBookerID , OrderBookerPassword} =req.body
        const hashpassword = await hashPassword(OrderBookerPassword)
        const data = await DitriButorOrderBookerModal.create({
            ...req.body,
            OrderBookerPassword :hashpassword
        })
        res.status(200).send("data Add")

    }
    catch (err) {
        console.log(err)
        res.status(400).send("some thing went wrong")
    }
}
export const getLastDitriButorOrderBookerCode = async (req, res) => {
    try {
        const LastOrderBookerCode = await DitriButorOrderBookerModal.findOne({}).sort({ _id: -1 }).limit(1)
        console.log(LastOrderBookerCode)
        res.send({ status: true, data: LastOrderBookerCode });
    } catch (err) {
        console.log(err)
    }
}
export const updateDitriButorOrderBooker = async (req, res) => {
    const { id } = req.params
    try {
        const {OrderBookerPassword} = req.body
        const hashpassword = await hashPassword(OrderBookerPassword)
        if(OrderBookerPassword){
            const data = await DitriButorOrderBookerModal.findByIdAndUpdate(id, {
                ...req.body,
                OrderBookerPassword : hashpassword
            })
            res.status(200).send("Data Edit")

        }
    }
    catch (err) {
        res.status(400).send("some thing went wrong")
    }
}

export const getAllDitriButorOrderBooker = async (req, res) => {
    try {
        const data = await DitriButorOrderBookerModal.find()
        
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        res.status(400).send("some thing went wrong")

    }
}

export const deleteDitriButorOrderBooker = async (req, res) => {
    const { id } = req.params
    try {
        const data = await DitriButorOrderBookerModal.findByIdAndDelete(id)
        res.status(200).send({ status: true, data: data });
    }
    catch (err) {
        res.status(400).send("some thing went wrong")
    }
}

export const getLastDitriButorOrderBooker = async (req, res) => {
    try {
        const data = await DitriButorOrderBookerModal.find().sort({ _id: -1 }).limit(1)
        console.log(data)
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
            const code = await DitriButorOrderBookerModal.find({ Vendor: item.Vendor }).sort({ _id: -1 }).limit(1)
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
            const newOrderBooker = new DitriButorOrderBookerModal({
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

export const updatePassword = async (req ,res) =>{
    try {
        const { id } = req.params
        const { newPassword, currentPassword } = req.body || {}
        if (!id) {
            return res.status(400).send("Order booker id is required")
        }
        if (!newPassword || typeof newPassword !== "string" || !newPassword.trim()) {
            return res.status(400).send("New password is required")
        }
        const nextPassword = newPassword.trim()
        if (nextPassword === "123") {
            return res.status(400).send("Password cannot be 123. Choose a different password.")
        }
        if (nextPassword.length < 4) {
            return res.status(400).send("Password must be at least 4 characters")
        }

        const user = await DitriButorOrderBookerModal.findById(id).select("+OrderBookerPassword")
        if (!user) {
            return res.status(404).send("Order booker not found")
        }

        // Optional: when client sends currentPassword, verify it (skip strict match for default OTP "123")
        if (currentPassword && typeof currentPassword === "string" && currentPassword.trim() !== "123") {
            const ok = await comparePassword(currentPassword.trim(), user.OrderBookerPassword)
            if (!ok) {
                return res.status(400).send("Current password is incorrect")
            }
        }

        user.OrderBookerPassword = await hashPassword(nextPassword)
        user.OtpUpdate = true
        await user.save()

        const data = user.toObject()
        delete data.OrderBookerPassword
        res.status(200).send({ status: true, message: "Password updated", data })
    }catch(err){
        console.log(err)
        res.status(400).send(err?.message || "Password could not be updated")
    }
}

export const orderBookerProfile = async (req, res) => {
    try {
        const token = req.body?.authorization;
        if (!token || typeof token !== "string") {
            return res.status(403).send("Invalid Token");
        }
        const decoded = jwt.verify(token, "peral-Dynamic");
        const bookerId = decoded?.val?._id || decoded?.val?.id;
        if (!bookerId) return res.status(403).send("Invalid Token");
        const user = await DitriButorOrderBookerModal.findById(bookerId).select("-OrderBookerPassword");
        if (!user) return res.status(403).send("Invalid Token");
        const val = user.toObject();
        delete val.OrderBookerPassword;
        res.status(200).send({ status: true, data: { val } });
    } catch (err) {
        if (err?.name === "JsonWebTokenError" || err?.name === "TokenExpiredError") {
            return res.status(403).send("Invalid Token");
        }
        console.error(err);
        res.status(500).send("Server Error");
    }
};

const orderBookerFromToken = async (req) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) return null;
    const decoded = jwt.verify(token, "peral-Dynamic");
    const bookerId = decoded?.val?._id || decoded?.val?.id;
    if (!bookerId) return null;
    return DitriButorOrderBookerModal.findById(bookerId).select("OrderBookerName");
};

const nextDistributorOrderCode = async () => {
    const code = await DistributorSaleOrderModal.findOne({ FromSNd: { $ne: "true" } }).sort({ OrderCode: -1 }).limit(1);
    const current = code?.OrderCode ? parseInt(code.OrderCode, 10) : 0;
    const nextNumber = (Number.isFinite(current) ? current : 0) + 1;
    return nextNumber.toString().padStart(6, "0");
};

export const createOrderByOrderBooker = async (req, res) => {
    try {
        const booker = await orderBookerFromToken(req);
        if (!booker) return res.status(401).send("Access denied");

        const { Distrbutor, OrderData, OrderDate, Remarks, TotalAmount } = req.body || {};
        if (!Distrbutor || !Array.isArray(OrderData) || OrderData.length === 0) {
            return res.status(400).send("Customer and order lines are required");
        }

        const customer = await DistrbutorModal.findOne({
            _id: Distrbutor,
            OrderBooker: String(booker._id),
        }).select("_id DistrbutorName");
        if (!customer) return res.status(400).send("This customer is not assigned to you");

        const saved = await DistributorSaleOrderModal.create({
            OrderCode: await nextDistributorOrderCode(),
            Distrbutor: String(customer._id),
            OrderDate: OrderDate || new Date().toISOString().slice(0, 10),
            OrderData,
            PostStatus: "Accept",
            TotalAmount: toNumber(TotalAmount),
            Remarks: Remarks || `Order by ${booker.OrderBookerName}`,
        });
        res.status(200).send(saved);
    } catch (err) {
        console.error(err);
        const message = err?.name === "JsonWebTokenError" || err?.name === "TokenExpiredError"
            ? "Invalid or expired token"
            : "Order could not be saved";
        res.status(400).send(message);
    }
};

export const loginOrderBooker = async (req, res) => {
    try {
        const { firstname, password } = req.body;
        console.log(req.body , "body")
        console.log(firstname, password)

        if (!firstname || !password) {
            return res.status(400).send("All fields are required");
        }

        const user = await DitriButorOrderBookerModal.findOne({ OrderBookerID : firstname }).select("+OrderBookerPassword");
        console.log(user)
        if (password == "123" && (user?.OtpUpdate === true || user?.OtpUpdate === "true")) {
            return res.status(400).send("Otp Is Updated");
        }
        if (!user) {
            return res.status(400).send("Invalid UserName or password");
        }

        const isValidPassword = await comparePassword(password, user.OrderBookerPassword);
        if (!isValidPassword) {
            return res.status(400).send("Invalid email or password");
        }

        const token = await getAuthontication(user);
        const userData = user.toObject();
        delete userData.OrderBookerPassword;
        const { distributors, customers, sumAging, products } = await orderBookerLoginData(user._id);
        res.send({
            data: {
                login: true,
                status: "success",
                token: token,
                user: userData,
                route :  password == "123" ? 'yes' : 'no',
                distributors,
                customers,
                sumAging,
                products
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send(`Server Error: ${err}`);
    }
}