// permissions.js

const PERMISSION_ALIASES = {
  "Add ChqBook": "Add Cheque Book",
  "Edit ChqBook": "Edit Cheque Book",
  "Delete ChqBook": "Delete Cheque Book",
  "List ChqBook": "List Cheque Book",
  "View ChqBook": "View Cheque Book",
  "BounceChq": "Bounce Cheque",
  "Add CustomerChq": "Add Customer Cheque",
  "Delete CustomerChq": "Delete Customer Cheque",
  "List CustomerChq": "List Customer Cheque",
  "View CustomerChq": "View Customer Cheque",
  "AddPriceListBulk": "Add Price List Bulk",
  "Add Stock Repalcement": "Add Stock Replacement",
  "Add Stock Repalcement Bulk": "Add Stock Replacement Bulk",
  "Edit Stock Repalcement": "Edit Stock Replacement",
  "Delete Stock Repalcement": "Delete Stock Replacement",
  "List Stock Repalcement": "List Stock Replacement",
  "View Stock Repalcement": "View Stock Replacement",
  "Post Stock Repalcement": "Post Stock Replacement",
  "UnPost Stock Repalcement": "UnPost Stock Replacement",
  "OrderBooker List": "Order Booker List",
  "Add OrderBooker": "Add Distributor Order Booker",
  "Edit OrderBooker": "Edit Distributor Order Booker",
  "Bulk Add OrderBooker": "Bulk Add Order Booker",
  "Recived TransferIn": "Received Transfer In",
  "Trail Balances": "Trial Balances",
  "Chq Transiction Report": "Cheque Transaction Report",
  "Payment Recipt Edit": "Edit Payment Receipt",
  "FIXEDASSETEDIT": "FIXED ASSET EDIT",
};

export const canonicalPermission = (name) => PERMISSION_ALIASES[name] || name;

export const isFullAccessUser = (user) =>
  String(user?.firstname || "").trim().toLowerCase() === "admin";

export const hasPermission = (rights, permission) => {
  if (!permission || !Array.isArray(rights)) return false;
  const wanted = canonicalPermission(String(permission).trim());
  return rights.some((item) => typeof item === "string" && canonicalPermission(item.trim()) === wanted);
};

