import { v2 as cloudinary } from "cloudinary";
import PhysicalVsSystemStockModal from "../Modal/PhysicalVsSystemStockModal.js";

const text = (value) => (value == null ? "" : String(value).trim());

const parseJsonField = (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!trimmed) return value;
    if (trimmed[0] !== "[" && trimmed[0] !== "{") return value;
    try {
        return JSON.parse(trimmed);
    } catch {
        return value;
    }
};

const asStoreList = (value) => {
    const parsed = parseJsonField(value);
    if (Array.isArray(parsed)) return parsed.map((v) => text(v)).filter(Boolean);
    if (typeof parsed === "string" && parsed.includes(",")) {
        return parsed.split(",").map((v) => text(v)).filter(Boolean);
    }
    const one = text(parsed);
    return one ? [one] : [];
};

const cloudinaryClient = () => {
    const cloud_name = text(process.env.cloudName || process.env.CLOUDINARY_CLOUD_NAME);
    const api_key = text(process.env.CLOUDINARY_API_KEY);
    const api_secret = text(process.env.CLOUDINARY_API_SECRET);
    if (!cloud_name || !api_key || !api_secret) {
        throw new Error("Cloudinary is not configured");
    }
    cloudinary.config({ cloud_name, api_key, api_secret });
    return cloudinary;
};

const uploadBuffer = (file) =>
    new Promise((resolve, reject) => {
        const upload = cloudinaryClient().uploader.upload_stream(
            { folder: "physical-vs-system-stock", resource_type: "image" },
            (error, result) => {
                if (error || !result?.secure_url) {
                    reject(error || new Error("Cloudinary did not return a url"));
                    return;
                }
                resolve({
                    filename: file.originalname || "",
                    type: file.mimetype || "",
                    uri: result.secure_url,
                });
            }
        );
        upload.end(file.buffer);
    });

const imagesFromFiles = async (files) => {
    const saved = [];
    for (const file of Array.isArray(files) ? files : []) {
        if (!file?.buffer) continue;
        saved.push(await uploadBuffer(file));
    }
    return saved;
};

const imageRecord = (image, index) => {
    if (typeof image === "string" && image.trim()) {
        const uri = image.trim();
        return {
            filename: uri.split("/").pop()?.split("?")[0] || `photo-${index + 1}.jpg`,
            type: "",
            uri,
        };
    }
    if (image && typeof image === "object" && text(image.uri)) {
        return {
            filename: text(image.filename) || `photo-${index + 1}.jpg`,
            type: text(image.type),
            uri: text(image.uri),
        };
    }
    return null;
};

const imagesFromBody = (images) => {
    const parsed = parseJsonField(images);
    const list = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
    return list.map(imageRecord).filter(Boolean);
};

const nextDocumentNumber = async () => {
    const lastDoc = await PhysicalVsSystemStockModal.findOne().sort({ _id: -1 }).lean();
    if (!lastDoc?.DocumentNumber) return "000001";
    const current = parseInt(lastDoc.DocumentNumber, 10) || 0;
    return String(current + 1).padStart(6, "0");
};

export const createPhysicalVsSystemStock = async (req, res) => {
    try {
        const DocumentDate = text(req.body.DocumentDate);
        const Location = text(req.body.Location);
        const Remarks = text(req.body.Remarks);
        const FyStart = text(req.body.FyStart);
        const CreatedBy = text(req.body.CreatedBy);
        const Store = asStoreList(req.body.Store);
        const StockData = parseJsonField(req.body.StockData);

        if (!DocumentDate) {
            return res.status(400).json({ success: false, message: "DocumentDate is required" });
        }
        if (!Location) {
            return res.status(400).json({ success: false, message: "Location is required" });
        }
        if (!Store.length) {
            return res.status(400).json({ success: false, message: "Store is required" });
        }
        if (!Array.isArray(StockData) || !StockData.length) {
            return res.status(400).json({ success: false, message: "StockData is required" });
        }

        const uploaded = await imagesFromFiles(req.files);
        const fromBody = imagesFromBody(req.body.Images);
        const Images = [...fromBody, ...uploaded];

        const DocumentNumber = await nextDocumentNumber();
        const data = await PhysicalVsSystemStockModal.create({
            DocumentNumber,
            DocumentDate,
            FyStart,
            Location,
            Store,
            Remarks,
            StockData,
            Images,
            CreatedBy,
            PostStatus: false,
        });

        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("createPhysicalVsSystemStock", err);
        return res.status(400).json({
            success: false,
            message: err.message || "Something went wrong",
        });
    }
};

export const getAllPhysicalVsSystemStock = async (req, res) => {
    try {
        const data = await PhysicalVsSystemStockModal.find().sort({ DocumentNumber: -1 }).lean();
        return res.status(200).json({ status: true, data });
    } catch (err) {
        console.error("getAllPhysicalVsSystemStock", err);
        return res.status(500).json({ status: false, message: "Something went wrong" });
    }
};

export const getPhysicalVsSystemStockById = async (req, res) => {
    try {
        const data = await PhysicalVsSystemStockModal.findById(req.params.id).lean();
        if (!data) {
            return res.status(404).json({ success: false, message: "Record not found" });
        }
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("getPhysicalVsSystemStockById", err);
        return res.status(500).json({ success: false, message: "Something went wrong" });
    }
};

export const updatePhysicalVsSystemStock = async (req, res) => {
    try {
        const existing = await PhysicalVsSystemStockModal.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Record not found" });
        }
        if (existing.PostStatus === true) {
            return res.status(400).json({ success: false, message: "Posted records cannot be edited" });
        }

        const DocumentDate = text(req.body.DocumentDate) || existing.DocumentDate;
        const Location = text(req.body.Location) || existing.Location;
        const Remarks = req.body.Remarks != null ? text(req.body.Remarks) : existing.Remarks;
        const FyStart = req.body.FyStart != null ? text(req.body.FyStart) : existing.FyStart;
        const Store = req.body.Store != null ? asStoreList(req.body.Store) : existing.Store;
        const StockData =
            req.body.StockData != null ? parseJsonField(req.body.StockData) : existing.StockData;

        if (!Array.isArray(StockData) || !StockData.length) {
            return res.status(400).json({ success: false, message: "StockData is required" });
        }

        const uploaded = await imagesFromFiles(req.files);
        const keepImages = imagesFromBody(req.body.KeepImages);
        const Images = keepImages.length || uploaded.length
            ? [...keepImages, ...uploaded]
            : existing.Images || [];

        existing.DocumentDate = DocumentDate;
        existing.Location = Location;
        existing.Remarks = Remarks;
        existing.FyStart = FyStart;
        existing.Store = Store;
        existing.StockData = StockData;
        existing.Images = Images;
        await existing.save();

        return res.status(200).json({ success: true, message: "Updated successfully", data: existing });
    } catch (err) {
        console.error("updatePhysicalVsSystemStock", err);
        return res.status(400).json({
            success: false,
            message: err.message || "Something went wrong",
        });
    }
};

export const deletePhysicalVsSystemStock = async (req, res) => {
    try {
        const existing = await PhysicalVsSystemStockModal.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Record not found" });
        }
        if (existing.PostStatus === true) {
            return res.status(400).json({ success: false, message: "Posted records cannot be deleted" });
        }
        await PhysicalVsSystemStockModal.findByIdAndDelete(req.params.id);
        return res.status(200).json({ success: true, message: "Deleted successfully" });
    } catch (err) {
        console.error("deletePhysicalVsSystemStock", err);
        return res.status(400).json({ success: false, message: "Something went wrong" });
    }
};
