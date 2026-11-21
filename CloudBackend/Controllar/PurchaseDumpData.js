import PurchaseInvoiceModal from "../Modal/PurchaseInvoiceModal.js";
import RcModal from "../Modal/RcModal.js";


export const allPurchaseDumpData = async (req, res) => {

    const { startDate, endDate } = req.query;
    try {
        const allPurchaseData = await PurchaseInvoiceModal.aggregate([
            {
                $match: {
                    PurchaseInvoiceDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                },
            },

            { $unwind: "$PurchaseData" },
            {
                $group: {
                    _id: {
                        product: "$PurchaseData.product",
                        PostStatus: "$PostStatus",
                        invoice: "$PurchaseInvoice",
                        PurchaseInvoiceDate: "$PurchaseInvoiceDate",
                        Store: "$Store",
                        Location: "$Location",
                        SalesflowRef: "$SalesFlowRef",
                        AdvanceTax: "$AdvanceTax",
                        Vendor: "$Vendor",
                        TotalAmount: "$TotalAmount",
                        invoiceGST: "$GST",
                        RCNumber: "$RCNumber",
                    },
                    Box: {
                        $sum: {
                            $convert: {
                                input: {
                                    $trim: {
                                        input: { $toString: { $ifNull: ["$PurchaseData.totalBox", 0] } },
                                    },
                                },
                                to: "double",
                                onError: 0,
                                onNull: 0,
                            },
                        },
                    },
                    Gst: {
                        $sum: {
                            $convert: {
                                input: {
                                    $trim: {
                                        input: { $toString: { $ifNull: ["$PurchaseData.Gst", 0] } },
                                    },
                                },
                                to: "double",
                                onError: 0,
                                onNull: 0,
                            },
                        },
                    },
                    Discount: {
                        $sum: {
                            $convert: {
                                input: {
                                    $trim: {
                                        input: { $toString: { $ifNull: ["$PurchaseData.discount", 0] } },
                                    },
                                },
                                to: "double",
                                onError: 0,
                                onNull: 0,
                            },
                        },
                    },
                    GrossAmount: {
                        $sum: {
                            $convert: {
                                input: {
                                    $trim: {
                                        input: { $toString: { $ifNull: ["$PurchaseData.GrossAmount", 0] } },
                                    },
                                },
                                to: "double",
                                onError: 0,
                                onNull: 0,
                            },
                        },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    product: "$_id.product",
                    PostStatus: "$_id.PostStatus",
                    date: "$_id.PurchaseInvoiceDate",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                    invoice: "$_id.invoice",
                    Box: 1,
                    Gst: 1,
                    GrossAmount: 1,
                    SalesflowRef: "$_id.SalesflowRef",
                    Advancetax: "$_id.AdvanceTax",
                    discount: "$Discount",
                    Vendor: "$_id.Vendor",
                    invoiceGST: "$_id.invoiceGST",
                    TotalAmount: "$_id.TotalAmount",
                    RC: "$_id.RCNumber",
                    RCNumber: "$_id.RCNumber",
                },
            },

        ])

        res.status(200).send(allPurchaseData)
    } catch (err) {
        res.status(400).send(err)
    }
}

export const allPurchaseSummry = async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    const allPurchaseData1 = await PurchaseInvoiceModal.aggregate([
      {
        $match: {
          PurchaseInvoiceDate: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },

      {
        $unwind: {
          path: "$PurchaseData",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $group: {
          _id: {
            PostStatus: "$PostStatus",
            invoice: "$PurchaseInvoice",
            PurchaseInvoiceDate: "$PurchaseInvoiceDate",
            Store: "$Store",
            Location: "$Location",
            SalesflowRef: "$SalesFlowRef",
            Vendor: "$Vendor",
          },

          GrossAmount: {
            $sum: {
              $convert: {
                input: {
                  $trim: {
                    input: {
                      $toString: { $ifNull: ["$PurchaseData.GrossAmount", 0] },
                    },
                  },
                },
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
          },

          Box: {
            $sum: {
              $convert: {
                input: {
                  $trim: {
                    input: {
                      $toString: { $ifNull: ["$PurchaseData.totalBox", 0] },
                    },
                  },
                },
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
          },

          itemGST: {
            $sum: {
              $convert: {
                input: {
                  $trim: {
                    input: {
                      $toString: { $ifNull: ["$PurchaseData.Gst", 0] },
                    },
                  },
                },
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
          },

          

          AdvanceTax: {
            $max: {
              $convert: {
                input: {
                  $trim: {
                    input: {
                      $toString: { $ifNull: ["$AdvanceTax", 0] },
                    },
                  },
                },
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
          },

          Discount: {
            $max: {
              $convert: {
                input: {
                  $trim: {
                    input: {
                      $toString: { $ifNull: ["$Discount", 0] },
                    },
                  },
                },
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
          },
          InvoiceGST: {
            $max: {
              $convert: {
                input: {
                  $trim: {
                    input: {
                      $toString: { $ifNull: ["$GST", 0] },
                    },
                  },
                },
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
          },

             ProductDiscount: {
  $sum: {
              $convert: {
                input: {
                  $trim: {
                    input: {
                      $toString: { $ifNull: ["$PurchaseData.discount", 0] },
                    },
                  },
                },
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
                    },

          TotalAmount: {
            $max: {
              $convert: {
                input: {
                  $trim: {
                    input: {
                      $toString: { $ifNull: ["$TotalAmount", 0] },
                    },
                  },
                },
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
          },
        },
      },

      {
        $addFields: {
          GST: {
            $add: ["$itemGST"],
          },
        },
      },

      {
        $project: {
          _id: 0,
          PostStatus: "$_id.PostStatus",
          date: "$_id.PurchaseInvoiceDate",
          Store: "$_id.Store",
          Location: "$_id.Location",
          invoice: "$_id.invoice",
          SalesflowRef: "$_id.SalesflowRef",
          Vendor: "$_id.Vendor",
          GrossAmount: 1,
          Box: 1,
          GST: 1,
          InvoiceGST : 1,
          AdvanceTax: 1,
          Discount: 1,
          ProductDiscount : 1,
          TotalAmount: 1,
        },
      },
    ]);
const allPurchaseData  = allPurchaseData1.map((item)=> ({
  ...item,
  Discount : Number(item.Discount || 0 ) + Number(item.ProductDiscount || 0),
    GST : Number(item.InvoiceGST || 0 ) + Number(item.GST || 0),
}))
    res.status(200).send(allPurchaseData);
  } catch (err) {
    console.log(err);
    res.status(400).send(err);
  }
};

export const allRCDumpData = async (req, res) => {

    const { startDate, endDate } = req.query;
    try {
        const allRCData = await RcModal.aggregate([
            {
                $match: {
                    RcDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                    PostStatus : {$ne : "false"},
                },
            },

            { $unwind: "$RcData" },
            {
                $group: {
                    _id: {
                        product: "$RcData.product",
                        PostStatus: "$PostStatus",
                        invoice: "$RcCode",
                        Vendor: "$Vendor",
                        RCDate: "$RcDate",
                        Store: "$Store",
                        SalesFlowRef : "$SalesFlowRef",
                        Location: "$Location",
                    },
                    Box: {
                        $sum: {
                            $convert: {
                                input: {
                                    $trim: {
                                        input: {
                                            $toString: { $ifNull: ["$RcData.totalBox", 0] },
                                        },
                                    },
                                },
                                to: "double",
                                onError: 0,
                                onNull: 0,
                            },
                        },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    product: "$_id.product",
                    PostStatus: "$_id.PostStatus",
                    date: "$_id.RCDate",
                    Store: "$_id.Store",
                    Vendor: "$_id.Vendor",
                    Location: "$_id.Location",
                    invoice: "$_id.invoice",
                    SalesFlowRef: "$_id.SalesFlowRef",
                    Box: 1,
                },
            },

        ])

        res.status(200).send(allRCData)
    } catch (err) {
        res.status(400).send(err)
    }
}