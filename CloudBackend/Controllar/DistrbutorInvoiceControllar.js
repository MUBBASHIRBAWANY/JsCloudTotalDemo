import DistrbutorInvoiceModal from "../modal/DistrbutorInvoiceModal.js"
import VoucherModal from "../modal/VoucherModal.js";
import OrderDcModal from "../modal/SaleOrderDcModal.js";
import AdministrativeModal from "../modal/AdministrativeModal.js";
import { Transporter } from "../App.js";
import InvoiceOpeningModal from "../modal/OpeningInvoicesModal.js";
import { voucher } from "../Vouchers.js";
import DistrbutorModal from "../modal/DistributerModal.js";
import { Check } from "../Check.js";
import DistributorSaleOrderModal from "../modal/DistributorSaleOrderModal.js";
import TotalProductModal from "../modal/TotalProductModal.js";
import { checkMonthClose } from "../utils/checkMonthClose.js";





export const deleteDistrbutorInvoice  = async (req, res) => {
    try {
        const dataarr = []
 for (const val of Check) {
    
    const data = await TotalProductModal.findOne({ProductName : val.Product, Store : "69589f74bed54ca7db54930c"})
             await TotalProductModal.findByIdAndUpdate(data._id ,{
                TotalQuantity : Number(val.Remaining) ,
                Amount : Number(data.AvgRate) * Number(val.Remaining) 
            })
    const data2 = await TotalProductModal.findOne({ProductName : val.Product, Store : "69589f74bed54ca7db54930c"})

            dataarr.push(data2)
        }
        res.status(200).send( dataarr)
    } catch (err) {
        console.log(err)
        res.status(400).send(err)
    }
}

const cleanOrderRemark = (value) => {
    const remark = value == null ? "" : String(value).trim();
    if (!remark) return "";
    return remark.startsWith("Remarks") ? remark.slice(8).trim() : remark;
};

const withOrderRemarks = async (invoices) => {
    const list = Array.isArray(invoices) ? invoices : [];
    if (!list.length) return list;

    const dcNumbers = [...new Set(list.map((invoice) => invoice?.DcNumber).filter(Boolean).map(String))];
    if (!dcNumbers.length) {
        return list.map((invoice) => ({
            ...invoice,
            Remarks: cleanOrderRemark(invoice?.Remarks),
            BiltyNumber: invoice?.BiltyNumber || "",
        }));
    }

    // One light query: DC codes -> first linked order code + bilty
    const dcs = await OrderDcModal.find({ DCCode: { $in: dcNumbers } })
        .select({ DCCode: 1, BiltyNumber: 1, "DCData.Order": 1, "DCData.OrderCode": 1 })
        .lean();

    const orderFromDc = (dc) =>
        (dc?.DCData || []).map((row) => row?.Order || row?.OrderCode).find((code) => code != null && code !== "");

    const orderCodes = [...new Set(dcs.map(orderFromDc).filter((code) => code != null && code !== "").map(String))];
    const orders = orderCodes.length
        ? await DistributorSaleOrderModal.find({ OrderCode: { $in: orderCodes } })
            .select({ OrderCode: 1, Remarks: 1 })
            .lean()
        : [];

    const dcByCode = new Map(dcs.map((dc) => [String(dc.DCCode), dc]));
    const remarkByOrder = new Map(orders.map((order) => [String(order.OrderCode), cleanOrderRemark(order.Remarks)]));

    return list.map((invoice) => {
        const dc = dcByCode.get(String(invoice?.DcNumber));
        const orderCode = orderFromDc(dc);
        return {
            ...invoice,
            Remarks: orderCode != null && orderCode !== ""
                ? (remarkByOrder.get(String(orderCode)) || "")
                : cleanOrderRemark(invoice?.Remarks),
            BiltyNumber: dc?.BiltyNumber || invoice?.BiltyNumber || "",
        };
    });
};

const sumInvoiceField = (rows, field) =>
    (rows || []).reduce((sum, row) => sum + (Number(row?.[field]) || 0), 0);

const dslVoucherNumber = (invoiceCode) => `DSl${invoiceCode}`;

