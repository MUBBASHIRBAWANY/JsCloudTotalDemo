import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { toast, ToastContainer } from 'react-toastify';
import { ConvetDate } from '../../../Global/getDate';
import { XmlFactory } from '@ag-grid-community/all-modules';
import { createDataFunction } from '../../../../Api/CRUDFunctions';


const VoucherUpload = () => {
    const [data, setData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const Vendor = useSelector((state) => state.Vendor.state)
    const Store = useSelector((state) => state.Store.Store)
    const navigate = useNavigate()
    const [hide, setHide] = useState(false)
    const Account = useSelector((state) => state.ChartofAccounts.ChartofAccounts)
    const EditDistributor = useSelector((state) => state.DistributroReducers.DistributroReducers);
    console.log(EditDistributor)
  const onSubmit = async () => {
  const merged = Object.values(
    data.reduce((acc, item) => {
      const key = item.voucherno;

      if (!acc[key]) {
        acc[key] = {
          voucherno: key,
          VoucherDate: item.date,
          chqnumber: item.chqnumber || "",
          VoucherType: item.vouchertype,
          VoucherMainAccount:
            Account.find((a) => a.AccountName == item.mainaccount)?._id || "",
          TotalDebit: 0,
          TotalCredit: 0,
          Remarks: item.remarks || "",
          VoucharData: [],
          PaidFor: "other",
          status: "Post",
        };
      }

      // Add debit/credit entry
      acc[key].VoucharData.push({
        id: Date.now() + Math.random(),
        Account:
          Account.find((a) => a.AccountName == item.account)?._id || "",
        slip: item.slip || null,
        Narration: item.remarks || "",
        store: Store.find((s) => s.StoreName == item.store)?._id || "",
        Debit: item.debit || 0,
        Credit: item.credit || 0,
        Client: EditDistributor.find((v) => v.DistrbutorSystemCode == item.vendor)?._id,
      });

      // Update totals
      acc[key].TotalDebit += item.debit || 0;
      acc[key].TotalCredit += item.credit || 0;
      acc[key].status = "Post"

      return acc;
    }, {})
  );

  // Add main account balancing entry
  merged.forEach((v) => {
    if (v.TotalDebit > v.TotalCredit) {
      v.VoucherMainAccountType = "Debit";
      v.VoucharData.push({
        id: Date.now() + Math.random(),
        Account: v.VoucherMainAccount,
        Debit: 0,
        Credit: v.TotalDebit - v.TotalCredit,
        chqnumber: v.VoucharData[v.VoucharData.length - 1]?.chqnumber || null,
        slip: v.VoucharData[v.VoucharData.length - 1]?.slip || null,
        store: v.VoucharData[v.VoucharData.length - 1]?.store || null,
        remarks: "",
        show: true,
      });
    } else if (v.TotalCredit > v.TotalDebit) {
      v.VoucherMainAccountType = "Credit";
      v.VoucharData.push({
        id: Date.now() + Math.random(),
        Account: v.VoucherMainAccount,
        Debit: v.TotalCredit - v.TotalDebit,
        Credit: 0,
        slip: v.VoucharData[v.VoucharData.length - 1]?.slip || null,
        store: v.VoucharData[v.VoucharData.length - 1]?.store || null,
        remarks: "",
        show: true,
      });
    }
  });

console.log("Prepared vouchers:", merged);

  // ✅ Split into chunks (example: 50 per request)
  const chunkSize = 20;
  const chunks = [];
  for (let i = 0; i < merged.length; i += chunkSize) {
    chunks.push(merged.slice(i, i + chunkSize));
  }

  try {
    for (let i = 0; i < chunks.length; i++) {
      //console.log(`Posting chunk ${i + 1} of ${chunks.length}...`);
      //console.log(chunks[i])
      await createDataFunction("/Voucher/PushVoucherBulkData", chunks[i]);
    }

    toast.success("All vouchers posted successfully!");
    navigate("/BankReciptVoucher");
  } catch (err) {
    console.error("Chunk post error:", err);
    toast.error("Something went wrong while posting vouchers");
  }
};




    const handleFileUpload = (e) => {
        setHide(true)
        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // Get the first worksheet
            const worksheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[worksheetName];

            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            // Get headers if needed
            const firstRow = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0];

            setData(jsonData);
            setHeaders(firstRow);
        };

        reader.readAsArrayBuffer(file);
    };

    return (
        <div>
            <ToastContainer />
            <h2>Upload Excel File</h2>
            <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
            />



            {/* {data.length > 0 && (
                <div>
                    <h3>Data:</h3>
                    <div className="overflow-x-auto rounded-lg border pd-border-default border shadow-md h-[60vh]">
                        <table className="min-w-full divide-y divide-[color:var(--pd-border-card)] bg-white">
                            <thead className="pd-bg-muted">
                                <tr>
                                    {headers.map((header, index) => (
                                        <th
                                            key={index}
                                            className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider pd-text-muted"
                                        >
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[color:var(--pd-border-card)]">
                                {data.map((row, rowIndex) => (
                                    <tr
                                        key={rowIndex}
                                        className={rowIndex % 2 === 0 ? 'bg-white' : 'pd-bg-muted'}
                                    >
                                        {headers.map((header, colIndex) => (
                                            <td
                                                key={colIndex}
                                                className="whitespace-nowrap px-6 py-4 text-sm pd-text-body"
                                            >
                                                {row[header]}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            )} */}
            <br />

{hide && <input type="submit" onClick={onSubmit} className='text-white bg-blue-700 cursor-pointer hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 focus:outline-none' />}        </div>
    )
}

export default VoucherUpload