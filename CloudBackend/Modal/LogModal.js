// models/Log.js
import mongoose from "mongoose";

const logSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: String,
  payload: Object,
  responseStatus: Number,
  RefNumber: String,
  Page : String,
  createdAt: { type: Date, default: Date.now }
});

const logModal = mongoose.model('activitylog' , logSchema)

export default logModal