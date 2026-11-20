import express from "express"
import cors from 'cors'
import db from "./db/db.js"
import UserRouter from "./Routes/userRoutes.js";
import compression from "compression";
import UserRoleRouter from "./Routes/userRoleRoute.js";
import DistrbutorRouter from "./Routes/DistrbutorRoutes.js";
import CategoryRouter from "./Routes/CategoryRoute.js";
import BrandRouter from "./Routes/BrandRoute.js";
import MasterSkuRouter from "./Routes/MasterSkuRoute.js";
import ProductRouter from "./Routes/ProductRoute.js";
import PurchaseOrderRouter from "./Routes/PurchaseOrderRoutes.js";
import PurchaseOrderDCRouter from "./Routes/PurchaseOrderDCRoutes.js";
import OrderBookerRouter from "./Routes/OrderBookerRoute.js";
import { CustomorROuter } from "./modal/CustomorRoute.js";
import SaleOrderRouter from "./Routes/SaleOrderRoutes.js";
import TotalProductRouter from "./Routes/TotalProductRoute.js";
import SaleOrderDcRouter from "./Routes/SaleOrderDcRoutes.js";
import SalesInvoiceRouter from "./Routes/SalesInvoiceRoute.js";
import LoadFormRouter from "./Routes/loadFormRoutes.js";
import PriceListRouter from "./Routes/PriceListRoutes.js"
import AttandanceRouter from "./Routes/AttandanceRoute.js";
import customerChqRouter from "./Routes/ChqRoute.js";
import VoucherRouter from "./Routes/VoucherRoute.js";
import StockAdjustmentRouter from "./Routes/StockAdjustmentRoute.js";
import SlabRouter from "./Routes/SlabRoutes.js";

const Router = express.Router()
const app = express();
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '50000mb' }));
app.use(express.urlencoded({ limit: '50000mb', extended: true }));

app.get("/", (req, res) => {
  res.json({ ok: true, service: "snd-backend" });
});

app.use(async (req, res, next) => {
  try {
    await db();
    next();
  } catch (error) {
    res.status(500).json({ message: "Database connection failed", detail: error.message });
  }
});

export const users = app.use('/users', UserRouter)
export const Slab = app.use('/Slab', SlabRouter)

export const Roles = app.use('/userRole', UserRoleRouter)
export const Distrbutor = app.use("/Distrbutor" , DistrbutorRouter)
export const Category = app.use('/Category', CategoryRouter)
export const Brand = app.use('/Brand', BrandRouter)
export const MasterSku = app.use('/MasterSku', MasterSkuRouter)
export const Product = app.use('/Product', ProductRouter)
export const PurchaseOrder = app.use("/PurchaseOrder" , PurchaseOrderRouter)
export const PurchaseOrderDC = app.use("/PurchaseOrderDC" , PurchaseOrderDCRouter)
export const OrderBooker = app.use("/OrderBooker", OrderBookerRouter)
export const Customor = app.use("/Customor", CustomorROuter)
export const SaleOrderRoute = app.use("/saleOrder", SaleOrderRouter);
export const TotalProductRoute = app.use("/TotalProduct", TotalProductRouter)
export const SaleOrderDC = app.use("/SaleOrderDC", SaleOrderDcRouter);
export const SalesInvoiceRoute = app.use("/SalesInvoice", SalesInvoiceRouter);
export const LoadFormRoute = app.use("/LoadForm", LoadFormRouter);
export const PriceList = app.use("/PriceList" , PriceListRouter)
export const AttandanceList = app.use("/Attandance" , AttandanceRouter)
export const customerChq = app.use("/customerChq" , customerChqRouter)
export const Voucher = app.use("/Voucher", VoucherRouter)
export const StockAdjustment = app.use("/StockAdjustment", StockAdjustmentRouter)

export default app
