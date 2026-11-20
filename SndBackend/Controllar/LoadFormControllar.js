import LoadFormModal from "../modal/LoadFormModal.js"
import SalesInvoiceModal from "../modal/SalesInvoiceModal.js";

export const loadFormControllar = async (req, res) => {
    try {
        const { Distributor } = req.params;
        const data = await LoadFormModal.find({ Distrbutor: Distributor }).sort({ _id: -1 });
        console.log(data)
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        res.status(400).send("some thing went wrong")
    }
}

export const loadFormNumber = async (req, res) => {
    try {
        const { Distributor } = req.params;
        const data = await LoadFormModal.find({ Distrbutor: Distributor, Status : "open" }).select('LoadFormNumber').sort({ _id: -1 });
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        res.status(400).send("some thing went wrong")
    }
}

export const AllloadFormNumber = async (req, res) => {
    try {
        const { Distributor } = req.params;
        const data = await LoadFormModal.find({ Distrbutor: Distributor })
  .select('LoadFormNumber Status')
  .sort({ _id: -1 });
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        res.status(400).send("some thing went wrong")
    }
}



export const forwardLoadForm = async (req, res) => {
    try {
        const { LoadFormNumber } = req.params
        const data = await LoadFormModal.find({ LoadFormNumber: LoadFormNumber })
        console.log(data)
    } catch (err) {

    }
}

export const createLoadForm = async (req, res) => {
    try {
        const forwardata = req.body
        const LoadFormData = forwardata.flatMap(o => o.SalesData);
        const mergedOrder = Object.values(
            LoadFormData.reduce((acc, item) => {

                // ❌ skip if product is null OR delivered qty is 0
                if (!item.product || item.DeliverdBox <= 0) {
                    return acc;
                }

                const key = item.product.toString();

                if (!acc[key]) {
                    acc[key] = { ...item };
                } else {
                    Object.keys(item).forEach((field) => {
                        if (typeof item[field] === "number") {
                            acc[key][field] =
                                (acc[key][field] || 0) + item[field];
                        }
                    });
                }
                return acc;
            }, {})
        );

        const lastLoadForm = await LoadFormModal
            .findOne()
            .sort({ _id: -1 });

        const LoadFormNumber =
            lastLoadForm
                ? (parseInt(lastLoadForm.LoadFormNumber, 10) + 1)
                    .toString()
                    .padStart(8, "0")
                : "00000001";

        /* 6️⃣ SAVE LOAD FORM (ONCE) */
        const newLoadForm = await new LoadFormModal({
            LoadFormNumber,
            LoadFormDate: forwardata.Date || new Date().toISOString().split("T")[0],
            Distrbutor: forwardata[0].Distrbutor,
            Status: "open",
            LoadFormData: mergedOrder
        }).save();
        const UpdatePreviweous = await LoadFormModal.findOneAndUpdate({ LoadFormNumber: forwardata[0].LoadFormNumber }, { Status: "Serviced" })
        for (const item of forwardata) {
            await SalesInvoiceModal.findByIdAndUpdate(item._id, { LoadFormNumber: LoadFormNumber })
        }
         res.status(200).send(newLoadForm)

    } catch (err) {
        console.log(err)
    }
}