import mongoose from "mongoose";

const ZoneSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true
    },
    ZoneName: {
        type: String,
        required: true
    },
  
})

const ZoneModal = mongoose.model("Zone", ZoneSchema)

export default ZoneModal