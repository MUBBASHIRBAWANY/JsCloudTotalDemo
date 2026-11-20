import express from "express"
import path from "path"
import cors from 'cors'
import db from "./db/db.js"
import UserRouter from "./Routes/userRoutes.js"
import UserRoleRouter from "./Routes/userRoleRoute.js"
import { VendorROuter } from "./Routes/VendorRoute.js"
import BrandRouter from "./Routes/BrandRoute.js"
import MasterSkuRouter from "./Routes/MasterSkuRoute.js"
import CategoryRouter from "./Routes/CategoryRoute.js"
import ProductRouter from "./Routes/ProductRoute.js"
import { CustomorROuter } from "./Routes/CustomorRoute.js"
import TerrotoryRouter from "./Routes/TerrotoryRoute.js"
import RegionRouter from "./Routes/RegionRoutes.js"
import TownRouter from "./Routes/TownRoute.js"
import ChannelTypeRouter from "./Routes/ChanneTypelRoute.js"
import ChannelRouter from "./Routes/ChannelRoute.js"
import SubChannelRouter from "./Routes/SubChannelRoute.js"
import LocalityRouter from "./Routes/LocalityRoute.js"
import SubLocalityRouter from "./Routes/SubLocalityRoute.js"
import PurchaseInvoiceRouter from './Routes/PurchaseInvoiceRoute.js'
import TotalProductRouter from "./Routes/TotalProductRoute.js"
import SalesInvoiceRouter from "./Routes/SalesInvoiceRoute.js"
import OrderBookerRouter from "./Routes/OrderBookerRoute.js"
import OpeninginventoryRoute from "./Routes/OpeninginventoryRoute.js"
import InventoryReportRoute from "./Routes/InvetoryReportRoute.js"
import StoreRouter from "./Routes/StoreRoutes.js"
import LocationRouter from "./Routes/LocationRoute.js"
import compression from 'compression';
import InventoryTransferOutRouter from "./Routes/TransferOutRoutes.js"
import InventoryTransferInRouter from "./Routes/TransferInRoutes.js"
import SalesInvoiceReturnRouter from "./Routes/SalesInvoiceReturnRoute.js"
import PurchaseReturnRouter from "./Routes/PurchaseReturnRoute.js"
import StockReplacementRouter from "./Routes/StockReplacementRoute.js"
import DamageProductRouter from "./Routes/DamagePRoductRoute.js"
import { ChartofAccountsROuter } from "./Routes/ChartofAccountsRoutes.js"
import AdministrativeRouter from "./Routes/AdministrativeRoutes.js"
import ClientOpeningBalanceRouter from "./Routes/ClientOpeningBalance.js"
import VendorOpeningRouter from "./Routes/VendorOpeningRoutes.js"
import AccountOpeningRouter from "./Routes/AccountsOpeningRoutes.js"
import OpeningInvoiceRoutes from "./Routes/OpeningInvoiceRoutes.js"
import VoucherRouter from "./Routes/VoucherRoute.js"
import ChqBookRouter from "./Routes/ChqBookRoutes.js"
import GernalLagerRouter from "./Routes/GernalLagerReportRoutes.js"
import CustomerChqRecivedRouter from "./Routes/CustomerChqRecivedRoute.js"
import RealizeRouter from "./Routes/RealizeRoute.js"
import DistrbutorRouter from "./Routes/DistrbutorRoutes.js"
import AdvanceDiscountPolicyRouter from "./Routes/AdvanceDiscountPolicyRoute.js"
import DistributorSaleOrderRouter from "./Routes/DistributorSaleOrderRoutes.js"
import OrderDCRouter from "./Routes/OrderDCRoutes.js"
import DistrbutorInvoiceRoutes from "./Routes/DistrbutorInvoiceRoutes.js"
import CityRouter from "./Routes/CityRoutes.js"
import ZoneRouter from "./Routes/ZoneRoute.js"
import GroupRouter from "./Routes/GroupRoute.js"
import DitriButorOrderBookerRouter from "./Routes/DitriButorOrderBookerRoutes.js"
import TransporterRouter from "./Routes/TransporterRoute.js"
import RCRouter from "./Routes/RcRoutes.js"
import PaymentRecivedRouter from "./Routes/PaymentRecivedRoutes.js"
import PriceListRouter from "./Routes/PriceListRoutes.js"
import LogRouter from "./Routes/LogRoutes.js"
import AttandanceRouter from "./Routes/AttandanceRoute.js"
import TargetRouter from "./Routes/TargetRoutes.js"
import OrderBookerpaymentRcvdRouter from "./Routes/OrderBookerpaymentRcvdRoutes.js"
import FixedAssetRouter from "./Routes/FixedAssetRoute.js"
import AccountTransferRouter from "./Routes/AccountTransferRoutes.js"
import DitriButorZSMRouter from "./Routes/DitriButorZsmRoutes.js"
import SlabRouter from "./Routes/SlabRoutes.js"
import FinancialYearRouter from "./Routes/FinancialYearRoutes.js"
import SyncRouter from "./Routes/SyncRoutes.js"
import SavedInvestmentReportRouter from "./Routes/SavedInvestmentReportRoute.js"
// ===== HRMS Route Imports (merged from backend2) =====
import DepartmentRouter from "./Routes/DepartmentRoute.js"
import DesignationRouter from "./Routes/DesignationRoute.js"
import EmployeeHrRouter from "./Routes/EmployeeHrRoute.js"
import AttendanceHrRouter from "./Routes/AttendanceHrRoute.js"
import AttendanceCorrectionRouter from "./Routes/AttendanceCorrectionRoute.js"
import AttendanceMonthLockRouter from "./Routes/AttendanceMonthLockRoute.js"
import AttendanceReportRouter from "./Routes/AttendanceReportRoute.js"
import ApprovalWorkflowRouter from "./Routes/ApprovalWorkflowRoute.js"
import NotificationRouter from "./Routes/NotificationRoute.js"
import PayrollRouter from "./Routes/PayrollRoute.js"
import PayrollAccountMappingRouter from "./Routes/PayrollAccountMappingRoute.js"
import PayrollMonthRouter from "./Routes/PayrollMonthRoute.js"
import PayrollAdjustmentRouter from "./Routes/PayrollAdjustmentRoute.js"
import AllowanceTypeRouter from "./Routes/AllowanceTypeRoute.js"
import DeductionTypeRouter from "./Routes/DeductionTypeRoute.js"
import SalaryHistoryRouter from "./Routes/SalaryHistoryRoute.js"
import SalaryAdvanceRouter from "./Routes/SalaryAdvanceRoute.js"
import StaffLoanRouter from "./Routes/StaffLoanRoute.js"
import LoanRouter from "./Routes/LoanRoute.js"
import LoanRepaymentLogRouter from "./Routes/LoanRepaymentLogRoute.js"
import CompanyPolicyRouter from "./Routes/CompanyPolicyRoute.js"
import HolidayCalendarRouter from "./Routes/HolidayCalendarRoute.js"
import JobPostingRouter from "./Routes/JobPostingRoute.js"
import ApplicantRouter from "./Routes/ApplicantRoute.js"
import OnboardingRouter from "./Routes/OnboardingRoute.js"
import LeaveApplicationRouter from "./Routes/LeaveApplicationRoute.js"
import LeaveTypeRouter from "./Routes/LeaveTypeRoute.js"
import LeavePolicyRouter from "./Routes/LeavePolicyRoute.js"
import LeaveBalanceRouter from "./Routes/LeaveBalanceRoute.js"
import ESSRouter from "./Routes/ESSRoute.js"
import PerformanceRouter from "./Routes/PerformanceRoute.js"
import LMSRouter from "./Routes/LMSRoute.js"
import ShiftRouter from "./Routes/ShiftRoute.js"
import OvertimePolicyRouter from "./Routes/OvertimePolicyRoute.js"
import GrievanceRouter, { DisciplinaryRouter } from "./Routes/GrievanceRoute.js"
import DocumentVaultRouter from "./Routes/DocumentVaultRoute.js"
import SeparationRouter from "./Routes/SeparationRoute.js"
import HRDashboardRouter from "./Routes/HRDashboardRoute.js"
import ContractorRouter from "./Routes/ContractorRoute.js"
import ReligionRouter from "./Routes/ReligionRoute.js"
import BankHrRouter from "./Routes/BankRoute.js"
import ReasonRouter from "./Routes/ReasonRoute.js"
import BadDebtRouter from "./Routes/BadDebtRoute.js"
import EarningDeductionCodeRouter from "./Routes/EarningDeductionCodeRoute.js"
import MonthlyTransactionRouter from "./Routes/MonthlyTransactionRoute.js"
import TransferRouter from "./Routes/TransferRoute.js"
import IncomeTaxRouter from "./Routes/IncomeTaxRoute.js"
import ApprovalHistoryRouter from "./Routes/ApprovalHistoryRoute.js"
import EBFBalanceRouter from "./Routes/EBFBalanceRoute.js"
import EBFOpeningRouter from "./Routes/EBFOpeningBalanceRoute.js"
import EmployeeEBFAccountRouter from "./Routes/EmployeeEBFAccountRoute.js"
import EmployeeLoanAccountRouter from "./Routes/EmployeeLoanAccountRoute.js"
import EmployeeBadDebtAccountRouter from "./Routes/EmployeeBadDebtAccountRoute.js"
import EmployeeAdvanceAccountRouter from "./Routes/EmployeeAdvanceAccountRoute.js"
import LoanOpeningRouter from "./Routes/LoanOpeningRoute.js"
import LedgerRouter from "./Routes/LedgerRoute.js"
import CostingRouter from "./Routes/CostingRoute.js"

