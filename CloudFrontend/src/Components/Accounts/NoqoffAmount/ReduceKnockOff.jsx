// import React, { useState } from 'react';
// import * as XLSX from 'xlsx';
// import { ToastContainer, toast } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';
// import { updateDataFunction } from '../../../Api/CRUDFunctions';

// const normKey = (key) => String(key || '').toLowerCase().replace(/[\s_]/g, '');

// const pickField = (row, names) => {
//     const map = {};
//     Object.keys(row || {}).forEach((key) => {
//         map[normKey(key)] = row[key];
//     });
//     for (const name of names) {
//         const value = map[normKey(name)];
//         if (value !== undefined && value !== null && String(value).trim() !== '') {
//             return value;
//         }
//     }
//     return '';
// };

// const toAmount = (value) => {
//     const n = Number(String(value ?? 0).replace(/,/g, ''));
//     return Number.isFinite(n) ? n : 0;
// };

// const formatAmount = (value) =>
//     Number(toAmount(value)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// const actionLabel = (action) => {
//     if (action === 'zero_invoices') return 'Ledger > Aging — invoices zero';
//     if (action === 'match_ledger') return 'Aging > Ledger — aging matched to ledger';
//     if (action === 'skip') return 'Already matched / no remaining';
//     if (action === 'not_found') return 'Distributor not found';
//     return action || '-';
// };

// const MatchAgingLedger = () => {
//     const [rows, setRows] = useState([]);
//     const [headers, setHeaders] = useState([]);
//     const [results, setResults] = useState([]);
//     const [saving, setSaving] = useState(false);

//     const mappedRows = rows.map((row) => ({
//         ...row,
//         clientId: String(pickField(row, ['clientId', '_id', 'id'])),
//         code: String(pickField(row, ['code', 'clientCode', 'oldCode', 'DistrbutorSystemCode', 'SalesFlowRef'])),
//         name: String(pickField(row, ['name', 'clientName', 'distributor', 'distributorName', 'DistrbutorName']))
//     }));

//     const handleFileUpload = (event) => {
//         const file = event.target.files?.[0];
//         if (!file) return;
//         const reader = new FileReader();
//         reader.onload = (loadEvent) => {
//             const data = new Uint8Array(loadEvent.target.result);
//             const workbook = XLSX.read(data, { type: 'array' });
//             const worksheet = workbook.Sheets[workbook.SheetNames[0]];
//             const jsonData = XLSX.utils.sheet_to_json(worksheet);
//             const firstRow = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] || [];
//             setRows(jsonData);
//             setHeaders(firstRow);
//             setResults([]);
//         };
//         reader.readAsArrayBuffer(file);
//     };

//     const downloadTemplate = () => {
//         const worksheet = XLSX.utils.json_to_sheet([
//             { Code: 'D001', Name: 'Distributor Name' }
//         ]);
//         const workbook = XLSX.utils.book_new();
//         XLSX.utils.book_append_sheet(workbook, worksheet, 'MatchAgingLedger');
//         XLSX.writeFile(workbook, 'Match_Aging_Ledger_Template.xlsx');
//     };

//     const onSubmit = async () => {
//         if (!mappedRows.length) {
//             return toast.error('Please upload a file');
//         }
//         if (mappedRows.every((row) => !row.code && !row.name && !row.clientId)) {
//             return toast.error('File mein distributor Code hona chahiye');
//         }
//         setSaving(true);
//         try {
//             const res = await updateDataFunction('/voucher/MatchAgingLedger', {
//                 rows: mappedRows
//             });
//             const data = res?.data || [];
//             setResults(data);
//             const ok = data.filter((item) => item.action === 'zero_invoices' || item.action === 'match_ledger').length;
//             const skipped = data.filter((item) => item.action === 'skip').length;
//             const failed = data.filter((item) => item.action === 'not_found').length;
//             if (ok) toast.success(`${ok} distributor invoices updated`);
//             if (skipped) toast.info(`${skipped} already matched`);
//             if (failed) toast.error(`${failed} distributor code not found`);
//         } catch (err) {
//             toast.error(err?.response?.data?.message || err?.response?.data?.error || 'Something went wrong');
//         } finally {
//             setSaving(false);
//         }
//     };

