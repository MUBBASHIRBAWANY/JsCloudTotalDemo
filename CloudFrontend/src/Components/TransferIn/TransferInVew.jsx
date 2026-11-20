import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { createDataFunction, updateDataFunction } from '../../Api/CRUDFunctions';
import { set } from 'react-hook-form';

const TransferInView = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const Store = useSelector(state => state.Store.Store);
  const Location = useSelector(state => state.Location.Location);
  const Products = useSelector(state => state.Product.product);
  const TransferIn = useSelector(state => state.TransferIn.TransferIn);
  const Admin = useSelector((state) => state.AdminReducer.AdminReducer)
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  const RecivedTransferIn = UserRihts.find((item) => item == "Received Transfer In")

  const [transfer, setTransfer] = useState(null);
  const [tableData, setTableData] = useState([]);

  useEffect(() => {
    const found = TransferIn.find(item => item._id === id);
    if (found) {
      setTransfer(found);
      setTableData(found.TransferData || []);
    }
  }, [id, TransferIn]);

  const getProductName = (pid) => {
    const prod = Products.find(p => p._id === pid);
    return prod ? `${prod.mastercode} ${prod.ProductName}` : pid;
  };

  const handlePostUnpost = async (status) => {
    try {
      const payload = {
        status: "Recived",
        TransferData: transfer.TransferData,
        LocationTo: transfer.LocationTo,
        StoreTo: transfer.StoreTo,
        TransferCode: transfer.TransferCode,
        TransferInDate: transfer.TransferInDate,
        SalesFlowRef: transfer.SalesFlowRef

      };
      //console.log(payload)
      const AccountsData = {
        VoucherType: "ETI",
        VoucherDate: transfer.TransferInDate,
        status: "Post",
        Allow: "Yes",
        VoucharData: [
          {
            Accounts: transfer.Account,
            Credit: transfer.TransferData.reduce((sum, val) => sum + (parseFloat(val.GrossAmount) || 0), 0),
            Store: transfer.StoreTo
          },
          {
            Account: Admin.finishedGoods,
            Debit: transfer.TransferData.reduce((sum, val) => sum + (parseFloat(val.GrossAmount) || 0), 0),
            Store: transfer.StoreTo
          }
        ]
      }
      //console.log(AccountsData)
      
      const res = await updateDataFunction(`TransferIn/ChangeStatus/${transfer._id}`, payload);
      const voucher = await createDataFunction("/Voucher/createSystemVoucher", AccountsData)
       setTimeout(() => navigate('/Transferinlist'), 2000);
   
    } catch (err) {
      console.error(err);
      toast.error(`Failed to ${status ? 'post' : 'unpost'} transfer.`);
    }
  };
  return (
    <div className="p-6 pd-bg-muted min-h-screen">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Transfer In Details</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => navigate('/TransferInList')}
            className="px-6 py-2 pd-bg-muted0 text-white rounded hover:bg-gray-600"
          >
            Back to List
          </button>
          {transfer && RecivedTransferIn && (
            <>
              <button
                onClick={() => handlePostUnpost(true)}
                className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Recived
              </button>

            </>
          )}
        </div>
      </div>

      {transfer && (
        <div className="pd-bg-surface rounded-xl shadow-lg p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              ["Transfer Code", transfer.TransferCode],
              ["Transfer Date", new Date(transfer.TransferInDate).toLocaleDateString('en-GB')],
              ["Location From", Location.find(l => l._id === transfer.LocationFrom)?.LocationName],
              ["Location To", Location.find(l => l._id === transfer.LocationTo)?.LocationName],
              ["Store From", Store.find(l => l._id === transfer.StoreFrom)?.StoreName],
              ["Store To", Store.find(l => l._id === transfer.StoreTo)?.StoreName],

            ].map(([label, value]) => (
              <div className="space-y-2" key={label}>
                <label className="pd-label">{label}</label>
                <p className="text-lg font-medium pd-text-body">{value}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full divide-y divide-[color:var(--pd-border-card)]">
              <thead className="pd-bg-muted">
                <tr>
                  {['Product', 'Carton', 'Box', 'Unit', 'Rate', 'Gross Amount'].map(h => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-medium pd-text-muted uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="pd-bg-surface divide-y divide-[color:var(--pd-border-card)]">
                {tableData.map((row) => (
                  <tr key={row.id} className="hover:pd-bg-muted">
                    <td className="px-6 py-4 text-sm pd-text-body">
                      {getProductName(row.product)}
                    </td>
                    <td className="px-6 py-4 text-sm pd-text-body">{row.carton}</td>
                    <td className="px-6 py-4 text-sm pd-text-body">{row.box}</td>
                    <td className="px-6 py-4 text-sm pd-text-body">{row.unit}</td>
                    <td className="px-6 py-4 text-sm pd-text-body">{Number(row.Rate).toFixed(4)}</td>
                    <td className="px-6 py-4 text-sm pd-text-body">{Number(row.GrossAmount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransferInView;