// ===== Import Auth Middleware =====
import authMiddleware from "./Midelware/authMiddleware.js"
import { crudGuard, moduleGuard } from "./Midelware/moduleGuard.js"
import { PERMISSIONS } from "./utils/permission.js"
import { hrmsErrorShape } from "./utils/hrmsError.js"
import StockAdjustmentRouter from "./Routes/StockAdjustmentRoute.js"
import PhysicalVsSystemStockRouter from "./Routes/PhysicalVsSystemStockRoute.js"

const Router = express.Router()
const app = express();
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '50000mb' }));
app.use(express.urlencoded({ limit: '50000mb', extended: true }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

let dataBase = db()

// ============================================
// UNPROTECTED ROUTES (No auth required)
// ============================================
export const users = app.use('/users', UserRouter)
export const DitriButorOrderBooker = app.use('/DitriButorOrderBooker', DitriButorOrderBookerRouter);
export const City = app.use("/City", CityRouter)
export const Distrbutor = app.use("/Distrbutor", DistrbutorRouter)

// ============================================
// AUTH MIDDLEWARE - Applied globally to all routes below
// ============================================
app.use(authMiddleware)

// ============================================
// PROTECTED ROUTES (Auth required)
// ============================================
export const Zone = app.use('/Zone', ZoneRouter)
export const Group = app.use('/Group', GroupRouter)
export const Roles = app.use('/userRole', UserRoleRouter)
export const vendor = app.use('/vendor', VendorROuter)
export const Brand = app.use('/Brand', BrandRouter)
export const MasterSku = app.use('/MasterSku', MasterSkuRouter)
export const fixedAssets = app.use('/FixedAsset', FixedAssetRouter)
// export const OrderBookerpaymentRcvd = app.use("/OrderBookerpaymentRcvd", OrderBookerpaymentRcvdRouter)
export const Category = app.use('/Category', CategoryRouter)
export const Product = app.use('/Product', ProductRouter)
export const Customer = app.use('/customer', CustomorROuter)
export const StockAdjustmentRoute = app.use("/StockAdjustment", StockAdjustmentRouter)
export const PhysicalVsSystemStockRoute = app.use("/PhysicalVsSystemStock", PhysicalVsSystemStockRouter)
export const Terrotory = app.use('/Terrotory', TerrotoryRouter)
export const Region = app.use('/Region', RegionRouter)
export const Town = app.use("/Town", TownRouter)
export const ChanelType = app.use("/chanelType", ChannelTypeRouter)
export const Channel = app.use("/Channel", ChannelRouter)
export const SubChannel = app.use("/SubChannel", SubChannelRouter)
export const Locality = app.use("/Locality", LocalityRouter)
export const SubLocality = app.use('/SubLocality', SubLocalityRouter)
export const PurchaseInvoice = app.use("/PurchaseInvoice", PurchaseInvoiceRouter)
export const TotalProduct = app.use('/TotalProduct', TotalProductRouter)
export const SaleInvoice = app.use('/SaleInvoice', SalesInvoiceRouter)
export const OrderBooker = app.use("/OrderBooker", OrderBookerRouter)
export const Openinginventory = app.use("/Openinginventory", OpeninginventoryRoute)
export const InventoryReport = app.use('/InventoryReport', InventoryReportRoute)
export const StoreRouute = app.use('/Store', StoreRouter)
export const SavedInvestmentReport = app.use("/SavedInvestmentReport", SavedInvestmentReportRouter)
export const LocationRouute = app.use('/Location', LocationRouter)
export const InventoryTransferRute = app.use("/TransferOut", InventoryTransferOutRouter)
export const InventoryTransferInRute = app.use("/TransferIn", InventoryTransferInRouter)
export const SalesInvoiceReturnRoute = app.use('/SalesInvoiceReturn', SalesInvoiceReturnRouter)
export const PurchaseReturnRoute = app.use("/PurchaseReturn", PurchaseReturnRouter)
export const StockReplacementRoute = app.use("/StockReplacement", StockReplacementRouter)
export const DamageProductRoute = app.use("/DamageProduct", DamageProductRouter)
export const ChartofAccountsROute = app.use("/ChartofAccounts", ChartofAccountsROuter)
export const AdministrativeRoute = app.use("/Administrative", AdministrativeRouter)
export const ClientOpeningBalanceRoute = app.use("/ClientOpeningBalance", ClientOpeningBalanceRouter)
export const VendorOpeningRoute = app.use("/VendorOpening", VendorOpeningRouter)
export const AccountOpening = app.use("/AccountOpening", AccountOpeningRouter)
export const OpeningInvoiceRoute = app.use('/OpeningInvoice', OpeningInvoiceRoutes)
export const VoucherRoute = app.use('/Voucher', VoucherRouter);
export const ChqBookRoute = app.use('/ChqBook', ChqBookRouter)
export const GernalLager = app.use("/GernalLager", GernalLagerRouter)
export const CustomerChqRecivedRoute = app.use("/CustomerChqRecived", CustomerChqRecivedRouter)
export const RealizeRoute = app.use("/Realize", RealizeRouter)
export const DistributorSaleOrder = app.use("/DistributorSaleOrder", DistributorSaleOrderRouter)
export const OrderDC = app.use("/DcOrder", OrderDCRouter)
export const Transporter = app.use("/Transport", TransporterRouter)
export const RC = app.use("/RC", RCRouter)
export const PaymentRecived = app.use("/PaymentRecived", PaymentRecivedRouter)
export const DistrbutorInvoice = app.use("/DistrbutorInvoice", DistrbutorInvoiceRoutes)
export const PriceList = app.use("/PriceList", PriceListRouter)
export const AdvanceDiscountPolicy = app.use("/AdvanceDiscountPolicy", AdvanceDiscountPolicyRouter)
export const AttandanceList = app.use("/Attandance", AttandanceRouter)
export const log1 = app.use("/Log", LogRouter)
export const LogReport = app.use("/LogReport", LogRouter)
export const Target = app.use("/Target", TargetRouter)
export const AccountTransfer = app.use("/AccountTransfer", AccountTransferRouter)
export const Zsm = app.use("/Zsm", DitriButorZSMRouter)
export const Slab = app.use("/Slab", SlabRouter)
export const FinancialYear = app.use("/FinancialYear", FinancialYearRouter)
export const Sync = app.use("/Sync", SyncRouter)
export const Costing = app.use("/Costing", CostingRouter)

// ===== HRMS Routes (merged from backend2) =====
app.use(hrmsErrorShape)
const payrollGuard = moduleGuard({
    get: "List Payroll",
    post: "Generate Payroll",
    put: "Edit Payroll",
    delete: "Edit Payroll",
    match: [
        { method: "GET", test: (path) => path.includes("summary"), permission: "Payroll Summary" },
        { method: "GET", test: (path) => path.includes("payslip"), permission: "View Payroll" },
        { method: "GET", test: (path) => path.includes("month"), permission: ["List Payroll", "Generate Payroll", "Edit Payroll"] },
        { method: "POST", test: (path) => /paid|approve|close|status/.test(path), permission: "Edit Payroll" },
    ],
})
const payrollSetup = crudGuard({
    read: ["List Payroll", "Generate Payroll", "Edit Payroll", "View Payroll"],
    add: "Generate Payroll",
    edit: "Edit Payroll",
    remove: "Edit Payroll",
})

export const Department = app.use("/HrDepartment", crudGuard({ list: "List Department", add: "Add Department", edit: "Edit Department", remove: "Delete Department" }), DepartmentRouter)
export const Designation = app.use("/HrDesignation", crudGuard({ list: "List Designation", add: "Add Designation", edit: "Edit Designation", remove: "Delete Designation" }), DesignationRouter)
export const HrEmployee = app.use("/HrEmployee", crudGuard({
    read: ["List HR Employee", "Add HR Employee", "Add HR Employee Bulk", "Edit HR Employee", "Delete HR Employee", "Add HR Attendance", "Edit HR Attendance"],
    add: "Add HR Employee",
    edit: "Edit HR Employee",
    remove: "Delete HR Employee",
    match: [{ method: "POST", test: (path) => path.includes("bulk"), permission: "Add HR Employee Bulk" }],
}), EmployeeHrRouter)
export const AttendanceHr = app.use("/HrAttendance", crudGuard({ list: "List HR Attendance", add: "Add HR Attendance", edit: "Edit HR Attendance", view: "View Advanced Attendance" }), AttendanceHrRouter)
export const AttendanceCorrection = app.use("/HrAttendanceCorrection", crudGuard({ list: "List HR Attendance", add: "Add HR Attendance", edit: "Edit HR Attendance" }), AttendanceCorrectionRouter)
export const AttendanceMonthLock = app.use("/HrAttendanceMonthLock", crudGuard({ list: "List HR Attendance", add: "Manage Advanced Attendance", edit: "Manage Advanced Attendance" }), AttendanceMonthLockRouter)
export const ApprovalWorkflow = app.use("/HrApprovalWorkflow", crudGuard({ list: "Workflow Config", add: "Workflow Config", edit: "Workflow Config", remove: "Workflow Config" }), ApprovalWorkflowRouter)
export const Notification = app.use("/Notification", NotificationRouter)
export const AttendanceReport = app.use("/HrAttendanceReport", crudGuard({ list: "HR Attendance Report" }), AttendanceReportRouter)
export const Payroll = app.use("/Payroll", payrollGuard, PayrollRouter)
export const PayrollAccountMapping = app.use("/PayrollAccountMapping", crudGuard({ list: "Edit Payroll", add: "Edit Payroll", edit: "Edit Payroll" }), PayrollAccountMappingRouter)
export const AllowanceType = app.use("/HrAllowanceType", crudGuard({ list: "List Allowance Type", add: "Add Allowance Type", edit: "Edit Allowance Type", remove: "Delete Allowance Type" }), AllowanceTypeRouter)
export const DeductionType = app.use("/HrDeductionType", crudGuard({ list: "List Deduction Type", add: "Add Deduction Type", edit: "Edit Deduction Type", remove: "Delete Deduction Type" }), DeductionTypeRouter)
export const SalaryHistory = app.use("/HrSalaryHistory", crudGuard({ list: "List Payroll", add: "Edit Payroll", edit: "Edit Payroll" }), SalaryHistoryRouter)
export const PayrollAdjustment = app.use("/HrPayrollAdjustment", crudGuard({ list: "List Payroll", add: "Generate Payroll", edit: "Edit Payroll", remove: "Edit Payroll" }), PayrollAdjustmentRouter)
export const Loan = app.use("/HrLoan", crudGuard({ list: "List Payroll", add: "Generate Payroll", edit: "Edit Payroll", remove: "Edit Payroll" }), LoanRouter)
export const CompanyPolicy = app.use("/CompanyPolicy", crudGuard({ list: "View Company Policy", edit: "Edit Company Policy" }), CompanyPolicyRouter)
export const HolidayCalendar = app.use("/HolidayCalendar", crudGuard({ list: "List Holiday", add: "Add Holiday", edit: "Edit Holiday", remove: "Delete Holiday" }), HolidayCalendarRouter)
export const LoanRepaymentLog = app.use("/HrLoanRepaymentLog", crudGuard({ list: "List Payroll", add: "Edit Payroll" }), LoanRepaymentLogRouter)
export const JobPosting = app.use("/HrJobPosting", crudGuard({ list: "View Recruitment", add: "Manage Recruitment", edit: "Manage Recruitment", remove: "Manage Recruitment" }), JobPostingRouter)
export const Applicant = app.use("/", ApplicantRouter)
export const Onboarding = app.use("/", OnboardingRouter)
export const LeaveApplication = app.use("/HrLeave", crudGuard({ list: "List Leave Application", add: "Apply Leave", edit: "Approve Leave" }), LeaveApplicationRouter)
export const LeaveType = app.use("/HrLeaveType", crudGuard({ list: "List Leave Type", add: "Add Leave Type", edit: "Edit Leave Type", remove: "Delete Leave Type" }), LeaveTypeRouter)
export const LeavePolicy = app.use("/HrLeavePolicy", crudGuard({ list: "View Leave Management", add: "Manage Leave", edit: "Manage Leave" }), LeavePolicyRouter)
export const LeaveBalance = app.use("/HrLeaveBalance", crudGuard({ list: "List Leave Application", add: "Manage Leave", edit: "Manage Leave" }), LeaveBalanceRouter)
export const ESS = app.use("/HrESS", crudGuard({ list: "View ESS Portal", edit: "View ESS Portal" }), ESSRouter)
export const Performance = app.use("/HrPerformance", crudGuard({ list: "View Performance", add: "Manage Performance", edit: "Manage Performance" }), PerformanceRouter)
export const LMS = app.use("/HrLMS", crudGuard({ list: "View LMS", add: "Manage LMS", edit: "Manage LMS" }), LMSRouter)
export const Shift = app.use("/HrShift", crudGuard({ list: "View Advanced Attendance", add: "Manage Advanced Attendance", edit: "Manage Advanced Attendance", remove: "Manage Advanced Attendance" }), ShiftRouter)
export const OvertimePolicy = app.use("/HrOvertimePolicy", crudGuard({ list: "View Advanced Attendance", add: "Manage Advanced Attendance", edit: "Manage Advanced Attendance" }), OvertimePolicyRouter)
export const Grievance = app.use("/HrGrievance", crudGuard({ list: "View Grievance", add: "Manage Grievance", edit: "Manage Grievance" }), GrievanceRouter)
export const Disciplinary = app.use("/HrDisciplinary", crudGuard({ list: "View Grievance", add: "Manage Grievance", edit: "Manage Grievance" }), DisciplinaryRouter)
export const DocumentVault = app.use("/HrDocument", crudGuard({ list: "View Document Vault", add: "Manage Document Vault", edit: "Manage Document Vault" }), DocumentVaultRouter)
export const Separation = app.use("/HrSeparation", crudGuard({ list: "View Separation", add: "Manage Separation", edit: "Manage Separation" }), SeparationRouter)
export const HRDashboard = app.use("/HrDashboard", crudGuard({ list: "View HR Dashboard" }), HRDashboardRouter)
export const Contractor = app.use("/HrContractor", payrollSetup, ContractorRouter)
export const Religion = app.use("/HrReligion", payrollSetup, ReligionRouter)
export const BankHr = app.use("/HrBank", payrollSetup, BankHrRouter)
export const Reason = app.use("/HrReason", payrollSetup, ReasonRouter)
export const BadDebt = app.use("/HrBadDebt", payrollSetup, BadDebtRouter)
export const EarningDeductionCode = app.use("/HrEarningDeductionCode", payrollSetup, EarningDeductionCodeRouter)
export const MonthlyTransaction = app.use("/HrMonthlyTransaction", payrollSetup, MonthlyTransactionRouter)
export const Transfer = app.use("/HrTransfer", crudGuard({ list: "Edit HR Employee", add: "Edit HR Employee", edit: "Edit HR Employee" }), TransferRouter)
export const IncomeTax = app.use("/HrIncomeTax", crudGuard({ list: "View Payroll", add: "Edit Payroll", edit: "Edit Payroll" }), IncomeTaxRouter)
export const PayrollMonth = app.use("/HrPayrollMonth", crudGuard({ list: "List Payroll", add: "Edit Payroll", edit: "Edit Payroll" }), PayrollMonthRouter)
export const SalaryAdvance = app.use("/SalaryAdvance", payrollSetup, SalaryAdvanceRouter)
export const StaffLoan = app.use("/StaffLoan", payrollSetup, StaffLoanRouter)
export const ApprovalHistory = app.use("/ApprovalHistory", crudGuard({ list: "Workflow Config", add: "Workflow Config" }), ApprovalHistoryRouter)
export const EBFBalance = app.use("/EBFBalance", crudGuard({ list: "List Payroll", add: "Edit Payroll", edit: "Edit Payroll" }), EBFBalanceRouter)
export const EBFOpening = app.use("/EBFOpeningBalance", payrollSetup, EBFOpeningRouter)
const employeeSubAccountRead = [
    PERMISSIONS.TRANSACTION.HR_PAYROLL.PAYROLL.LIST,
    PERMISSIONS.TRANSACTION.HR_PAYROLL.PAYROLL.VIEW,
    PERMISSIONS.TRANSACTION.VOUCHER.BANK_BOOK.PAYMENT.ADD,
    PERMISSIONS.TRANSACTION.VOUCHER.BANK_BOOK.PAYMENT.EDIT,
    PERMISSIONS.TRANSACTION.VOUCHER.BANK_BOOK.PAYMENT.VIEW,
    PERMISSIONS.TRANSACTION.VOUCHER.BANK_BOOK.PAYMENT.LIST,
    PERMISSIONS.TRANSACTION.VOUCHER.CASH_BOOK.PAYMENT.ADD,
    PERMISSIONS.TRANSACTION.VOUCHER.CASH_BOOK.PAYMENT.EDIT,
    PERMISSIONS.TRANSACTION.VOUCHER.CASH_BOOK.PAYMENT.VIEW,
    PERMISSIONS.TRANSACTION.VOUCHER.CASH_BOOK.PAYMENT.LIST,
    PERMISSIONS.TRANSACTION.VOUCHER.JOURNAL_VOUCHER.ADD,
    PERMISSIONS.TRANSACTION.VOUCHER.JOURNAL_VOUCHER.EDIT,
    PERMISSIONS.TRANSACTION.VOUCHER.JOURNAL_VOUCHER.VIEW,
    PERMISSIONS.TRANSACTION.VOUCHER.JOURNAL_VOUCHER.LIST,
];
const employeeSubAccountGuard = crudGuard({ list: "List Payroll", read: employeeSubAccountRead });
export const EmployeeEBFAccount = app.use("/EmployeeEBFAccount", employeeSubAccountGuard, EmployeeEBFAccountRouter)
export const EmployeeAdvanceAccount = app.use("/EmployeeAdvanceAccount", employeeSubAccountGuard, EmployeeAdvanceAccountRouter)
export const EmployeeLoanAccount = app.use("/EmployeeLoanAccount", employeeSubAccountGuard, EmployeeLoanAccountRouter)
export const EmployeeBadDebtAccount = app.use("/EmployeeBadDebtAccount", employeeSubAccountGuard, EmployeeBadDebtAccountRouter)
export const LoanOpening = app.use("/LoanOpeningBalance", payrollSetup, LoanOpeningRouter)
export const Ledger = app.use("/Ledger", crudGuard({ list: "View Payroll" }), LedgerRouter)
