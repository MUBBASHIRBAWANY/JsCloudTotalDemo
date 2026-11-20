import axios from "axios";
import PriceListModal from "../modal/PriceListModal.js";
import SlabModal from "../modal/SlabModal.js";

const SND_API_BASE = "https://api.pdl1.online/";

const sndApi = axios.create({
  baseURL: SND_API_BASE,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "anyvalue",
  },
});

/* ──────────────────────────────────────────────
 *  PUSH PRICE LIST TO SND
 * ────────────────────────────────────────────── */
export const PushPriceListToSND = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the PriceList from local DB
    const priceList = await PriceListModal.findById(id).lean();
    if (!priceList) {
      return res.status(404).json({ success: false, message: "PriceList not found" });
    }

    // Push to SND API
    const sndResponse = await sndApi.post("/PriceList", {
      PriceListDate: priceList.PriceListDate,
      PriceListName: priceList.PriceListName,
      PriceListNumber: priceList.PriceListNumber,
      PriceListStatus: priceList.PriceListStatus,
      PriceListData: priceList.PriceListData,
    });

    res.status(200).json({
      success: true,
      message: "PriceList pushed to SND successfully",
      sndResponse: sndResponse.data,
    });
  } catch (err) {
    console.error("PushPriceListToSND error:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      message: err.response?.data?.message || err.message,
    });
  }
};

/* ──────────────────────────────────────────────
 *  PUSH ALL PRICE LISTS TO SND
 * ────────────────────────────────────────────── */
export const PushAllPriceListsToSND = async (req, res) => {
  try {
    const priceLists = await PriceListModal.find().lean();
    if (priceLists.length === 0) {
      return res.status(404).json({ success: false, message: "No PriceLists found" });
    }

    const results = [];
    for (const pl of priceLists) {
      try {
        const sndResponse = await sndApi.post("/PriceList", {
          PriceListDate: pl.PriceListDate,
          PriceListName: pl.PriceListName,
          PriceListNumber: pl.PriceListNumber,
          PriceListStatus: pl.PriceListStatus,
          PriceListData: pl.PriceListData,
        });
        results.push({ id: pl._id, name: pl.PriceListName, status: "pushed", sndResponse: sndResponse.data });
      } catch (pushErr) {
        results.push({ id: pl._id, name: pl.PriceListName, status: "failed", error: pushErr.response?.data?.message || pushErr.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `Pushed ${results.filter(r => r.status === "pushed").length} of ${priceLists.length} PriceLists to SND`,
      results,
    });
  } catch (err) {
    console.error("PushAllPriceListsToSND error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ──────────────────────────────────────────────
 *  PUSH SLAB TO SND
 * ────────────────────────────────────────────── */
export const PushSlabToSND = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the Slab from local DB with populated priceList
    const slab = await SlabModal.findById(id).populate("priceList", "PriceListName PriceListNumber").lean();
    if (!slab) {
      return res.status(404).json({ success: false, message: "Slab not found" });
    }

    // Push to SND API
    const sndResponse = await sndApi.post("/Slab", {
      priceList: slab.priceList?._id || slab.priceList,
      priceListName: slab.priceList?.PriceListName || "",
      priceListNumber: slab.priceList?.PriceListNumber || "",
      fromAmount: slab.fromAmount,
      toAmount: slab.toAmount,
      maxPercentage: slab.maxPercentage,
      slabRows: slab.slabRows,
    });

    res.status(200).json({
      success: true,
      message: "Slab pushed to SND successfully",
      sndResponse: sndResponse.data,
    });
  } catch (err) {
    console.error("PushSlabToSND error:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      message: err.response?.data?.message || err.message,
    });
  }
};

/* ──────────────────────────────────────────────
 *  PUSH ALL SLABS TO SND
 * ────────────────────────────────────────────── */
export const PushAllSlabsToSND = async (req, res) => {
  try {
    const slabs = await SlabModal.find().populate("priceList", "PriceListName PriceListNumber").lean();
    if (slabs.length === 0) {
      return res.status(404).json({ success: false, message: "No Slabs found" });
    }

    const results = [];
    for (const slab of slabs) {
      try {
        const sndResponse = await sndApi.post("/Slab", {
          priceList: slab.priceList?._id || slab.priceList,
          priceListName: slab.priceList?.PriceListName || "",
          priceListNumber: slab.priceList?.PriceListNumber || "",
          fromAmount: slab.fromAmount,
          toAmount: slab.toAmount,
          maxPercentage: slab.maxPercentage,
          slabRows: slab.slabRows,
        });
        results.push({ id: slab._id, name: slab.priceList?.PriceListName || slab._id, status: "pushed", sndResponse: sndResponse.data });
      } catch (pushErr) {
        results.push({ id: slab._id, name: slab.priceList?.PriceListName || slab._id, status: "failed", error: pushErr.response?.data?.message || pushErr.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `Pushed ${results.filter(r => r.status === "pushed").length} of ${slabs.length} Slabs to SND`,
      results,
    });
  } catch (err) {
    console.error("PushAllSlabsToSND error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};
