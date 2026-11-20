import React, { useState } from "react";
import { useSelector } from "react-redux";
import AppSelect from '../../Global/AppSelect.jsx'
import AppAsyncSelect from '../../Global/AppAsyncSelect.jsx'
import { createDataFunction, getDataFundtion, updateDataFunction } from "../../../Api/CRUDFunctions";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { formatDate } from "../../Global/getDate";
import * as XLSX from "xlsx";
import { useLoader } from "../../../hooks/useLoader";

const RealizePayment = () => {

  const BankAccountNumber = useSelector(
    (state) => state.AdminReducer.AdminReducer
  );
  const Account = useSelector(
    (state) => state.ChartofAccounts.ChartofAccounts
  );
  const navigate = useNavigate()
  const filteredAccount = Account.filter(
    (item) => item.AccountCode.length > 5
  );
  const SoftStore = useSelector((state) => state.Store.Store)
  const Client = useSelector((state) => state.DistributroReducers.DistributroReducers)
  const [MainAccount, setMainAccount] = useState("");
  const [tableData, setTableData] = useState([]);
  console.log(tableData)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [disable, setDisable] = useState(false)
  const [unClimed, setUnClimed] = useState("")
  const { showLoader, hideLoader, LoaderComponent } = useLoader();
  /* ================= GET DATA ================= */
  const getData = async (account) => {
    const mainAccount = account || MainAccount;
    if (!mainAccount) return;
    setDisable(false)
    setTableData([])
    showLoader("Loading Receipts...")
    try {
      const res = await getDataFundtion(
        `/PaymentRecived/ByAccounts/${mainAccount}?startDate=${startDate}&endDate=${endDate}`

      );

      const unClimed = await getDataFundtion("/Administrative/get/687e14a624a274d5e844be49")
      setUnClimed(unClimed.data?.UnclaimedAc)

      // 🔥 FLATTEN ALL RECEIPTS INTO ONE TABLE
      const rows = res.map((receipt) => ({
        ...receipt,
        TotalCredit: receipt.ReciptData.reduce((sum, row) => sum + (parseFloat(row.Credit) || 0), 0),
        TotalDebit: receipt.ReciptData.reduce((sum, row) => sum + (parseFloat(row.Debit) || 0), 0),
        Narration: receipt.ReciptData[0]?.Narration,
        Store: SoftStore.find((st) => st._id == receipt.ReciptData[0]?.store)?.StoreName,
        ClientRef2: receipt.ReciptData.map((item) => item.ClientRef2).join(" "),
        ReciptMainAccount: Account.find((item) => item._id == receipt?.ReciptMainAccount)?.AccountName,
        check: false
      }))


      setTableData(rows);
    } finally {
      hideLoader();
    }
  };

  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(tableData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PaymentReceipts");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const data = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(data, "PaymentReceipts.xlsx");
  }

  /* ================= BANK FILTER ================= */
  const range = [];
  for (
    let i = BankAccountNumber.BankAccountFrom;
    i <= BankAccountNumber.BankAccountTo;
    i++
  ) {
    range.push(i.toString().padStart(5, "0"));
  }

  const Bank = filteredAccount.filter((item) =>
    range.some((prefix) => item.AccountCode.startsWith(prefix))
  );

  const BankAccount = Bank.map((item) => ({
    label: `${item.AccountCode} - ${item.AccountName}`,
    value: item._id,
  }));


  const checkValue = (checked, id) => {
    //console.log(checked, id)
    setTableData((prev) =>
      prev.map((row) =>
        row._id === id ? { ...row, check: checked } : row
      )
    );
    setTableData((prev) =>
      prev.map((row) =>
        row._id === id ? { ...row, reject: "" } : row
      )
    )
  };

  const  isUnclaimed = (checked, id) => {
    console.log(checked, id)
    setTableData((prev) =>
      prev.map((row) =>
        row._id === id ? { ...row, isUnclaimed: checked } : row
      )
    );
if (checked) {
    const updatedTableData = tableData.find((row) => row._id === id);
    
      const reciptCredit = updatedTableData.ReciptData.reduce((sum, row) => sum + (Number(row.Credit) || 0), 0);
      const reciptDebit = updatedTableData.ReciptData.reduce((sum, row) => sum + (Number(row.Debit) || 0), 0);
    const willHit = reciptCredit - reciptDebit;
    if(willHit !== 0){
      updatedTableData.ReciptData.push({
        Account: unClimed,
        id : Math.random().toString(36).substr(2, 9),
        Debit: willHit > 0 ? willHit : 0,
        Credit: willHit < 0 ? Math.abs(willHit) : 0,
        store : updatedTableData.ReciptData[0]?.store,
        Narration: updatedTableData.ReciptData[0]?.Narration,
      });      
    }
    setTableData((prev) =>
      prev.map((row) =>
        row._id === id ? { ...row, ReciptData: updatedTableData.ReciptData , TotalDebit: willHit } : row
      )
    );
  }
  if (!checked) {
    const updatedTableData = tableData.find((row) => row._id === id);
    const filteredReciptData = updatedTableData.ReciptData.filter((row) => row.Account !== unClimed);
    setTableData((prev) =>
      prev.map((row) =>
        row._id === id ? { ...row, ReciptData: filteredReciptData , TotalDebit: 0 } : row
      )
    );
  }
  };

  
const Narration = (checked, id) => {
  setTableData((prev) =>
    prev.map((row) =>
      row._id === id
        ? {
            ...row,
            Narration: checked,
            ReciptData: (row.ReciptData || []).map((receipt) => ({
              ...receipt,
              Narration: checked,
            })),
          }
        : row
    )
  );
};

  const RejectResone = (checked, id) => {
    setTableData((prev) =>
      prev.map((row) =>
        row._id === id ? { ...row, RejectResone: checked } : row
      )
    );

  };
  const RejectValue = (checked, id) => {
    //console.log(checked, id)
    setTableData((prev) =>
      prev.map((row) =>
        row._id === id ? { ...row, reject: checked } : row
      )
    );
    setTableData((prev) =>
      prev.map((row) =>
        row._id === id ? { ...row, check: "" } : row
      )
    );
  };

  const isAlreadyRealized = (item) => {
    const posted = item.status === true || String(item.status).toLowerCase() === "true";
    const hasVoucher = Boolean(item.Voucher && String(item.Voucher).trim());
    return posted && hasVoucher;
  };

  const SubmitData = async () => {
    try {
      setDisable(true)
      const Reject = tableData.filter((item) => item.reject == true)
      for (const item of Reject) {
        if (isAlreadyRealized(item)) continue;
        try {
          await updateDataFunction(`/PaymentRecived/RejectVoucher/${item._id}`, item)
        } catch (err) {
          console.error("Reject failed", item._id, err)
        }
      }
      const id = tableData.filter((item) => item.check == true)
      let posted = 0;
      let skipped = 0;
      let failed = 0;
      for (const item of id) {
        if (isAlreadyRealized(item)) {
          skipped++;
          continue;
        }
        try {
          item.ReciptMainAccount = MainAccount
          const res = await updateDataFunction(`/PaymentRecived/voucherPost/${item._id}`, item)
          if (res?.skipped) {
            skipped++;
          } else {
            posted++;
          }
        } catch (err) {
          failed++;
          console.error("Post failed", item._id, err)
        }
      }
      if (failed === 0) {
        toast.success("Voucher Create Sussesfully")
        setTimeout(() => {
          navigate("/paymentReciptList")
        }, 1500)
      } else {
        toast.error(`${failed} payment(s) failed. ${posted} posted, ${skipped} skipped.`)
        setDisable(false)
      }
    }
    catch (err) {
      toast.error("Something went wrong")
      setDisable(false)
    }
  }


  /* ================= UI ================= */
  return (
    <>
      <LoaderComponent />
    <div className="p-4 md:p-6 space-y-6">
      {/* ================= FILTER CARD ================= */}
      <div className="pd-bg-surface shadow rounded-xl p-4 md:p-6">
        <h2 className="pd-page-title mb-6">
          Realize Payment
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* FROM DATE */}
          <div>
            <label className="pd-label">
              From Date
            </label>
            <input
              type="date"
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-[40px] px-3 border rounded-lg"
            />
          </div>

          {/* TO DATE */}
          <div>
            <label className="pd-label">
              To Date
            </label>
            <input
              type="date"
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-[40px] px-3 border rounded-lg"
            />
          </div>

          {/* BANK ACCOUNT */}
          <div className="md:col-span-1">
            <label className="pd-label">
              Bank / Cash Account
            </label>
            <AppSelect
              options={BankAccount}
              value={
                MainAccount
                  ? {
                    value: MainAccount,
                    label: `${Account.find((c) => c._id === MainAccount)
                      ?.AccountCode
                      } ${Account.find((c) => c._id === MainAccount)
                        ?.AccountName
                      }`,
                  }
                  : null
              }
              onChange={(opt) => {
                setMainAccount(opt.value);
                getData(opt.value);
              }}
              isSearchable
              placeholder="Select Bank"
            />
          </div>

        </div>
      </div>

      {/* ================= TABLE CARD ================= */}
      <div className="pd-bg-surface shadow-lg rounded-2xl p-4 md:p-6">
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm pd-text-body">
            <thead className="pd-bg-muted sticky top-0 z-10">
              <tr className="text-left">
                <th className="px-3 py-2 w-[120px]">Receipt Date</th>
                <th className="px-3 py-2 w-[120px]">Ref</th>
                <th className="px-3 py-2 w-[120px] text-right">Debit</th>
                <th className="px-3 py-2 w-[120px] text-right">Credit</th>
                <th className="px-3 py-2 w-[120px] text-right">Will Hit</th>
                <th className="px-3 py-2 min-w-[260px]">Narration</th>
                <th className="px-3 py-2 min-w-[100px]">Store</th>
                {/* <th className="px-3 py-2 min-w-[100px]">isUnclimed</th> */}
                <th className="px-3 py-2 w-[90px] text-center">Accept</th>
                <th className="px-3 py-2 w-[90px] text-center">Reject</th>
                <th className="px-3 py-2 w-[180px]">Reject Reason</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {tableData.map((row) => (
                <tr
                  key={row._id}
                  className="hover:pd-bg-muted transition"
                >

                  <td className="px-3 py-2">
                    {formatDate(row.ReciptDate)}
                  </td>

                  <td className="px-3 py-2">
                    {row.ClientRef2}
                  </td>

                  <td className="px-3 py-2 text-right font-semibold pd-stat-positive">
                    {row.TotalCredit}
                  </td>

                  <td className="px-3 py-2 text-right font-semibold pd-stat-negative">
                    {row.TotalDebit}
                  </td>

                  <td className="px-3 py-2 text-right font-semibold pd-stat-negative">
                    {(row.TotalCredit - row.TotalDebit).toLocaleString()}
                  </td>

                  <td className="px-3 py-2">
                    <input type="text" 
                      className="w-full rounded-md border px-2 py-1 text-xs focus:ring-1 focus:ring-red-500"
                     value={row.Narration || "-"} onChange={(e) => Narration(e.target.value, row._id)} />
                  </td>
                  <td className="px-3 py-2 pd-text-muted">
                    {row.Store || "-"}
                  </td>
                  {/* ACCEPT */}
                  {/* <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-blue-600"
                      checked={row.isUnclaimed || false}
                      onChange={(e) =>
                        isUnclaimed(e.target.checked, row._id)
                      }
                    />
                  </td> */}


                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-blue-600"
                      checked={row.check || false}
                      onChange={(e) =>
                        checkValue(e.target.checked, row._id)
                      }
                    />
                  </td>

                  {/* ACCEPT DATE */}

                  {/* REJECT */}
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-red-600"
                      checked={row.reject || false}
                      onChange={(e) =>
                        RejectValue(e.target.checked, row._id)
                      }
                    />
                  </td>

                  {/* REJECT REASON */}
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      placeholder="Reason..."
                      onChange={(e) => {
                        RejectResone(e.target.value, row._id)
                      }}
                      className="w-full rounded-md border px-2 py-1 text-xs focus:ring-1 focus:ring-red-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>

            {tableData.length > 0 && (
              <tfoot>
                <tr className="pd-table-footer">
                  <td colSpan={3} className="px-3 py-2 text-right">
                    Totals
                  </td>
                  <td className="px-3 py-2 text-right text-green-700">
                    {/* Total Debit */}
                  </td>
                  <td className="px-3 py-2 text-right text-red-700">
                    {/* Total Credit */}
                  </td>
                  <td colSpan={5}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => SubmitData()}

          className="pd-btn-save text-sm md:text-base"
        >
          Create Bank Receipt
        </button>

      </div>
    </div>
    </>
  );
};

export default RealizePayment;
