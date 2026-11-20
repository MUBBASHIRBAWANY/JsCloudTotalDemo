import PurchaseOrderModal from "../modal/PurchaseOrderModal.js"


export const createPurchaseOrder = async (req, res) => {
    try {
        const prefix = req.body.DistrbutorName; // e.g. "Pearl SD" or "Abbasi Marketing"

        // 🔍 Find last order of SAME customer only
        const lastOrder = await PurchaseOrderModal.findOne({
            OrderCode: { $regex: `^${prefix}` }
        }).sort({ _id: -1 });

        let nextCode;

        if (!lastOrder) {
            // 👉 First order for this customer
            nextCode = "000001";
        } else {
            const lastCode = lastOrder.OrderCode;

            // Extract numeric part
            const numberPart = lastCode.match(/\d+$/)?.[0];
            const nextNumber = parseInt(numberPart, 10) + 1;

            nextCode = nextNumber.toString().padStart(6, "0");
        }

        const allData = {
            ...req.body,
            FromSNd : "true",
            OrderCode: `${prefix}${nextCode}`,
            PostStatus: "Received"
        };

        const data = await PurchaseOrderModal.create(allData);

        res.status(200).send(data);

    } catch (err) {
        res.status(400).send(err);
    }
};


export const getAllPurchaseOrder = async (req, res) => {
    try {


        const data = await PurchaseOrderModal.find()
        res.status(200).send(data)

    } catch (err) {
        res.status(400).send(err)
    }
}

export const getPurchaseOrderByDistributor = async (req, res) => {
    try {
        const { Distrbutor } = req.params
        console.log(Distrbutor)
        const data = await PurchaseOrderModal.find({ Distrbutor: Distrbutor });
console.log(data)
        res.status(200).send(data)

    } catch (err) {
        res.status(400).send(err)
    }
}
export const UpdateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params
        const { status, RejectReson } = req.body

        if (status == "Reject") {
            console.log(status, RejectReson)
            const data = await PurchaseOrderModal.findByIdAndUpdate(
                id,
                { PostStatus: status, RejectReson: RejectReson },
                { new: true }
            );

            res.status(200).send(data)

        }
        else {
            const data = await PurchaseOrderModal.findByIdAndUpdate(
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

export const UpdateOrderStatusByNumber = async (req, res) => {
    try {
        const { OrderCode } = req.params
        const { status, RejectReson } = req.body
console.log(status)
        if (status == "Reject") {
            console.log(status, RejectReson)
            const data = await PurchaseOrderModal.findOne(
                {OrderCode : OrderCode},
                { PostStatus: status, RejectReson: RejectReson },
                { new: true }
            );

            res.status(200).send(data)

        }
        else {
            const data = await PurchaseOrderModal.findOneAndUpdate({OrderCode : OrderCode},{ PostStatus: status });


            res.status(200).send(data)
        }


    } catch (err) {
        console.log(err)
        res.status(400).send(err)
    }
}

export const getOrders = async (req,res) =>{
 try{
    const { Distributor } = req.query
     const  DistributorArr = Distributor.split(",")
     
    const RcvdOrders = await PurchaseOrderModal.find({PostStatus : "Received"})
    const AcceptOrders = await PurchaseOrderModal.find({PostStatus : "Accept"})
    const ProcessOrders = await PurchaseOrderModal.find({PostStatus : "Process"})
    const allOrders = RcvdOrders.concat(AcceptOrders).concat(ProcessOrders)
    const data = allOrders.filter((item)=> DistributorArr.includes(item.Distrbutor))
    res.status(200).send(data)
 }  catch(err){
    res.status(400).send(err)
    
 }
}

