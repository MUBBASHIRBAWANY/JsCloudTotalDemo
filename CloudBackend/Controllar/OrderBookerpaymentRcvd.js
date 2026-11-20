import OrderBookerpaymentRcvdModal from "../modal/OrderBookerpaymentRcvd.js"

export const OrderBookerpaymentRcvd = async (req, res) => {
  try {
    const allData = req.body;

    // Get last record
    const lastRecord = await OrderBookerpaymentRcvdModal
      .findOne()
      .sort({ _id: -1 });

    let nextNumber = 1;

    if (lastRecord && lastRecord.PaymentNumber) {
      nextNumber = parseInt(lastRecord.PaymentNumber, 10) + 1;
    }

    // format: 000001
    const PaymentNumber = String(nextNumber).padStart(6, "0");

    const data = await OrderBookerpaymentRcvdModal.create({
      ...allData,
      Status : "False",
      PaymentNumber,
    });

    return res.status(201).json({
      success: true,
      message: "Payment received created",
      data,
    });

  } catch (err) {
    console.error("OrderBookerpaymentRcvd error:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};


export const getOrderBookerpaymentRcvd = async (req, res) => {
  try {

    const data = await OrderBookerpaymentRcvdModal.find({
      Status : "False",
    });

    return res.status(201).json({
      success: true,
      data,
    });

  } catch (err) {
    console.error("OrderBookerpaymentRcvd error:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};