export const PERMISSIONS = {
  ADMINISTRATION: {
    ADMINISTRATIVE: "Administrative",
    COSTING: "Costing",
    Account_Transfer: "Account Transfer",
  },

  SETUP: {
    USER_SETUP: {
     
      LOCATION: {
        ADD: "Add Location",
        EDIT: "Edit Location",
        DELETE: "Delete Location",
        LIST: "List Location",
      },
      STORE: {
        ADD: "Add Store",
        EDIT: "Edit Store",
        DELETE: "Delete Store",
        LIST: "List Store",
      },
    },

    ACCOUNTS_SETUP: {
      CHART_OF_ACCOUNTS: {
        ADD: "Add Chart of Accounts",
        EDIT: "Edit Chart of Accounts",
        DELETE: "Delete Chart of Accounts",
        LIST: "List Chart of Accounts",
        TREE_VIEW: "Chart of Accounts Tree View",
      },
      FIXED_ASSET :{
      LIST : "FIXED ASSET LIST",
      ADD : "FIXED ASSET ADD",
      EDIT : "FIXED ASSET EDIT",
      VIEW : "FIXED ASSET VIEW",
      },
      CHQBOOK: {
        ADD: "Add Cheque Book",
        EDIT: "Edit Cheque Book",
        DELETE: "Delete Cheque Book",
        LIST: "List Cheque Book",
        VIEW: "View Cheque Book",
        BOUNCE: "Bounce Cheque",
      },
      CUSTOMER_CHQ: {
        ADD: "Add Customer Cheque",
        DELETE: "Delete Customer Cheque",
        LIST: "List Customer Cheque",
        VIEW: "View Customer Cheque",
        CHANGE_STATUS: "ChangeStatus",
      },
    },

    PRODUCT_SETUP: {
      VENDOR: {
        ADD: "Add Vendor",
        ADD_BULK: "AddVendorinBulk",
        EDIT: "Edit Vendor",
        DELETE: "Delete Vendor",
        LIST: "List Vendor",
      },
      PRICELIST: {
        ADD: "Add Price List",
        ADD_BULK: "Add Price List Bulk",
        EDIT: "Edit Price List",
        VIEW: "View Price List",
        DELETE: "Delete Price List",
        LIST: "List Price List",
      },
      SLAB: {
        ADD: "Add Slab",
        EDIT: "Edit Slab",
        VIEW: "View Slab",
        DELETE: "Delete Slab",
        LIST: "List Slab",
      },
      CATEGORY: {
        ADD: "Add Category",
        ADD_BULK: "AddCategoryinBulk",
        EDIT: "Edit Category",
        DELETE: "Delete Category",
        LIST: "List Category",
      },
      BRAND: {
        ADD: "Add Brand",
        ADD_BULK: "AddBrandinBulk",
        EDIT: "Edit Brand",
        DELETE: "Delete Brand",
        LIST: "List Brand",
      },
      MASTER_SKU: {
        ADD: "Add MasterSku",
        ADD_BULK: "AddMasterSkuinBulk",
        EDIT: "Edit MasterSku",
        DELETE: "Delete MasterSku",
        LIST: "List MasterSku",
      },
      SKU: {
        ADD: "Add SKU",
        EDIT: "Edit SKU",
        DELETE: "Delete SKU",
        LIST: "List SKU",
      },
    },

    CUSTOMER_SETUP: {
      CUSTOMER: {
        ADD: "Add Customer",
        ADD_BULK: "Add Customer In Bulk",
        EDIT: "Edit Customer",
        DELETE: "Delete Customer",
        LIST: "List Customer",
      },
      LOCALITY: {
        ADD: "Add Locality",
        ADD_BULK: "Add Locality In Bulk",
        EDIT: "Edit Locality",
        DELETE: "Delete Locality",
        LIST: "List Locality",
      },
      TOWN: {
        ADD: "Add Town",
        ADD_BULK: "Add Town In Bulk",
        EDIT: "Edit Town",
        DELETE: "Delete Town",
        LIST: "List Town",
      },
      TERRITORY: {
        ADD: "Add Territory",
        ADD_BULK: "Add Territory In Bulk",
        EDIT: "Edit Territory",
        DELETE: "Delete Territory",
        LIST: "List Territory",
      },
      CHANNEL_TYPE: {
        ADD: "Add Channel Type",
        ADD_BULK: "Add Channel Type In Bulk",
        EDIT: "Edit Channel Type",
        DELETE: "Delete Channel Type",
        LIST: "List Channel Type",
      },
      CHANNEL: {
        ADD: "Add Channel",
        ADD_BULK: "Add Channel In Bulk",
        EDIT: "Edit Channel",
        DELETE: "Delete Channel",
        LIST: "List Channel",
      },
      SUB_CHANNEL: {
        ADD: "Add Sub Channel",
        ADD_BULK: "Add Sub Channel In Bulk",
        EDIT: "Edit Sub Channel",
        DELETE: "Delete Sub Channel",
        LIST: "List Sub Channel",
      },
      ORDER_BOOKER: {
        ADD: "Add Order Booker",
        EDIT: "Edit Order Booker",
        DELETE: "Delete Order Booker",
        LIST: "List Order Booker",
      },
    },

    HR_SETUP: {
      DEPARTMENT: {
        ADD: "Add Department",
        EDIT: "Edit Department",
        DELETE: "Delete Department",
        LIST: "List Department",
      },
      DESIGNATION: {
        ADD: "Add Designation",
        EDIT: "Edit Designation",
        DELETE: "Delete Designation",
        LIST: "List Designation",
      },
      EMPLOYEE: {
        ADD: "Add HR Employee",
        ADD_BULK: "Add HR Employee Bulk",
        EDIT: "Edit HR Employee",
        DELETE: "Delete HR Employee",
        LIST: "List HR Employee",
      },
      ALLOWANCE_TYPE: {
        ADD: "Add Allowance Type",
        EDIT: "Edit Allowance Type",
        DELETE: "Delete Allowance Type",
        LIST: "List Allowance Type",
      },
      DEDUCTION_TYPE: {
        ADD: "Add Deduction Type",
        EDIT: "Edit Deduction Type",
        DELETE: "Delete Deduction Type",
        LIST: "List Deduction Type",
      },
      COMPANY_POLICY: {
        VIEW: "View Company Policy",
        EDIT: "Edit Company Policy",
      },
      HOLIDAY_CALENDAR: {
        ADD: "Add Holiday",
        EDIT: "Edit Holiday",
        DELETE: "Delete Holiday",
        LIST: "List Holiday",
      },
      LEAVE_TYPE: {
        ADD: "Add Leave Type",
        EDIT: "Edit Leave Type",
        DELETE: "Delete Leave Type",
        LIST: "List Leave Type",
      },
    },

    OPENING_SETUP: {
      INVENTORY_OPENING: {
        ADD: "Add Opening Inventory",
        ADD_BULK: "Add in Bulk Opening Inventory",
        EDIT: "Edit Opening Inventory",
        DELETE: "Delete Opening Inventory",
        LIST: "List Opening Inventory",
      },
      CLIENT_OPENING: {
        ADD: "Add Client Opening",
        ADD_BULK: "Add in Bulk Client Opening",
        EDIT: "Edit Client Opening",
        DELETE: "Delete Client Opening",
        LIST: "List Client Opening",
      },
      VENDOR_OPENING: {
        ADD: "Add Vendor Opening",
        ADD_BULK: "Add in Bulk Vendor Opening",
        EDIT: "Edit Vendor Opening",
        DELETE: "Delete Vendor Opening",
        LIST: "List Vendor Opening",
      },
      ACCOUNT_OPENING: {
        ADD: "Add Account Opening",
        ADD_BULK: "Add in Bulk Account Opening",
        EDIT: "Edit Account Opening",
        DELETE: "Delete Account Opening",
        LIST: "List Account Opening",
      },
      INVOICE_OPENING: {
        ADD: "Add invoice Opening",
        ADD_BULK: "Add in Bulk invoice Opening",
        EDIT: "Edit invoice Opening",
        DELETE: "Delete invoice Opening",
        LIST: "List invoice Opening",
      },
      FIXED_ASSET: {
        ADD: "Add Fixed Asset",
        EDIT: "Edit Fixed Asset",
        DELETE: "Delete Fixed Asset",
        LIST: "List Fixed Asset",
        VIEW: "View Fixed Asset",
      },
    },
  },

  DISTRIBUTOR: {
    CUSTOMERS: {
      ZONE: {
        LIST: "Zone List",
        ADD: "Add Zone",
        ADD_BULK: "Add Zone Bulk",
        EDIT: "Edit Zone",
      },
      REGION: {
        LIST: "Region List",
        ADD: "Add Region",
        ADD_BULK: "Add Region Bulk",
        EDIT: "Edit Region",
      },
      CITY: {
        LIST: "City List",
        ADD: "Add City",
        ADD_BULK: "Add City Bulk",
        EDIT: "Edit City",
      },
      GROUP: {
        LIST: "Group List",
        ADD: "Add Group",
        EDIT: "Edit Group",
      },
      ORDER_BOOKER: {
        LIST: "Order Booker List",
        ADD: "Add Distributor Order Booker",
        EDIT: "Edit Distributor Order Booker",
        ADD_BULK: "Bulk Add Order Booker",
      },
      ZSM: {
        LIST: "ZSM List",
        ADD: "Add ZSM",
        EDIT: "Edit ZSM",
        DELETE: "Delete ZSM",
      },
      TRANSPORT: {
        LIST: "Transport List",
        ADD: "Add Transport",
      },
      DISTRIBUTOR_CUSTOMER: {
        LIST: "Distributor List",
        ADD: "Add Distributor",
        VIEW: "View Distributor",
        EDIT: "Edit Distributor",
      },
    },

    SALE_ORDER: {
      ADD: "Distributor SaleOrder Add",
      ADD_BULK: "Distributor SaleOrder Bulk Add",
      LIST: "Distributor SaleOrder List",
      VIEW: "Distributor SaleOrder View",
      EDIT: "Distributor Sale Order Edit",
    },

    RC_LIST: {
      ADD: "Add Distributor RC",
      LIST: "Distributor RC List",
      VIEW: "View Distributor RC",
    },

    DELIVERY_CHALLAN: {
      ADD: "Add Order DC",
      LIST: "Order DC List",
      EDIT: "Edit Order DC",
      VIEW: "View Order DC",
    },

    INVOICE: {
      ADD: "Add Distributor Invoice",
      LIST: "Distributor Invoice List",
      VIEW: "View Distributor Invoice",
    },

    PAYMENT_RECEIPT: {
      ADD: "Add Payment Receipt",
      LIST: "Payment Receipt List",
      VIEW: "View Payment Receipt",
      REALIZE: "Realize Payment",
      EDIT: "Edit Payment Receipt",
    },

    KNOCKOFF: "Knockoff",
    ORDER_MANAGEMENT: "Order Management",
  },

  TRANSACTION: {
    INVENTORY: {
      PURCHASE: {
        ADD: "Add Purchase",
        ADD_BULK: "Add Purchase Bulk",
        EDIT: "Edit Purchase",
        DELETE: "Delete Purchase",
        LIST: "List Purchase",
        VIEW: "View Purchase",
        POST: "Post Purchase",
        UNPOST: "UnPost Purchase",
      },
      PURCHASE_RETURN: {
        ADD: "Add PurchaseReturn",
        ADD_BULK: "Add PurchaseReturn Bulk",
        EDIT: "Edit PurchaseReturn",
        DELETE: "Delete PurchaseReturn",
        LIST: "List PurchaseReturn",
        VIEW: "View PurchaseReturn",
        POST: "Post PurchaseReturn",
        UNPOST: "UnPost PurchaseReturn",
      },
      SALES: {
        ADD: "Add Sales",
        ADD_BULK: "Add Sales Bulk",
        EDIT: "Edit Sales",
        AddRemaks: "Add Remarks",
        DELETE: "Delete Sales",
        LIST: "List Sales",
        VIEW: "View Sales",
        POST: "Post Sales",
        UNPOST: "UnPost Sales",
        SalesInvoiceRealize : "Sales Invoice Realize"
      },
      SALES_RETURN: {
        ADD: "Add SalesReturn",
        ADD_BULK: "Add SalesReturn Bulk",
        EDIT: "Edit SalesReturn",
        DELETE: "Delete SalesReturn",
        LIST: "List SalesReturn",
        VIEW: "View SalesReturn",
        POST: "Post SalesReturn",
        UNPOST: "UnPost SalesReturn",
      },
      TRANSFER_OUT: {
        ADD: "Add TransferOut",
        ADD_BULK: "Add TransferOut Bulk",
        EDIT: "Edit TransferOut",
        DELETE: "Delete TransferOut",
        LIST: "List TransferOut",
        VIEW: "View TransferOut",
        POST: "Post TransferOut",
        UNPOST: "UnPost TransferOut",
      },
      TRANSFER_IN: {
        ADD_BULK: "Add TransferIn Bulk",
        EDIT: "Edit TransferIn",
        DELETE: "Delete TransferIn",
        LIST: "List TransferIn",
        VIEW: "View TransferIn",
        RECEIVED: "Received Transfer In",
      },
      STOCK_REPLACEMENT: {
        ADD: "Add Stock Replacement",
        ADD_BULK: "Add Stock Replacement Bulk",
        EDIT: "Edit Stock Replacement",
        DELETE: "Delete Stock Replacement",
        LIST: "List Stock Replacement",
        VIEW: "View Stock Replacement",
        POST: "Post Stock Replacement",
        UNPOST: "UnPost Stock Replacement",
      },
      STOCK_ADJUSTMENT: {
        ADD: "Add Stock Adjustment",
        EDIT: "Edit Stock Adjustment",
        DELETE: "Delete Stock Adjustment",
        LIST: "List Stock Adjustment",
        VIEW: "View Stock Adjustment",
        POST: "Post Stock Adjustment",
        UNPOST: "UnPost Stock Adjustment",
      },
    },

    HR_PAYROLL: {
      ATTENDANCE: {
        ADD: "Add HR Attendance",
        EDIT: "Edit HR Attendance",
        LIST: "List HR Attendance",
      },
      LEAVE: {
        APPLY: "Apply Leave",
        APPROVE: "Approve Leave",
        LIST: "List Leave Application",
      },
      PAYROLL: {
        GENERATE: "Generate Payroll",
        LIST: "List Payroll",
        EDIT: "Edit Payroll",
        VIEW: "View Payroll",
      },
      RECRUITMENT: {
        VIEW: "View Recruitment",
        MANAGE: "Manage Recruitment",
      },
      LEAVE_MANAGEMENT: {
        VIEW: "View Leave Management",
        MANAGE: "Manage Leave",
      },
      PERFORMANCE: {
        VIEW: "View Performance",
        MANAGE: "Manage Performance",
      },
      LMS: {
        VIEW: "View LMS",
        MANAGE: "Manage LMS",
      },
      ATTENDANCE_ADVANCED: {
        VIEW: "View Advanced Attendance",
        MANAGE: "Manage Advanced Attendance",
      },
      SEPARATION: {
        VIEW: "View Separation",
        MANAGE: "Manage Separation",
      },
      HR_DASHBOARD: {
        VIEW: "View HR Dashboard",
      },
      DOCUMENT_VAULT: {
        VIEW: "View Document Vault",
        MANAGE: "Manage Document Vault",
      },
      GRIEVANCE: {
        VIEW: "View Grievance",
        MANAGE: "Manage Grievance",
      },
      ESS: {
        VIEW: "View ESS Portal",
      },
    },

    VOUCHER: {
      CASH_BOOK: {
        RECEIPT: {
          ADD: "Add Cash Receipt",
          EDIT: "Edit Cash Receipt",
          DELETE: "Delete Cash Receipt",
          VIEW: "View Cash Receipt",
          POST: "Post Cash Receipt",
          UNPOST: "UnPost Cash Receipt",
          LIST: "List Cash Receipt Voucher",
        },
        PAYMENT: {
          ADD: "Add Cash Payment",
          EDIT: "Edit Cash Payment",
          DELETE: "Delete Cash Payment",
          VIEW: "View Cash Payment",
          POST: "Post Cash Payment",
          UNPOST: "UnPost Cash Payment",
          LIST: "List Cash Payment Voucher",
        },
      },
      BANK_BOOK: {
        RECEIPT: {
          ADD: "Add Bank Receipt",
          EDIT: "Edit Bank Receipt",
          DELETE: "Delete Bank Receipt",
          VIEW: "View Bank Receipt",
          POST: "Post Bank Receipt",
          UNPOST: "UnPost Bank Receipt",
          LIST: "List Bank Receipt Voucher",
        },
        PAYMENT: {
          ADD: "Add Bank Payment",
          EDIT: "Edit Bank Payment",
          DELETE: "Delete Bank Payment",
          VIEW: "View Bank Payment",
          POST: "Post Bank Payment",
          UNPOST: "UnPost Bank Payment",
          LIST: "List Bank Payment Voucher",
        },
      },
      JOURNAL_VOUCHER: {
        ADD: "Add Journal Voucher",
        EDIT: "Edit Journal Voucher",
        DELETE: "Delete Journal Voucher",
        LIST: "List Journal Voucher",
        VIEW: "View Journal Voucher",
        POST: "Post Journal Voucher",
        UNPOST: "UnPost Journal Voucher",
      },
    },
  },

  REPORTS: {
    INVENTORY: {
      ALL_STOCK: "All Stock",
      STOCK_FLOW: "Stock Flow Report",
      VALUATION: "Inventory Valuation",
      VALUATION_SUMMARY: "Inventory Valuation Summary",
    },
    SALES: {
      INVOICE_AGING: "Invoice Aging",
      INVOICE_PAYMENT_AGING: "Invoice Payment Aging",
      CLIENT_AGING_LEDGER: "Client Aging Ledger",
      VOUCHER_INVOICE_REF: "Voucher Invoice Ref Report",
      SALES_SUMMARY: "Sales Invoice Summary",
      CLIENT_LEDGER: "Client Ledger",
      DAILY_SALES: "Daily Sales Report",
      SALES_DUMP: "Sales Dump Data",
      SALES_DUMP_WITH_COST: "Sales Dump Data With Cost",
    },
    ACCOUNTS: {
      GENERAL_LEDGER: "General Ledger",
      INVESTMENT_REPORT_BETWEEN: "Investment Report Between",
      EMPLOYEE_LEDGER: "Employee Ledger",
      TAX_REPORT: "Tax Report",
      TRAIL_BALANCES: "Trial Balances",
      PERIOD_ACTIVITY: "Period Activity Report",
      PERIOD_EXPENSE_AND_REVENUE: "Period Expense And Revenue Report",
      ACCOUNT_SUMMARY_REPORT: "Account Summary Report",
      ACCOUNT_ACTIVITY_REPORT: "Account Activity Report",
    },
    PURCHASES: {
      PURCHASE_REPORT: "Purchase Report",
    },
    STORE_LEDGER: {
      STORE_LEDGER: "Store Ledger",
    },
    CHQ_TRANSACTION: "Cheque Transaction Report",
    KNOCKOFF: "Knockoff Report",
    SUNDRY_DEBTOR: "Sundry Debtor Balance",
    DC_REPORT: "DC Report",
    ORDER_BOOKER_ACHIEVEMENT: "Order Booker Achievement",
    BOOKER_LEDGER: "Booker Wise Ledger",
    PAYMENT_REALIZE: "Payment Realize Report",
    TRANSPORTER_LEDGER: "Transporter Ledger",
    VENDOR_WISE_LEDGER: "Vendor Wise Client Ledger",
    Booker_Wise_Invoice: "Booker Wise Invoice",
    Visit_Report: "Visit Report",
    Booker_Attendance: "Booker Attendance",
    Booker_AttendanceReport: "Booker Wise AttendanceReport",
    Cash_Book: "Cash Book",
    HR: {
      PAYSLIP: "Payslip Report",
      ATTENDANCE: "HR Attendance Report",
      PAYROLL_SUMMARY: "Payroll Summary",
      LEAVE: "Leave Report",
    },
    ORDER_BOOKER_TARGET: {
      LIST: "List Order Booker Target",
      ADD: "Add Order Booker Target",
      ADD_BULK: "Add Order Booker Target Bulk",
    },
    WORKFLOW_CONFIG: "Workflow Config",
    RECONCILIATION: "Reconciliation",
  },
};