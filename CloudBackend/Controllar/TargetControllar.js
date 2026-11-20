import TargetModal from "../modal/TargetModal.js";
import DistributorSaleOrderModal from "../modal/DistributorSaleOrderModal.js";
import OrderDcModal from "../modal/SaleOrderDcModal.js";
export const createTarget = async (req, res) => {
    try {
        const { Month, OrderBooker } = req.body
        console.log(Month, OrderBooker)
        
        const TargetCode = await TargetModal.find({}).sort({ _id: -1 }).limit(1)
        let nextCode
        
        if (TargetCode.length == 0) {
            const nextNumber = parseInt("00", 10) + 1;
            nextCode = nextNumber.toString().padStart(5, '0')
        }
        else {
            const nextNumber = parseInt(TargetCode[0].Code, 10) + 1;
            nextCode = nextNumber.toString().padStart(5, '0')
            console.log(nextCode)  // ✅ Moved after assignment
        }

        const findData = await TargetModal.find({ OrderBooker: OrderBooker, Month: Month })
        console.log(findData, "findData")
        
        if (findData.length > 0) {
            res.status(400).send('This Booker Target Already Upload');
            return
        }
        
        const data = await TargetModal.create({
            ...req.body,
            Code: nextCode
        });
        
        console.log(data)
        res.status(200).send("Account Opening data added successfully");
        
    } catch (e) {
        console.log(e);
        res.status(400).send(e);
    }
}

export const getAllTarget = async (req, res) => {
    try {
        const Target = await TargetModal.find();
        res.status(200).send({ status: true, data: Target });
    } catch (err) {
        res.status(400).send("Something went wrong");
    }
}

export const updateTarget = async (req, res) => {
    const { id } = req.params;
    try {
        const data = await TargetModal.findByIdAndUpdate(id, req.body);
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        res.status(400).send("Something went wrong");
    }
}

export const deleteTarget = async (req, res) => {
    const { id } = req.params;
    try {
        await TargetModal.findByIdAndDelete(id);
        res.status(200).send("Account Opening data deleted successfully");
    } catch (err) {
        res.status(400).send("Something went wrong");
    }
}

export const getTagetByMonth = async (req, res) => {
    try {
        const { Month } = req.params
        const firstDate = new Date(`${Month}`);
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");

            return `${year}-${month}-${day}`;
        };
        const startDate = formatDate(firstDate);

        const endDate = formatDate(
            new Date(firstDate.getFullYear(), firstDate.getMonth() + 1, 0)
        );
        
          const DC = await OrderDcModal.aggregate(
                    [
                        {
                            $match: {
                                DCDate: {
                                    $gte: startDate,
                                    $lte: endDate,
                                },
                            },
                        },
                        { $unwind: "$DCData" },
                        {
                            $project: {
                                _id: 0,
                                Client: "$Distrbutor",
                                DCCode: "$DCCode",
                                DCDate: "$DCDate",
                                Product: "$DCData.product",
                                Gst: "$InvoiceData.Gst",
                                carton: "$DCData.DeliveredBox",
                            },
                        },
                    ],
                    { allowDiskUse: true }
                );
                
                const Order = await DistributorSaleOrderModal.aggregate(
                    [
                        {
                            $match: {
                                OrderDate: {
                                    $gte: startDate,
                                    $lte: endDate,
                                },
                            },
                        },
                        { $unwind: "$OrderData" },
                        {
                            $project: {
                                _id: 0,
                                Client: "$Distrbutor",
                                OrderCode: "$OrderCode",
                                OrderDate: "$OrderDate",
                                Product: "$OrderData.product",
                                carton: "$OrderData.totalBox",
                            },
                        },
                    ],
                    { allowDiskUse: true }
                );
        const Target = await TargetModal.find({ Month: Month });

        res.status(200).send({ status: true, data: Target , DCData : DC , Order : Order});
    } catch (err) {
        res.status(400).send("Something went wrong");
    }
}
