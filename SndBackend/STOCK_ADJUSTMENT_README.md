# Stock Adjustment Feature - Backend Documentation

## 📁 New Files Created

### 1. `Backend/Modal/StockAdjustmentModal.js` — MongoDB Schema

```javascript
import mongoose from "mongoose";

const StockAdjustmentSchema = new mongoose.Schema(
  {
    Distrbutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Distrbutor",
      required: true,
    },
    Adjustments: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        adjustmentType: {
          type: String,
          enum: ["Add", "Less"],
          required: true,
        },
        Box: { type: Number, required: true },
        Carton: { type: Number, default: 0 },
        Unit: { type: Number, default: 0 },
      },
    ],
    AdjustmentDate: { type: String, required: true },
    Reason: { type: String, default: "" },
    CreatedBy: { type: String, default: "admin@js.com" },
  },
  { timestamps: true }
);

const StockAdjustmentModal = mongoose.model("StockAdjustment", StockAdjustmentSchema);
export default StockAdjustmentModal;
```

**Schema Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Distrbutor | ObjectId → Distrbutor | ✅ | Distributor reference |
| Adjustments | Array | ✅ | Array of adjustment rows |
| Adjustments[].product | ObjectId → Product | ✅ | Product reference |
| Adjustments[].adjustmentType | String ("Add"/"Less") | ✅ | Add or Less stock |
| Adjustments[].Box | Number | ✅ | Number of boxes |
| Adjustments[].Carton | Number | ❌ | Number of cartons (default: 0) |
| Adjustments[].Unit | Number | ❌ | Number of units (default: 0) |
| AdjustmentDate | String | ✅ | Date of adjustment |
| Reason | String | ❌ | Reason for adjustment |
| CreatedBy | String | ❌ | Default: "admin@js.com" |

---

### 2. `Backend/Controllar/StockAdjustmentControllar.js` — Controller

All CRUD functions:

| # | Function | Method | Endpoint | Description |
|---|----------|--------|----------|-------------|
| 1 | `createStockAdjustment` | POST | `/` | Create new stock adjustment |
| 2 | `getAllStockAdjustments` | GET | `/` | Get all adjustments (populated) |
| 3 | `getStockAdjustmentsByDistributor` | GET | `/ByDistributor/:Distrbutor` | Filter by distributor + date range |
| 4 | `getStockAdjustmentsForReport` | GET | `/Report` | Flattened data for Stock Flow Report |
| 5 | `getStockAdjustmentById` | GET | `/:id` | Get single adjustment by ID |
| 6 | `updateStockAdjustment` | PUT | `/:id` | Update adjustment |
| 7 | `deleteStockAdjustment` | DELETE | `/Delete/:id` | Delete adjustment |

**Key Details:**
- `getStockAdjustmentsForReport` — flattens nested adjustments into individual rows for easy report consumption
- `getStockAdjustmentsByDistributor` — supports `?startDate=&endDate=` query params
- `getStockAdjustmentsForReport` — supports `?Distrbutor=&startDate=&endDate=` query params

---

### 3. `Backend/Routes/StockAdjustmentRoute.js` — Route File

```javascript
import express from "express";
import {
  createStockAdjustment,
  getAllStockAdjustments,
  getStockAdjustmentsByDistributor,
  getStockAdjustmentsForReport,
  getStockAdjustmentById,
  updateStockAdjustment,
  deleteStockAdjustment,
} from "../Controllar/StockAdjustmentControllar.js";

const StockAdjustmentRouter = express.Router();

StockAdjustmentRouter.post("/", createStockAdjustment);
StockAdjustmentRouter.get("/", getAllStockAdjustments);
StockAdjustmentRouter.get("/ByDistributor/:Distrbutor", getStockAdjustmentsByDistributor);
StockAdjustmentRouter.get("/Report", getStockAdjustmentsForReport);
StockAdjustmentRouter.get("/:id", getStockAdjustmentById);
StockAdjustmentRouter.put("/:id", updateStockAdjustment);
StockAdjustmentRouter.delete("/Delete/:id", deleteStockAdjustment);

export default StockAdjustmentRouter;
```

---

## 📝 Modified Files

### 4. `Backend/App.js` — Route Registration

**Added import:**
```javascript
import StockAdjustmentRouter from "./Routes/StockAdjustmentRoute.js";
```

**Added route:**
```javascript
export const StockAdjustment = app.use("/StockAdjustment", StockAdjustmentRouter)
```

**Base URL:** `http://localhost:PORT/StockAdjustment`

---

## 🌐 API Endpoints Summary

| Method | URL | Body / Query | Description |
|--------|-----|-------------|-------------|
| POST | `/StockAdjustment/` | `{ Distrbutor, Adjustments, AdjustmentDate, Reason, CreatedBy }` | Create adjustment |
| GET | `/StockAdjustment/` | — | Get all adjustments |
| GET | `/StockAdjustment/ByDistributor/:Distrbutor` | `?startDate=&endDate=` | Filter by distributor |
| GET | `/StockAdjustment/Report` | `?Distrbutor=&startDate=&endDate=` | Report data (flattened) |
| GET | `/StockAdjustment/:id` | — | Get single adjustment |
| PUT | `/StockAdjustment/:id` | `{ Distrbutor, Adjustments, AdjustmentDate, Reason }` | Update adjustment |
| DELETE | `/StockAdjustment/Delete/:id` | — | Delete adjustment |

---

## 📋 Sample Request Body

### Create / Update Adjustment
```json
{
  "Distrbutor": "664f1a2b3c4d5e6f7a8b9c0d",
  "Adjustments": [
    {
      "product": "664f1a2b3c4d5e6f7a8b9c1e",
      "adjustmentType": "Add",
      "Box": 10,
      "Carton": 5,
      "Unit": 20
    },
    {
      "product": "664f1a2b3c4d5e6f7a8b9c2f",
      "adjustmentType": "Less",
      "Box": 3,
      "Carton": 1,
      "Unit": 0
    }
  ],
  "AdjustmentDate": "2026-08-24",
  "Reason": "Stock correction after physical count",
  "CreatedBy": "admin@js.com"
}
```

### Report Response (Flattened)
```json
{
  "data": [
    {
      "_id": "adjustment_id",
      "Distrbutor": "distributor_id",
      "product": "product_id",
      "ProductName": "Product A",
      "adjustmentType": "Add",
      "Box": 10,
      "Carton": 5,
      "Unit": 20,
      "AdjustmentDate": "2026-08-24",
      "Reason": "Stock correction",
      "Type": "Stock Adjustment",
      "Page": "StockAdjustment"
    }
  ]
}
```

---

## ⚠️ Important Notes

1. **Existing models referenced:** `Distrbutor` and `Product` must already exist in your MongoDB
2. **No authentication middleware** is added on these routes — you can add `CheckRights` middleware later if needed
3. **Date format** is stored as String (e.g., "2026-08-24"), not Date object — consistent with other modules
4. **Flattened report data** is specifically designed for PearlSND StockFlowReportPopup to consume easily
5. **Route order matters** — `/ByDistributor/:Distrbutor` and `/Report` are defined BEFORE `/:id` to avoid route conflicts