/** Rebuild DSL voucher from saved invoice amounts only — does not change invoice rates. */
const buildDslVoucher = ({ invoiceCode, invoiceDate, store, distributor, invoiceData, advance, dc, admin }) => {
    const biltyAmount = Number(dc?.BiltyAmount || 0);
    const isBtp = dc?.Biltytype == "BTP";
    const advanceAmt = Number(advance || 0);

    return {
        VoucherType: "DSL",
        VoucherNumber: dslVoucherNumber(invoiceCode),
        VoucherDate: invoiceDate,
        status: "Post",
        VoucharData: [
            {
                Account: admin.Client,
                Debit: sumInvoiceField(invoiceData, "netAmount")
                    - advanceAmt
                    + (isBtp ? biltyAmount : 0)
                    - biltyAmount,
                Store: store,
                Client: distributor,
            },
            {
                Account: admin.TradeOffer,
                Debit: sumInvoiceField(invoiceData, "discount"),
                Store: store,
            },
            {
                Account: admin.SpecialDiscount,
                Debit: sumInvoiceField(invoiceData, "specialdiscount"),
                Store: store,
            },
            {
                Account: admin.SpecialTO,
                Debit: sumInvoiceField(invoiceData, "SpecialTO"),
                Store: store,
            },
            {
                Account: admin.salesRevenue,
                Credit: sumInvoiceField(invoiceData, "Amount"),
                Store: store,
            },
            {
                Account: admin.TransporterPayable,
                Credit: isBtp ? biltyAmount : 0,
                Store: store,
                Transporter: dc?.Transporter,
            },
            {
                Account: admin.TransportExp,
                Debit: biltyAmount,
                Store: store,
            },
            {
                Account: admin.AdvanceDisCount,
                Debit: advanceAmt,
                Store: store,
            },
        ].filter(
            (item) => (Number(item.Debit) || 0) !== 0 || (Number(item.Credit) || 0) !== 0
        ),
    };
};

const deleteDslVoucher = async (invoiceCode) => {
    await VoucherModal.deleteMany({
        VoucherNumber: {
            $in: [
                dslVoucherNumber(invoiceCode),
                `DSL${invoiceCode}`,
                `Dsl${invoiceCode}`,
            ],
        },
    });
};

export const createDistrbutorInvoice = async (req, res) => {
    const monthCheck = await checkMonthClose(req, res, "InvoiceDate");
    if (monthCheck) return;

    try {
        const data = req.body
        const [lastInvoice, DC, Admin] = await Promise.all([
            DistrbutorInvoiceModal.findOne().sort({ DitributorInvoiceCode: -1 }).select("DitributorInvoiceCode").lean(),
            OrderDcModal.findOne({ DCCode: data.DcNumber }).lean(),
            AdministrativeModal.findOne().lean(),
        ]);

        let nextCode
        if (!lastInvoice) {
            const nextNumber = parseInt("000000", 10) + 1;
            nextCode = nextNumber.toString().padStart(6, '0')
        }
        else {
            const nextNumber = parseInt(lastInvoice.DitributorInvoiceCode, 10) + 1;
            console.log(nextNumber)
            nextCode = nextNumber.toString().padStart(6, '0')
        }

        

        const Voucher = buildDslVoucher({
            invoiceCode: nextCode,
            invoiceDate: data.InvoiceDate,
            store: data.Store,
            distributor: data.Distrbutor,
            invoiceData: data.InvoiceData,
            advance: data.Advance,
            dc: DC,
            admin: Admin,
        });

        const allData = {
            ...req.body,
            Transporter: DC.Transporter,
            DitributorInvoiceCode: nextCode,
            TotalAmount : Voucher.VoucharData[0].Debit,
            Remaining: Voucher.VoucharData[0].Debit,
            AddAmount: DC.Biltytype == "BTP" ? DC.BiltyAmount : 0,
            LessAmount: DC.BiltyAmount,
            PostStatus: "true",
            LessAdvanceDis: data.Advance,
            PerDiscount: data.AdvancePay
        }
        console.log(Voucher.VoucharData)
        const TotalDebit = Voucher.VoucharData.reduce((sum, row) => sum + (Number(row.Debit) || 0), 0)
        const TotalCredit = Voucher.VoucharData.reduce((sum, row) => sum + (Number(row.Credit) || 0), 0)
        await VoucherModal.create(Voucher)
        await OrderDcModal.findOneAndUpdate({ DCCode: data.DcNumber }, { PostStatus: "Invoiced" })
        await DistrbutorInvoiceModal.create(allData)
        res.status(200).send("Data Add")
    }
    catch (err) {
        console.log(err)
        res.status(400).send(err)
    }
}


