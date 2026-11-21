import TotalProductModal from "../Modal/TotalProductModal.js"


export const getAllProductQty = async (req, res) => {
    try {
        const data = await TotalProductModal.find()
        res.status(200).send({ status: true, data: data });

    } catch (err) {
        console.log(err)
    }
}

export const AllProductByStore = async (req, res) => {
    try {
        const { Store } = req.params;
        const StoreArray = Store ? Store.split(",") : [];

        // Build filter condition
        const filter = StoreArray.length > 0 ? { Store: { $in: StoreArray } } : {};

        // Fetch data from MongoDB
        const data = await TotalProductModal.find(filter);
        const ids = data.map(d => d._id);
        const AllData = await TotalProductModal.find({ _id: { $in: ids } , Store: { $in: StoreArray } });
        res.status(200).send({ status: true, data });
    } catch (err) {
        console.error(err);
        res.status(500).send({ status: false, message: "Server error", error: err.message });
    }
};

export const getOneProduct = async (req, res) => {
    const { id } = req.body
    try {
        const data = await TotalProductModal.find({ _id: id })
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        console.log(err)
    }
}

export const updateProductRate = async (req, res) => {
  const { product, qty, amount, Rate, store } = req.body;

  try {
    const updated = await TotalProductModal.findOneAndUpdate(
      {
        ProductName: product,
        Store: store,
      },
      {
        $set: {
          Amount: amount,
          AvgRate: Rate,
          TotalQuantity: qty,
        },
      },
      { new: true } // return updated document
    );

    if (!updated) {
      return res.status(404).send({
        status: false,
        message: "Product not found for update",
      });
    }

    res.status(200).send({
      status: true,
      message: "Updated Successfully",
      data: updated,
    });
  } catch (err) {
    res.status(500).send({
      status: false,
      message: "Server Error",
      error: err.message,
    });
  }
};
