import { configureStore, combineReducers } from '@reduxjs/toolkit'
import sidebarOptions from '../Reducers/SiderBarOtionFalse.js'
import sidebarReducer from "../Reducers/sidebarReducer";
import users from '../Reducers/userReduser.js'
import LoginerReducer from "../Reducers/LoginerReducer.js"
import UsersRole from "../Reducers/userRoleReduser.js"
import Vendor from "../Reducers/VendorReducer.js"
import Category from "../Reducers/CategoryReducer.js"
import Brand from "../Reducers/BrandRecducer.js"
import MasterSku from "../Reducers/MasterSkuReducer.js"
import UsersRights from "../Reducers/UseRights.js"
import product from '../Reducers/ProductReducer.js'
import Client from "../Reducers/ClientReducer.js"
import Zone from "../Reducers/ZoneReducer.js"
import Town from "../Reducers/TownReducer.js"
import Terrotory from "../Reducers/TerrotoryReducer.js"
import TotalProducts from "../Reducers/TotalProductsReducer.js"
import ChannelType from "../Reducers/ChanneTypelReducer.js"
import Channel from "../Reducers/ChannelReducer.js"
import subChannel from "../Reducers/SubChannelReducer.js"
import Locality from "../Reducers/LocalityReducer.js"
import SubLocality from "../Reducers/SubLocalityReducer.js"
import PurchaseOrder from "../Reducers/PurchaseOrderReducer.js"
import SalesInvoice from "../Reducers/SalesInvoiceReducer.js";
import OrderBooker from "../Reducers/OrderBookerReducer.js"
import Openinginventory from "../Reducers/OpenIngInventory.js"
import { persistStore, persistReducer } from 'redux-persist';
import PurchaseInvoice from "../Reducers/PurchaseInvoiceReducer.js"
import storage from 'redux-persist/lib/storage';
import StockReplacement from '../Reducers/StockReplacement.js'
import Location from "../Reducers/LocationReducer.js"
import Store from "../Reducers/StoreReducer.js"
import TransferOut from "../Reducers/TransferOutReducer.js"
import TransferIn from "../Reducers/TransferInReducer.js"
import SalesInvoiceReturn from "../Reducers/SalesInvoiceReturnReducer.js"
import PurchaseReturn from "../Reducers/PurchaseReturnReducer.js"
import ChartofAccounts from "../Reducers/ChartofAccountsReduser.js"
import ClientOpeningReducer from "../Reducers/ClientOpeningReducer.js"
import VendorOpeningReducer from "../Reducers/VendoropeningReducer.js"
import AccountOpeningReducer from "../Reducers/AccountOpeningReducer.js";
import OpeningInvoices from "../Reducers/OpeningInvoicesReducer.js";
import AdminReducer from "../Reducers/AdminReducer.js";
import VoucherReducer from '../Reducers/VoucherReducer.js';
import ChqBook from '../Reducers/ChqBookReducer.js';
import customerChq from "../Reducers/CustomerChqReducer.js"
import Remaininginvoice from "../Reducers/Remaininginvoice.js"
import DistributroReducers from '../Reducers/DistributroReducers.js';
import DistributorOrder from '../Reducers/DistributorOrderReducer.js';
import OrderDc from "../Reducers/OrderDCReducer.js"
import DitributorInvoice from "../Reducers/DistributorInvoiceReducer.js"
import Group from "../Reducers/GroupReducer.js"
import Region from "../Reducers/RegionReducer.js"
import City from "../Reducers/CityReducer.js"
import Transport from "../Reducers/TransportReducer.js"
import RC from "../Reducers/RcReducer.js"
import DistributorOrderBooker from "../Reducers/DistributorOrderBookerReducer.js"
import Zsm from "../Reducers/ZsmReducer.js"
import PaymentRecived from "../Reducers/PaymentRecivedReducer.js"
import PricelistReducer from "../Reducers/PricelistReducer.js"
import TargetReducer from "../Reducers/TargetReducer.js"
import FixedAsset from "../Reducers/FixedAssetReducer.js"
import APi from "../Reducers/Api.js"
import SlabReducer from "../Reducers/SlabReducer.js"
import Department from "../Reducers/DepartmentReducer.js"
import Designation from "../Reducers/DesignationReducer.js"
import HrEmployee from "../Reducers/HrEmployeeReducer.js"
import HrAttendance from "../Reducers/HrAttendanceReducer.js"
import Payroll from "../Reducers/PayrollReducer.js"
import AllowanceType from "../Reducers/AllowanceTypeReducer.js"
import DeductionType from "../Reducers/DeductionTypeReducer.js"
import CompanyPolicy from "../Reducers/CompanyPolicyReducer.js"
import HolidayCalendar from "../Reducers/HolidayCalendarReducer.js"
import LeaveType from "../Reducers/LeaveReducer.js"
import recruitmentReducer from "../Reducers/recruitmentSlice.js"
import leaveReducer from "../Reducers/leaveSlice.js"
import essReducer from "../Reducers/essSlice.js"
import performanceReducer from "../Reducers/performanceSlice.js"
import lmsReducer from "../Reducers/lmsSlice.js"
import attendanceHrReducer from "../Reducers/attendanceHrSlice.js"
import separationReducer from "../Reducers/separationSlice.js"
import hrDashboardReducer from "../Reducers/hrDashboardSlice.js"
import documentVaultReducer from "../Reducers/documentVaultSlice.js"
import grievanceReducer from "../Reducers/grievanceSlice.js"
import EBFOpeningReducer from "../Reducers/EBFOpeningReducer.js"
import EmployeeSubAccountReducer from "../Reducers/EmployeeSubAccountReducer.js"
const rootReducer = combineReducers({
    isSideBar: sidebarReducer,
    sidebarOptions: sidebarOptions,
    users1: users,
    Transport: Transport,
    DistributorOrderBooker: DistributorOrderBooker,
    Zsm: Zsm,
    Region: Region,
    City: City,
    LoginerReducer: LoginerReducer,
    UsersRole: UsersRole,
    Vendor: Vendor,
    Category: Category,
    Brand: Brand,
    MasterSku: MasterSku,
    UsersRights: UsersRights,
    Product: product,
    Client: Client,
    Zone: Zone,
    Town: Town,
    Terrotory: Terrotory,
    ChannelType: ChannelType,
    Channel: Channel,
    subChannel: subChannel,
    Locality: Locality,
    SubLocality: SubLocality,
    PurchaseOrder: PurchaseOrder,
    PurchaseInvoice: PurchaseInvoice,
    SalesInvoice: SalesInvoice,
    OrderBooker: OrderBooker,
    StockReplacement: StockReplacement,
    Openinginventory: Openinginventory,
    Location: Location,
    Store: Store,
    TotalProducts: TotalProducts,
    TransferOut: TransferOut,
    TransferIn: TransferIn,
    SalesInvoiceReturn: SalesInvoiceReturn,
    PurchaseReturn: PurchaseReturn,
    ChartofAccounts: ChartofAccounts,
    ClientOpeningReducer: ClientOpeningReducer,
    VendorOpeningReducer: VendorOpeningReducer,
    AccountOpeningReducer: AccountOpeningReducer,
    OpeningInvoices: OpeningInvoices,
    AdminReducer: AdminReducer,
    VoucherReducer: VoucherReducer,
    ChqBook: ChqBook,
    customerChq: customerChq,
    Remaininginvoice: Remaininginvoice,
    DistributroReducers: DistributroReducers,
    DistributorOrder: DistributorOrder,
    OrderDc: OrderDc,
    DitributorInvoice: DitributorInvoice,
    Group: Group,
    RC: RC,
    PaymentRecived: PaymentRecived,
    PricelistReducer : PricelistReducer,
    APi : APi,
    TargetReducer : TargetReducer,
    FixedAsset: FixedAsset,
    SlabReducer: SlabReducer,
    Department: Department,
    Designation: Designation,
    HrEmployee: HrEmployee,
    HrAttendance: HrAttendance,
    Payroll: Payroll,
    AllowanceType: AllowanceType,
    DeductionType: DeductionType,
    CompanyPolicy: CompanyPolicy,
    HolidayCalendar: HolidayCalendar,
    LeaveType: LeaveType,
    recruitment: recruitmentReducer,
    leave: leaveReducer,
    ess: essReducer,
    performance: performanceReducer,
    lms: lmsReducer,
    attendanceHr: attendanceHrReducer,
    separation: separationReducer,
    hrDashboard: hrDashboardReducer,
    documentVault: documentVaultReducer,
    grievance: grievanceReducer,
    EBFOpeningReducer: EBFOpeningReducer,
    EmployeeSubAccountReducer: EmployeeSubAccountReducer

});

const persistConfig = {
    key: 'root',
    storage,
    whitelist: ['isSideBar', 'TransferIn', "Location", "Store", "Openinginventory", "StockReplacement", "OrderBooker", "PurchaseOrder", "Locality", "sidebarOptions", "SubLocality", "users1", "Category", "Vendor", "MasterSku", "UsersRights", "UsersRole", "Brand", "Zone", "Town", "Terrotory", "ChannelType", "Channel", "subChannel"]
};


const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }),
});

export const persistor = persistStore(store);