export const DistrbutorInvoiceStatusUpdate = async (req, res) => {
    try {
        const { id } = req.params
        console.log(id)
        const data = await DistrbutorInvoiceModal.findByIdAndUpdate(id, { PostStatus: "Send" })
        res.status(200).send(data)
    } catch (err) {
        console.log(err)
        res.status(400).send(err)
    }
}



export const RepostInvoice = async (req, res) => {
    try {
        const Admin = await AdministrativeModal.findOne()
        for (const item of voucher) {

            const data = await DistrbutorInvoiceModal.findOne({ DitributorInvoiceCode: item.VoucherNumber })
            const daleteVoucher = await VoucherModal.findOneAndDelete({ VoucherNumber: `DSl${item.VoucherNumber}` })
            const DC = await OrderDcModal.findOne({ DCCode: data.DcNumber })
            console.log(data, daleteVoucher, DC)
            const Voucher = {
                VoucherType: "DSL",
                VoucherNumber: `DSl${item.VoucherNumber}`,
                VoucherDate: data.InvoiceDate,
                status: "Post",
                VoucharData: [
                    {
                        Account: Admin.Client,
                        Debit: Number(data.InvoiceData.reduce((sum, row) => sum + (Number(row.netAmount) || 0), 0))
                            - Number(data.LessAdvanceDis || 0)
                            + (DC.Biltytype == "BTP" ? Number(DC.BiltyAmount || 0) : 0)
                            - Number(DC.BiltyAmount || 0),
                        Store: data.Store,
                        Client: data.Distrbutor,
                    },
                    {
                        Account: Admin.TradeOffer,
                        Debit: data.InvoiceData.reduce((sum, row) => sum + (parseFloat(row.discount) || 0), 0),
                        Store: data.Store,

                    },
                    {
                        Account: Admin.SpecialDiscount,
                        Debit: data.InvoiceData.reduce((sum, row) => sum + (parseFloat(row.specialdiscount) || 0), 0),
                        Store: data.Store,
                    },
                    {
                        Account: Admin.salesRevenue,
                        Credit: data.InvoiceData.reduce((sum, row) => sum + (parseFloat(row.Amount) || 0), 0),
                        Store: data.Store,

                    },

                    {
                        Account: Admin.TransporterPayable,
                        Credit: DC.Biltytype == "BTP" ? DC.BiltyAmount : 0,
                        Store: data.Store,
                        Transporter: DC.Transporter

                    },

                    {
                        Account: Admin.TransportExp,
                        Debit: DC.BiltyAmount,
                        Store: data.Store,

                    },
                    {
                        Account: Admin.AdvanceDisCount,
                        Debit: data.LessAdvanceDis,
                        Store: data.Store,

                    },

                ].filter(
                    item => (item.Debit ?? 0) !== 0 || (item.Credit ?? 0) !== 0
                )

            }
            console.log(Voucher.VoucharData)
            const TotalDebit = Voucher.VoucharData.reduce((sum, row) => sum + (Number(row.Debit) || 0), 0)
            const TotalCredit = Voucher.VoucharData.reduce((sum, row) => sum + (Number(row.Credit) || 0), 0)
            await VoucherModal.create(Voucher)
        }
        res.status(200).send("Data Add")

    }
    catch (err) {
        console.log(err)
        res.status(400).send(err)
    }
}

/**
 * Recreate DSL voucher(s) from saved invoice amounts.
 * Does not change invoice rates, qty, remaining, DC, or stock.
 */
