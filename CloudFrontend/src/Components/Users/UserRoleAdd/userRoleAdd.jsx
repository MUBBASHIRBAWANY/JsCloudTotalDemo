import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import { toast, ToastContainer } from "react-toastify";
import { updateDate } from "../../Global/getDate";
import { createDataFunction } from '../../../Api/CRUDFunctions';
import { useNavigate } from "react-router-dom";

const TreeNode = ({ node, onCheck, expandedNodes, toggleNode, selectedRoles }) => {
  const isExpanded = expandedNodes.includes(node.id);
  const isLeafChecked = !node.children && selectedRoles?.includes(node.label);

  return (
    <div className="ml-4">
      {node.children ? (
        <div>
          <button
            type="button"
            onClick={() => toggleNode(node.id)}
            className="flex items-center mb-1"
          >
            <span className="mr-2">{isExpanded ? "-" : "+"}</span>
            <span className="font-semibold">{node.label}</span>
          </button>
          {isExpanded && (
            <div className="ml-6 border-l pl-4">
              {node.children.map((child) => (
                <TreeNode
                  key={child.id}
                  node={child}
                  onCheck={onCheck}
                  expandedNodes={expandedNodes}
                  toggleNode={toggleNode}
                  selectedRoles={selectedRoles}
                  hecked={isLeafChecked}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <label className="flex items-center space-x-2 mb-1">
          <input
            type="checkbox"
            checked={isLeafChecked}
            onChange={(e) => onCheck(node.label, e.target.checked)}
            className="form-checkbox h-4 w-4 text-primary"
          />
          <span>{node.label}</span>
        </label>
      )}
    </div>
  );
};




export default function UserRoleAddTree() {
  const { register, handleSubmit } = useForm();
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState([]);
  const loginuser = useSelector((state) => state.LoginerReducer.userDetail);
  const UserRihts = useSelector((state) => state.UsersRights.UserRights);
  const pageName = "Add User Role";
  const navigate = useNavigate();

  const checkAcess = async () => {
    const allowAcess = await UserRihts.find((item) => item == pageName);
    if (!allowAcess) {
      navigate("/");
    }
  };

  useEffect(() => {
    //checkAcess();
  }, []);

  const handleCheck = (label, checked) => {
    setSelectedRoles((prev) =>
      checked ? [...prev, label] : prev.filter((item) => item !== label)
    );
  };



  const treeData = [
    {
      id: "Administration",
      label: "Administration",
      children: [
        { id: "Administrative", label: "  Administrative" },
        { id: "Costing", label: "Costing" },
      ]
    },
    {
      id: "setup",
      label: "Setup",
      children: [
        {
          id: "userSetup",
          label: "User Setup",
          children: [
            {
              id: "userRole",
              label: "User Role",
              children: [
                { id: "AddUserRole", label: "Add User Role" },
                { id: "editUserRole", label: "Edit User Role" },
                { id: "DeleteUserRole", label: "Delete User Role" },
                { id: "ListUserRole", label: "List User Role" }
              ]
            },
            {
              id: "Location",
              label: "Location",
              children: [
                { id: "AddLocation", label: "Add Location" },
                { id: "editLocation", label: "Edit Location" },
                { id: "DeleteLocation", label: "Delete Location" },
                { id: "ListLocation", label: "List Location" }
              ]
            },
            {
              id: "Store",
              label: "Store",
              children: [
                { id: "AddStore", label: "Add Store" },
                { id: "editStore", label: "Edit Store" },
                { id: "DeleteStore", label: "Delete Store" },
                { id: "ListStore", label: "List Store" }
              ]
            }
          ]
        },
        {
          id: "AccountsSetup",
          label: "Accounts Setup",
          children: [
            {
              id: "ChartAccounts",
              label: "Chart of Accounts",
              children: [
                { id: "AddChart", label: "Add Chart of Accounts" },
                { id: "editChart", label: "Edit Chart of Accounts" },
                { id: "DeleteChart", label: "Delete Chart of Accounts" },
                { id: "ListChart", label: "List Chart of Accounts" },
                { id: "ChartTree", label: "Chart of Accounts Tree View" }
              ]
            },
            {
              id: "ChqBook",
              label: "Cheque Book",
              children: [
                { id: "AddChqBook", label: "Add Cheque Book" },
                { id: "editChqBook", label: "Edit Cheque Book" },
                { id: "DeleteChqBook", label: "Delete Cheque Book" },
                { id: "ListChqBook", label: "List Cheque Book" },
                { id: "ViewChqBook", label: "View Cheque Book" },
                { id: "BounceChq", label: "Bounce Cheque" },
              ]
            },
            {
              id: "CustomerChqRcvd",
              label: "Customer Cheque",
              children: [
                { id: "AddCustomerChq", label: "Add Customer Cheque" },
                { id: "DeleteCustomerChq", label: "Delete Customer Cheque" },
                { id: "ListCustomerChq", label: "List Customer Cheque" },
                { id: "ViewCustomerChq", label: "View Customer Cheque" },
                { id: "ChangeStatus", label: "ChangeStatus" },
              ]
            }
          ]
        },
        {
          id: "ProductSetup",
          label: "Product Setup",
          children: [
            {
              id: "Vendor",
              label: "Vendor",
              children: [
                { id: "AddVendor", label: "Add Vendor" },
                { id: "AddVendorinBUlk", label: "AddVendorinBulk" },
                { id: "editVendor", label: "Edit Vendor" },
                { id: "DeleteVendor", label: "Delete Vendor" },
                { id: "ListVendor", label: "List Vendor" }
              ]
            },
            {
              id: "Category",
              label: "Category",
              children: [
                { id: "AddCategory", label: "Add Category" },
                { id: "AddCategoryinBUlk", label: "AddCategoryinBulk" },
                { id: "editCategory", label: "Edit Category" },
                { id: "DeleteCategory", label: "Delete Category" },
                { id: "ListCategory", label: "List Category" }
              ]
            },
            {
              id: "Brand",
              label: "Brand",
              children: [
                { id: "AddBrand", label: "Add Brand" },
                { id: "AddBrandinBUlk", label: "AddBrandinBulk" },
                { id: "editBrand", label: "Edit Brand" },
                { id: "DeleteBrand", label: "Delete Brand" },
                { id: "ListBrand", label: "List Brand" }
              ]
            },
            {
              id: "MasterSku",
              label: "MasterSku",
              children: [
                { id: "AddMasterSku", label: "Add MasterSku" },
                { id: "AddMasterSkuinBUlk", label: "AddMasterSkuinBulk" },
                { id: "editMasterSku", label: "Edit MasterSku" },
                { id: "DeleteMasterSku", label: "Delete MasterSku" },
                { id: "ListMasterSku", label: "List MasterSku" }
              ]
            },
            {
              id: "SKU",
              label: "SKU",
              children: [
                { id: "AddSKU", label: "Add SKU" },
                { id: "editSKU", label: "Edit SKU" },
                { id: "DeleteSKU", label: "Delete SKU" },
                { id: "ListSKU", label: "List SKU" }
              ]
            }

          ]
        },
        {
          id: "CustomerSetup",
          label: "Customer Setup",
          children: [
            {
              id: "Customer",
              label: "Customer",
              children: [
                { id: "AddCustomer", label: "Add Customer" },
                { id: "AddCustomerInBulk", label: "Add Customer In Bulk" },
                { id: "editCustomer", label: "Edit Customer" },
                { id: "DeleteCustomer", label: "Delete Customer" },
                { id: "ListCustomer", label: "List Customer" }
              ]
            },
            {
              id: "Locality",
              label: "Locality",
              children: [
                { id: "AddLocality", label: "Add Locality" },
                { id: "AddLocalityInBulk", label: "Add Locality In Bulk" },
                { id: "editLocality", label: "Edit Locality" },
                { id: "DeleteLocality", label: "Delete Locality" },
                { id: "ListLocality", label: "List Locality" }
              ]
            },
            {
              id: "Town",
              label: "Town",
              children: [
                { id: "AddTown", label: "Add Town" },
                { id: "AddTownInBulk", label: "Add Town In Bulk" },
                { id: "editTown", label: "Edit Town" },
                { id: "DeleteTown", label: "Delete Town" },
                { id: "ListTown", label: "List Town" }
              ]
            },
            {
              id: "Territory",
              label: "Territory",
              children: [
                { id: "AddTerritory", label: "Add Territory" },
                { id: "AddTerritoryInBulk", label: "Add Territory In Bulk" },
                { id: "editTerritory", label: "Edit Territory" },
                { id: "DeleteTerritory", label: "Delete Territory" },
                { id: "ListTerritory", label: "List Territory" }
              ]
            },
            {
              id: "ChannelType",
              label: "Channel Type",
              children: [
                { id: "AddChannelType", label: "Add Channel Type" },
                { id: "AddChannelTypeInBulk", label: "Add Channel Type In Bulk" },
                { id: "editChannelType", label: "Edit Channel Type" },
                { id: "DeleteChannelType", label: "Delete Channel Type" },
                { id: "ListChannelType", label: "List Channel Type" }
              ]
            },
            {
              id: "Channel",
              label: "Channel",
              children: [
                { id: "AddChannel", label: "Add Channel" },
                { id: "AddChannelInBulk", label: "Add Channel In Bulk" },
                { id: "editChannel", label: "Edit Channel" },
                { id: "DeleteChannel", label: "Delete Channel" },
                { id: "ListChannel", label: "List Channel" }
              ]
            },
            {
              id: "SubChannel",
              label: "Sub Channel",
              children: [
                { id: "AddSubChannel", label: "Add Sub Channel" },
                { id: "AddSubChannelInBulk", label: "Add Sub Channel In Bulk" },
                { id: "editSubChannel", label: "Edit Sub Channel" },
                { id: "DeleteSubChannel", label: "Delete Sub Channel" },
                { id: "ListSubChannel", label: "List Sub Channel" }
              ]
            },
            {
              id: "Order Booker",
              label: "Order Booker",
              children: [
                { id: "AddOrder Booker", label: "Add Order Booker" },
                { id: "editOrder Booker", label: "Edit Order Booker" },
                { id: "DeleteOrder Booker", label: "Delete Order Booker" },
                { id: "ListOrder Booker", label: "List Order Booker" }
              ]
            },
          ]
        },
        {
          id: "Opening Balance",
          label: "Opening Setup",
          children: [
            {
              id: "InvetoryOpening",
              label: "InvetoryOpening",
              children: [
                { id: "AddOpeningInventory", label: "Add Opening Inventory" },
                { id: "AddinBulkOpeningInventory", label: "Add in Bulk Opening Inventory" },
                { id: "editOpeningInventory", label: "Edit Opening Inventory" },
                { id: "DeleteOpeningInventory", label: "Delete Opening Inventory" },
                { id: "ListOpeningInventory", label: "List Opening Inventory" }
              ]
            },
            {
              id: "Client Opening",
              label: "Client Opening",
              children: [
                { id: "AddClientOpening", label: "Add Client Opening" },
                { id: "AddClientOpeningInBulk", label: "Add in Bulk Client Opening" },
                { id: "editClientOpening", label: "Edit Client Opening" },
                { id: "DeleteClientOpening", label: "Delete Client Opening" },
                { id: "ListClientOpening", label: "List Client Opening " }
              ]
            },
            {
              id: "Vendor Opening",
              label: "Vendor Opening",
              children: [
                { id: "AddVendorOpening", label: "Add Vendor Opening" },
                { id: "AddVendorOpeningInBulk", label: "Add in Bulk Vendor Opening" },
                { id: "editVendorOpening", label: "Edit Vendor Opening" },
                { id: "DeleteVendorOpening", label: "Delete Vendor Opening" },
                { id: "ListVendorOpening", label: "List Vendor Opening " }
              ]
            },
            {
              id: "Account Opening",
              label: "Account Opening",
              children: [
                { id: "AddAccountOpening", label: "Add Account Opening" },
                { id: "AddAccountOpeningInBulk", label: "Add in Bulk Account Opening" },
                { id: "editAccountOpening", label: "Edit Account Opening" },
                { id: "DeleteAccountOpening", label: "Delete Account Opening" },
                { id: "ListAccountOpening", label: "List Account Opening " }
              ]
            },
            {
              id: "invoice Opening",
              label: "invoice Opening",
              children: [
                { id: "AddinvoiceOpening", label: "Add invoice Opening" },
                { id: "AddinvoiceOpeningInBulk", label: "Add in Bulk invoice Opening" },
                { id: "editinvoiceOpening", label: "Edit invoice Opening" },
                { id: "DeleteinvoiceOpening", label: "Delete invoice Opening" },
                { id: "ListinvoiceOpening", label: "List invoice Opening " }
              ]
            },


          ]
        },
      ]
    },
    {
      id: "Distributor",
      label: "Distributor",
      children: [
        {
          id: "Custumers Setup", label: "Customers Setup", children: [
            { id: "Zone", label: "Zone" },
            { id: "GroupList", label: "Group List" },
            { id: "RegionList", label: "Region List" },
            { id: "Citylist", label: "City list" },
            { id: "DistributorOrderBooker", label: "Distributor Order Booker" },
            { id: "Transport", label: "Transporter" },
            { id: "DistrbutorCustomers", label: "Distributor Customers" },
            { id: "ZSM", label: "ZSM" },
          ]
        },
        {
          id: "DistrbutorTransactions", label: "Transactions", children: [
            { id: "DistributorSaleOrder", label: "Distributor Sale Order" },
            { id: "DistributorSaleOrderAdd", label: "Distributor SaleOrder Add" },
            { id: "DistributorSaleOrderEdit", label: "Distributor Sale Order Edit" },
            { id: "DistributorSaleOrderView", label: "Distributor Sale Order View" },
            { id: "DitributorRcList", label: "Ditributor Rc List" },
            { id: "DitributorRcListViwe", label: "Ditributor Rc List View" },
            { id: "DitributorRcEdit", label: "Edit Distributor RC" },
            { id: "PostDistributorRC", label: "Post Distributor RC" },
            { id: "UnPostDistributorRC", label: "UnPost Distributor RC" },

          ]
        },
        {
          id: "Accounts Reports", label: "Accounts Reports", children: [
            { id: "GeneralLedger", label: "General Ledger" },
            { id: "InvestmentReportBetween", label: "Investment Report Between" },
            { id: "EmployeeLedgerReport", label: "Employee Ledger Report" },
            { id: "TaxReport", label: "Tax Report" },
            { id: "TrailBalances", label: "Trial Balances" },
          ]
        },


      ]

    },
    {
      id: "Transaction",
      label: "Transaction",
      children: [
        {
          id: "Inventory Transaction",
          label: "Inventory Transaction",
          children: [
            {
              id: "Purchase",
              label: "Purchase",
              children: [
                { id: "AddPurchase", label: "Add Purchase" },
                { id: "AddPurchaseBulk", label: "Add Purchase Bulk" },
                { id: "editPurchase", label: "Edit Purchase" },
                { id: "DeletePurchase", label: "Delete Purchase" },
                { id: "ListPurchase", label: "List Purchase" },
                { id: "ViewPurchase", label: "View Purchase" },
                { id: "PostPurchase", label: "Post Purchase" },
                { id: "UnPostPurchase", label: "UnPost Purchase" },
              ]
            },
            {
              id: "PurchaseReturn",
              label: "Purchase Return",
              children: [
                { id: "AddPurchaseReturn", label: "Add PurchaseReturn" },
                { id: "AddPurchaseReturnBulk", label: "Add PurchaseReturn Bulk" },
                { id: "editPurchaseReturn", label: "Edit PurchaseReturn" },
                { id: "DeletePurchaseReturn", label: "Delete PurchaseReturn" },
                { id: "ListPurchaseReturn", label: "List PurchaseReturn" },
                { id: "ViewPurchaseReturn", label: "View PurchaseReturn" },
                { id: "PostPurchaseReturn", label: "Post PurchaseReturn" },
                { id: "UnPostPurchaseReturn", label: "UnPost PurchaseReturn" },
              ]
            },
            {
              id: "Sales",
              label: "Sales",
              children: [
                { id: "AddSales", label: "Add Sales" },
                { id: "AddSalesBulk", label: "Add Sales Bulk" },
                { id: "editSales", label: "Edit Sales" },
                { id: "DeleteSales", label: "Delete Sales" },
                { id: "ListSales", label: "List Sales" },
                { id: "ViewSales", label: "View Sales" },
                { id: "PostSales", label: "Post Sales" },
                { id: "UnPostSales", label: "UnPost Sales" },
              ]
            },
            {
              id: "SalesReturn",
              label: "Sales Return",
              children: [
                { id: "AddSalesReturn", label: "Add SalesReturn" },
                { id: "AddSalesReturnBulk", label: "Add SalesReturn Bulk" },
                { id: "editSalesReturn", label: "Edit SalesReturn" },
                { id: "DeleteSalesReturn", label: "Delete SalesReturn" },
                { id: "ListSalesReturn", label: "List SalesReturn" },
                { id: "ViewSalesReturn", label: "View SalesReturn" },
                { id: "PostSalesReturn", label: "Post SalesReturn" },
                { id: "UnPostSalesReturn", label: "UnPost SalesReturn" },
              ]
            },

            {
              id: "TransferOut",
              label: "Transfer Out",
              children: [
                { id: "AddTransferOut", label: "Add TransferOut" },
                { id: "AddTransferOutBulk", label: "Add TransferOut Bulk" },
                { id: "editTransferOut", label: "Edit TransferOut" },
                { id: "DeleteTransferOut", label: "Delete TransferOut" },
                { id: "ListTransferOut", label: "List TransferOut" },
                { id: "ViewTransferOut", label: "View TransferOut" },
                { id: "PostTransferOut", label: "Post TransferOut" },
                { id: "UnPostTransferOut", label: "UnPost TransferOut" },
              ]
            },
            {
              id: "TransferIn",
              label: "Transfer In",
              children: [
                { id: "AddTransferInBulk", label: "Add TransferIn Bulk" },
                { id: "editTransferIn", label: "Edit TransferIn" },
                { id: "DeleteTransferIn", label: "Delete TransferIn" },
                { id: "ListTransferIn", label: "List TransferIn" },
                { id: "ViewTransferIn", label: "View TransferIn" },
                { id: "RecivedTransferIn", label: "Received Transfer In" },
              ]
            },
            {
              id: "StockRepalcement",
              label: "Stock Replacement",
              children: [
                { id: "AddStockRepalcement", label: "Add Stock Replacement" },
                { id: "AddStockRepalcementBulk", label: "Add Stock Replacement Bulk" },
                { id: "editStockRepalcement", label: "Edit Stock Replacement" },
                { id: "DeleteStockRepalcement", label: "Delete Stock Replacement" },
                { id: "ListStockRepalcement", label: "List Stock Replacement" },
                { id: "ViewStockRepalcement", label: "View Stock Replacement" },
                { id: "PostStockRepalcement", label: "Post Stock Replacement" },
                { id: "UnPostStockRepalcement", label: "UnPost Stock Replacement" },
              ]
            },
            {
              id: "StockAdjustment",
              label: "Stock Adjustment",
              children: [
                { id: "AddStockAdjustment", label: "Add Stock Adjustment" },
                { id: "EditStockAdjustment", label: "Edit Stock Adjustment" },
                { id: "DeleteStockAdjustment", label: "Delete Stock Adjustment" },
                { id: "ListStockAdjustment", label: "List Stock Adjustment" },
                { id: "ViewStockAdjustment", label: "View Stock Adjustment" },
                { id: "PostStockAdjustment", label: "Post Stock Adjustment" },
                { id: "UnPostStockAdjustment", label: "UnPost Stock Adjustment" },
              ]
            },
            {
              id: "PhysicalVsSystemStock",
              label: "Physical Stock vs System Stock",
              children: [
                { id: "AddPhysicalVsSystemStock", label: "Add Physical Stock vs System Stock" },
                { id: "EditPhysicalVsSystemStock", label: "Edit Physical Stock vs System Stock" },
                { id: "DeletePhysicalVsSystemStock", label: "Delete Physical Stock vs System Stock" },
                { id: "ListPhysicalVsSystemStock", label: "List Physical Stock vs System Stock" },
                { id: "ViewPhysicalVsSystemStock", label: "View Physical Stock vs System Stock" },
              ]
            },
          ]
        },
        {
          id: "Voucher Transaction",
          label: "Voucher Transaction",
          children: [
            {
              id: "CashBook",
              label: "CashBook",
              children: [
                {
                  id: "CashReceipt",
                  label: "Add Cash Receipt",
                  children: [
                    { id: "AddCashReceipt", label: "Add Cash Receipt" },
                    { id: "editCashReceipt", label: "Edit Cash Receipt" },
                    { id: "DeleteCashReceipt", label: "Delete Cash Receipt" },
                    { id: "ViewCashReceipt", label: "View Cash Receipt" },
                    { id: "PostCashReceipt", label: "Post Cash Receipt" },
                    { id: "UnPostCashReceipt", label: "UnPost Cash Receipt" },
                  ]
                },
                {
                  id: "CashPayment",
                  label: "Add Cash Payment",
                  children: [
                    { id: "AddCashPayment", label: "Add Cash Payment" },
                    { id: "editCashPayment", label: "Edit Cash Payment" },
                    { id: "DeleteCashPayment", label: "Delete Cash Payment" },
                    { id: "ViewCashPayment", label: "View Cash Payment" },
                    { id: "PostCashPayment", label: "Post Cash Payment" },
                    { id: "UnPostCashPayment", label: "UnPost Cash Payment" },
                  ]
                },
              ]
            },
            {
              id: "BankBook",
              label: "BankBook",
              children: [
                {
                  id: "BankReceipt",
                  label: "Add Bank Receipt",
                  children: [
                    { id: "AddBankReceipt", label: "Add Bank Receipt" },
                    { id: "editBankReceipt", label: "Edit Bank Receipt" },
                    { id: "DeleteBankReceipt", label: "Delete Bank Receipt" },
                    { id: "ViewBankReceipt", label: "View Bank Receipt" },
                    { id: "PostBankReceipt", label: "Post Bank Receipt" },
                    { id: "UnPostBankReceipt", label: "UnPost Bank Receipt" },
                  ]
                },
                {
                  id: "BankPayment",
                  label: "Add Bank Payment",
                  children: [
                    { id: "AddBankPayment", label: "Add Bank Payment" },
                    { id: "editBankPayment", label: "Edit Bank Payment" },
                    { id: "DeleteBankPayment", label: "Delete Bank Payment" },
                    { id: "ViewBankPayment", label: "View Bank Payment" },
                    { id: "PostBankPayment", label: "Post Bank Payment" },
                    { id: "UnPostBankPayment", label: "UnPost Bank Payment" },
                  ]
                },
              ]
            },
            {
              id: "JournalVoucher",
              label: "Journal Voucher",
              children: [
                { id: "AddJournalVoucher", label: "Add Journal Voucher" },
                { id: "editJournalVoucher", label: "Edit Journal Voucher" },
                { id: "DeleteJournalVoucher", label: "Delete Journal Voucher" },
                { id: "ListJournalVoucher", label: "List Journal Voucher" },
                { id: "ViewJournalVoucher", label: "View Journal Voucher" },
                { id: "PostJournalVoucher", label: "Post Journal Voucher" },
                { id: "UnPostJournalVoucher", label: "UnPost Journal Voucher" },
              ]
            },

          ]
        },

      ]

    },
    {
      id: "Reports",
      label: "Reports",
      children: [
        {
          id: "Inventory Reports", label: "Inventory Reports", children: [
            { id: "AllStock", label: "All Stock" },
            { id: "StockFlow", label: "Stock Flow Report" },
                { id: "DistributorStockFlow", label: "Distributor Stock Flow Report" },
            { id: "InventoryValuation", label: "Inventory Valuation" },
            { id: "InventoryValuation", label: "InventoryValuationSummary" },
          ]
        },
        {
          id: "Sales Reports", label: "Sales Reports", children: [
            { id: "InvoiceAging", label: "Invoice Aging" },
            { id: "InvoicePaymentAging", label: "Invoice Payment Aging" },
            { id: "ClientAgingLedger", label: "Client Aging Ledger" },
            { id: "VoucherInvoiceRefReport", label: "Voucher Invoice Ref Report" },
            { id: "SalesInvoiceSummary", label: "Sales Invoice Summary" },
            { id: "ClientLager", label: "Client Ledger" },
            { id: "StoreWiseClientLedgerDetail", label: "Store Wise Client Ledger Detail" },
            { id: "StoreWiseClientLedgerSummary", label: "Store Wise Client Ledger Summary" },
            { id: "DailySalesReport", label: "Daily Sales Report" },
            { id: "SalesDumpData", label: "Sales Dump Data" },
            { id: "SalesDumpDataWithCost", label: "Sales Dump Data With Cost" },
            { id: "OrderBookerAchivment", label: "Order Booker Achievement" },
            { id: "DcReport", label: "DC Report" },
            { id: "OrderReport", label: "Order Report" },
          ]
        },
        {
          id: "Accounts Reports", label: "Accounts Reports", children: [
            { id: "GeneralLedger", label: "General Ledger" },
            { id: "InvestmentReportBetween", label: "Investment Report Between" },
            { id: "EmployeeLedgerReport", label: "Employee Ledger Report" },
            { id: "TaxReport", label: "Tax Report" },
            { id: "BookerWiseInvoice", label: "Booker Wise Invoice" },
            { id: "VisitReport", label: "Visit Report" },
            { id: "TrailBalances", label: "Trial Balances" },
          ]
        },
        { id: "Period Expense And Revenue Report", label: "Period Expense And Revenue Report" },


      ]

    },

  ];
  const toggleNode = (id) => {
    setExpandedNodes((prev) =>
      prev.includes(id) ? prev.filter((nid) => nid !== id) : [...prev, id]
    );
  };

  // expand all nodes
  const expandAll = (nodes) => {
    let allIds = [];
    const getIds = (n) => {
      allIds.push(n.id);
      if (n.children) {
        n.children.forEach(getIds);
      }
    };
    nodes.forEach(getIds);
    setExpandedNodes(allIds);
  };

  // collapse all nodes
  const collapseAll = () => {
    setExpandedNodes([]);
  };
  const onSubmit = async (data) => {
    data.Roles = selectedRoles
    const roleData = {
      RoleName: data.RoleName,
      Roles: selectedRoles,
      createdBy: loginuser.firstname,
      createDate: updateDate()
    };

    try {
      await createDataFunction("/userRole", roleData);
      toast.success("Data Add")
      setTimeout(() => {
        navigate('/UserRolls');
      }, 2000)
    } catch (err) {
      toast.error("Some thing went wrong")
      console.error("Submission error:", err);
    }
  };

  return (
    <div className="pd-page">
    <h1 className="pd-page-title text-center">Add User Role</h1>
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="pd-form-grid"
    >
      <div className="flex flex-col">
      <div className="mb-8">
        <ToastContainer />
        <label className="pd-label">
          Role Name
        </label>
        <input
          type="text"
          {...register("RoleName", { required: true })}
          className="pd-input"
        />
      </div>

      {/* Expand/Collapse All buttons */}
      <div className="flex flex-col gap-3 space-x-2 mb-4">
        <button
          type="button"
          onClick={() => expandAll(treeData)}
          className="pd-btn-success"
        >
          Expand All
        </button>
        <button
          type="button"
          onClick={collapseAll}
          className="pd-btn-danger"
        >
          Collapse All
        </button>
      </div>

      <div className="space-y-2">
        {treeData.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            onCheck={handleCheck}
            expandedNodes={expandedNodes}
            toggleNode={toggleNode}
            selectedRoles={selectedRoles}

          />
        ))}
      </div>

      <button
        type="submit"
        className="pd-btn-save mt-6"
      >
        Save Role
      </button>
      </div>

    </form>
    </div>
  );
}