//     return (
//         <div className="p-4">
//             <ToastContainer />
//             <h1 className="text-xl md:text-3xl font-bold text-center pd-text-body mb-6">Match Aging Ledger</h1>

//             <div className="pd-card p-4 md:p-6">
//                 <p className="text-sm pd-text-muted mb-4">
//                     Distributor code wali file upload karo. Har distributor ki aging aur ledger compare hogi:
//                     ledger zyada ho to tamam remaining invoices zero; aging zyada ho to aging ledger ke barabar ho jaye gi.
//                 </p>

//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
//                     <div>
//                         <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Excel File</label>
//                         <input
//                             type="file"
//                             accept=".xlsx,.xls"
//                             onChange={handleFileUpload}
//                             className="w-full text-sm"
//                         />
//                     </div>
//                     <div className="flex items-end">
//                         <button
//                             type="button"
//                             className="bg-gray-500 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg shadow"
//                             onClick={downloadTemplate}
//                         >
//                             Download Template
//                         </button>
//                     </div>
//                 </div>

//                 {mappedRows.length > 0 && (
//                     <div className="overflow-x-auto rounded-lg border mb-6 max-h-[45vh]">
//                         <table className="pd-data-table min-w-full text-sm">
//                             <thead>
//                                 <tr className="pd-bg-muted">
//                                     <th className="border p-2">Code</th>
//                                     <th className="border p-2">Name</th>
//                                     {headers.filter((header) => !['code', 'name'].includes(normKey(header))).slice(0, 4).map((header) => (
//                                         <th key={header} className="border p-2">{header}</th>
//                                     ))}
//                                 </tr>
//                             </thead>
//                             <tbody>
//                                 {mappedRows.map((row, index) => (
//                                     <tr key={index}>
//                                         <td className="border p-2">{row.code}</td>
//                                         <td className="border p-2">{row.name}</td>
//                                         {headers.filter((header) => !['code', 'name'].includes(normKey(header))).slice(0, 4).map((header) => (
//                                             <td key={header} className="border p-2">{row[header]}</td>
//                                         ))}
//                                     </tr>
//                                 ))}
//                             </tbody>
//                         </table>
//                     </div>
//                 )}

//                 <div className="flex justify-end mb-6">
//                     <button
//                         type="button"
//                         className="pd-btn-save text-sm md:text-base"
//                         disabled={saving || mappedRows.length === 0}
//                         onClick={onSubmit}
//                     >
//                         {saving ? 'Matching...' : 'Match Aging to Ledger'}
//                     </button>
//                 </div>

//                 {results.length > 0 && (
//                     <div>
//                         <h3 className="font-semibold mb-2">Result</h3>
//                         <div className="overflow-x-auto rounded-lg border max-h-[40vh]">
//                             <table className="pd-data-table min-w-full text-sm">
//                                 <thead>
//                                     <tr className="pd-bg-muted">
//                                         <th className="border p-2">Code</th>
//                                         <th className="border p-2">Name</th>
//                                         <th className="border p-2">Aging</th>
//                                         <th className="border p-2">Ledger</th>
//                                         <th className="border p-2">Aging After</th>
//                                         <th className="border p-2">Action</th>
//                                         <th className="border p-2">Invoices</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {results.map((row, index) => (
//                                         <tr key={index}>
//                                             <td className="border p-2">{row.clientCode}</td>
//                                             <td className="border p-2">{row.clientName}</td>
//                                             <td className="border p-2">{formatAmount(row.aging)}</td>
//                                             <td className="border p-2">{formatAmount(row.ledger)}</td>
//                                             <td className="border p-2">{formatAmount(row.agingAfter)}</td>
//                                             <td className="border p-2">{actionLabel(row.action)}</td>
//                                             <td className="border p-2">
//                                                 {(row.invoices || []).map((item) => item.invoice).filter(Boolean).join(', ') || '-'}
//                                             </td>
//                                         </tr>
//                                     ))}
//                                 </tbody>
//                             </table>
//                         </div>
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// };

// export default MatchAgingLedger;

import React from 'react'

const ReduceKnockOff = () => {
  return (
    <div>ReduceKnockOff</div>
  )
}

export default ReduceKnockOff