export const RepostInvoiceVoucher = async (req, res) => {
    try {
        const { fromInvoice, toInvoice, invoiceCodes } = req.body || {};
        let invoices = [];

        if (Array.isArray(invoiceCodes) && invoiceCodes.length > 0) {
            invoices = await DistrbutorInvoiceModal.find({
                DitributorInvoiceCode: { $in: invoiceCodes },
            }).sort({ DitributorInvoiceCode: 1 });
        } else if (fromInvoice && toInvoice) {
            invoices = await DistrbutorInvoiceModal.find({
                DitributorInvoiceCode: { $gte: fromInvoice, $lte: toInvoice },
            }).sort({ DitributorInvoiceCode: 1 });
        } else {
            return res.status(400).json({
                success: false,
                message: "Select invoice from and to, or provide invoice numbers",
            });
        }

        if (!invoices.length) {
            return res.status(400).json({
                success: false,
                message: "No distributor invoices found in this range",
            });
        }

        const Admin = await AdministrativeModal.findOne();
        if (!Admin) {
            return res.status(400).json({
                success: false,
                message: "Administrative settings not found",
            });
        }

        const results = [];
        for (const invoice of invoices) {
            try {
                const DC = await OrderDcModal.findOne({ DCCode: invoice.DcNumber });
                if (!DC) {
                    results.push({
                        invoice: invoice.DitributorInvoiceCode,
                        date: invoice.InvoiceDate || "",
                        dcNumber: invoice.DcNumber || "",
                        voucherNumber: "",
                        success: false,
                        error: `DC ${invoice.DcNumber || ""} not found`,
                    });
                    continue;
                }

                await deleteDslVoucher(invoice.DitributorInvoiceCode);

                const voucher = buildDslVoucher({
                    invoiceCode: invoice.DitributorInvoiceCode,
                    invoiceDate: invoice.InvoiceDate,
                    store: invoice.Store,
                    distributor: invoice.Distrbutor,
                    invoiceData: invoice.InvoiceData,
                    advance: invoice.LessAdvanceDis ?? invoice.Advance,
                    dc: DC,
                    admin: Admin,
                });

                await VoucherModal.create(voucher);
                results.push({
                    invoice: invoice.DitributorInvoiceCode,
                    date: invoice.InvoiceDate || "",
                    dcNumber: invoice.DcNumber || "",
                    voucherNumber: voucher.VoucherNumber,
                    success: true,
                    error: "",
                });
            } catch (err) {
                results.push({
                    invoice: invoice.DitributorInvoiceCode,
                    date: invoice.InvoiceDate || "",
                    dcNumber: invoice.DcNumber || "",
                    voucherNumber: "",
                    success: false,
                    error: err.message,
                });
            }
        }

        const successCount = results.filter((r) => r.success).length;
        const errorCount = results.length - successCount;

        return res.status(200).json({
            success: errorCount === 0,
            message: errorCount === 0
                ? `Voucher reposted for ${successCount} invoice(s). Invoice rates were not changed.`
                : `Voucher reposted for ${successCount} invoice(s), ${errorCount} failed. Invoice rates were not changed.`,
            data: {
                total: results.length,
                successCount,
                errorCount,
                results,
            },
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            success: false,
            message: err.message || "Voucher repost failed",
        });
    }
};


export const getDisInvoiceNumberWithouStatus = async (req, res) => {
    try {
        // Only fetch the SalesInvoiceNumber field (and exclude _id)
        const invoices = await DistrbutorInvoiceModal.find(
            {},
            { DitributorInvoiceCode: 1, InvoiceDate: 1, _id: 0 }
        );

        res.status(200).json(invoices);
    } catch (err) {
        console.error("Error fetching invoice numbers:", err);
        res.status(400).send("Something went wrong");
    }
};


export const getAllDistrbutorInvoice = async (req, res) => {
    try {
        const data = await DistrbutorInvoiceModal.aggregate([
            { $sort: { DitributorInvoiceCode: -1 } },
            {
                $project: {
                    DitributorInvoiceCode: 1,
                    Distrbutor: 1,
                    InvoiceDate: 1,
                    PostStatus: 1,
                    Store: 1,
                    DcNumber: 1,
                    Remaining: 1,
                    RecivedAmount: 1,
                    TotalAmount: 1,
                    AddAmount: 1,
                    LessAmount: 1,
                    LessAdvanceDis: 1,
                    PerDiscount: 1,
                    lineCount: { $size: { $ifNull: ["$InvoiceData", []] } },
                },
            },
        ]);
        res.status(200).send(data)
    }
    catch (err) {
        res.status(400).send(err)
    }
}

export const getDistrbutorInvoiceById = async (req, res) => {
    try {
        const data = await DistrbutorInvoiceModal.findById(req.params.id).lean();
        if (!data) return res.status(404).send("Invoice not found");
        res.status(200).send(data);
    }
    catch (err) {
        res.status(400).send(err)
    }
}
export const getInvoiceDc = async (req, res) => {
    try {
        const data = await DistrbutorInvoiceModal.find().select({ DitributorInvoiceCode: 1, DcNumber: 1 })
        res.status(200).send(data)
    }
    catch (err) {
        res.status(400).send(err)
    }
}



