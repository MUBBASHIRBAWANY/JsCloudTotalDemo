import fs from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import AttandanceModal from "../modal/AttandanceModal.js"
import DitriButorOrderBookerModal from "../modal/DitriButorOrderBookerModal.js"
import mongoose from "mongoose"

const text = (value) => (value == null ? "" : String(value).trim());

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

const isCloudinaryUrl = (uri) => /^https?:\/\/res\.cloudinary\.com\//i.test(uri);

const saveBuffer = (file, bookerName) => {
    const clean = text(bookerName).replace(/[^\w.\- ]+/g, "_").trim() || "order-booker";
    const dir = path.join(process.cwd(), "uploads", "attendance", clean);
    fs.mkdirSync(dir, { recursive: true });
    const safe = path.basename(file.originalname || "attendance.jpg").replace(/[^\w.\-]+/g, "_");
    const filename = `${Date.now()}-${safe}`;
    fs.writeFileSync(path.join(dir, filename), file.buffer);
    return `uploads/attendance/${clean}/${filename}`;
};

const bookerFolder = (name) => {
    const clean = text(name).replace(/[\\/#?&%<>:"|]+/g, " ").replace(/\s+/g, " ").slice(0, 80);
    return `attendance/${clean || "order-booker"}`;
};

const orderBookerName = async (id, fallback) => {
    if (mongoose.Types.ObjectId.isValid(text(id))) {
        const booker = await DitriButorOrderBookerModal.findById(id).select("OrderBookerName").lean();
        if (booker?.OrderBookerName) return booker.OrderBookerName;
    }
    return text(fallback);
};

const uploadBuffer = (file, bookerName) => new Promise((resolve, reject) => {
    const upload = cloudinaryClient().uploader.upload_stream(
        { folder: bookerFolder(bookerName), resource_type: "image" },
        (error, result) => {
            if (error || !result?.secure_url) {
                reject(error || new Error("Cloudinary did not return a url"));
                return;
            }
            resolve(result.secure_url);
        }
    );
    upload.end(file.buffer);
});

const attendanceImageUrl = async (req, bookerName) => {
    if (req.file?.buffer?.length) {
        try {
            return await uploadBuffer(req.file, bookerName);
        } catch (error) {
            console.error(error);
            return saveBuffer(req.file, bookerName);
        }
    }
    const existing = text(req.body?.imageUrl || req.body?.uri);
    if (!existing) return "";
    if (isCloudinaryUrl(existing)) return existing;
    if (/^https?:\/\//i.test(existing) || existing.startsWith("data:image/")) {
        const result = await cloudinaryClient().uploader.upload(existing, {
            folder: bookerFolder(bookerName),
            resource_type: "image",
        });
        if (!result?.secure_url) throw new Error("Cloudinary did not return a url");
        return result.secure_url;
    }
    return "";
};

export const CreateAttandance = async (req, res) => {
    try {
        const body = { ...(req.body || {}) };
        const { date, markingType, UserId } = body;
console.log(date, markingType, UserId)
        const findAtan = await AttandanceModal.findOne({ date, markingType, UserId })
        if (findAtan) {
            return res.status(401).send(`You Allready ${markingType}`)
        }

        const imageUrl = await attendanceImageUrl(req, await orderBookerName(UserId, body.bookername));
        if (!imageUrl) return res.status(400).send("Image is required");

        const data = await AttandanceModal.create({
            ...body,
            UserId,
            image: req.file?.originalname || text(body.image),
            uri: imageUrl,
            imageUrl,
        })
        res.status(200).send(data)
    }
    catch (err) {
        console.log(err)
        res.status(400).send(err?.message || "some thing went wrong")
    }
}



export const getAllAttandance = async (req, res) => {
    try {
        const data = await AttandanceModal.find()
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        res.status(400).send("some thing went wrong")

    }
}

/** Today's check-in / check-out for one order booker (mobile landing screen). */
export const getTodayAttandance = async (req, res) => {
    try {
        const UserId = text(req.query?.UserId || req.query?.userId);
        const date = text(req.query?.date);
        if (!UserId || !date) {
            return res.status(400).send({
                status: false,
                message: "UserId and date are required",
            });
        }
        const rows = await AttandanceModal.find({ UserId, date }).lean();
        const checkedIn = rows.some((row) => String(row.markingType || "").toLowerCase() === "check-in");
        const checkedOut = rows.some((row) => String(row.markingType || "").toLowerCase() === "check-out");
        res.status(200).send({
            status: true,
            data: rows,
            checkedIn,
            checkedOut,
            date,
            UserId,
        });
    } catch (err) {
        res.status(400).send({
            status: false,
            message: err?.message || "Something went wrong",
        });
    }
};



export const getWithoExrtactAttandance = async (req, res) => {
    try {
        const data = await AttandanceModal.find({location:{$exists:false}})
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        res.status(400).send("some thing went wrong")

    }
}


export const SortAttandance = async (req, res) => {
    try {
    const { endDate, startDate } = req.query;
    
    // Validate that dates are provided
    if (!startDate || !endDate) {
        return res.status(400).send({ 
            status: false, 
            message: "startDate and endDate are required" 
        });
    }
    
    // Convert string dates to Date objects if needed
    const query = {
        date: {
            $gte: startDate,
            $lte: endDate
        },
location:{$exists:true}
    };
    
    const data = await AttandanceModal.find(query);
    res.status(200).send({ status: true, data: data });
} catch (err) {
    res.status(400).send({ 
        status: false, 
        message: "Something went wrong", 
        error: err.message 
    });
}
}

export const UpdateAttandance = async (req,res) =>{
    try{
        const {id} = req.params
        const UpdateData = await AttandanceModal.findByIdAndUpdate(id, req.body)
        res.send(UpdateData)
    }catch(err){
           res.status(400).send(err)
    }
}