export const DistrbutorInvoiceUpdate = async (req, res) => {
    const monthCheck = await checkMonthClose(req, res, "InvoiceDate");
    if (monthCheck) return;

    try {
        const { id } = req.params
        console.log(id)
        const data = await DistrbutorInvoiceModal.findByIdAndUpdate(id, req.body)

        res.status(200).send("Data Add")
    }
    catch (err) {
        console.log(err)
        res.status(400).send(err)
    }
}

export const PostDistrbutorInvoice = async (req, res) => {
    try {
        const { id } = req.params
        const { AccountsData, Distribuor, DCCode } = req.body
        const findDc = await OrderDcModal.findOne({ DCCode: DCCode })
        if (findDc.Invoice == null) {
            console.log("milgia")
            const data = await DistrbutorInvoiceModal.findByIdAndUpdate(id, { PostStatus: "Post", Remaining: Distribuor, TotalAmount: Distribuor })
            console.log(data)
            const Invoice = await OrderDcModal.findOneAndUpdate({ DCCode: data.DcNumber }, { Invoice: data.DitributorInvoiceCode })
            const voucher = await VoucherModal.create(AccountsData)
            res.status(200).send(data)
        }
        else {
            res.status(401).send(`DC ${DCCode} Allready use in invoice ${findDc.Invoice}`)

        }

    } catch (err) {
        console.log(err)
        res.status(400).send(err)
    }
}

export const getRemainOnly = async (req, res) => {
    try {
        // MongoDB aggregate query
        const data = await DistrbutorInvoiceModal.find({
            Remaining: { $ne: 0, $exists: true },
            
        })
            .select("Remaining Distrbutor DitributorInvoiceCode Store");


        // Fetch Opening invoices
        const OpeningInvoices = await InvoiceOpeningModal.find();

        const Opening = (OpeningInvoices[0]?.InvoiceData || []).filter((item) => {
            return Number(item.RemaingAmount) !== 0;
        });

        // console.log(Opening.length, "Filtered Opening2");
        const totaldata = Opening.concat(data)
        console.log(totaldata.length)
        res.status(200).send({ data: totaldata });
    } catch (err) {
        console.error(err);
        res.status(400).send(err);
    }

}


export const getRemainInvoiceByClient = async (req, res) => {
    try {
        const { Distrbutor } = req.params
        // MongoDB aggregate query
        const data = await DistrbutorInvoiceModal.find({
            Remaining: { $ne: 0, $exists: true },
            Distrbutor: Distrbutor,
            
        })
            .select("Remaining Distrbutor DitributorInvoiceCode");

        // Fetch Opening invoices
        const OpeningInvoices = await InvoiceOpeningModal.find();
        console.log(OpeningInvoices[0].InvoiceData[0])
        const Opening = OpeningInvoices[0].InvoiceData.filter((item) => {
            return Number(item.RemaingAmount) !== 0 && item.Client == Distrbutor
        });

        // console.log(Opening.length, "Filtered Opening2");
        const totaldata = Opening.concat(data)
        console.log(totaldata.length)
        res.status(200).send({ data: totaldata });
    } catch (err) {
        console.error(err);
        res.status(400).send(err);
    }

}

export const ClientWiseInvoice = async (req, res) => {
    try {
        const { OrderBooker, startDate, endDate, clinet ,  wise} = req.query
        console.log(OrderBooker, startDate, endDate ,wise , clinet)
        if(wise !== "Client"){
            console.log(OrderBooker, "OrderBooker")

            const Client = await DistrbutorModal
            .find({ OrderBooker })
            .select({ _id: 1 })
            .lean();
            const ClientArray = Client.map((item) => item._id.toString())
            const data = await DistrbutorInvoiceModal.aggregate([
                {
                    $match: {
                        InvoiceDate: {
                            $gte: startDate,
                            $lte: endDate,
                        },
                        Distrbutor: { $in: ClientArray }
                    },
                },
            ])
            res.status(200).send(await withOrderRemarks(data))
        }
        else{
            const data = await DistrbutorInvoiceModal.aggregate([
                {
                    $match: {
                        InvoiceDate: {
                            $gte: startDate,
                            $lte: endDate,
                        },
                        Distrbutor: clinet
                    },
                },
            ])
            res.status(200).send(await withOrderRemarks(data))
        }
            
    } catch (error) {
        console.log(error)
        res.status(400).send(error)
    }
}