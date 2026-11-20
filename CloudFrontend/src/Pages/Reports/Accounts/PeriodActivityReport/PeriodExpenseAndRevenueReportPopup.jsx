// import React, { useEffect, useState } from 'react';
// import jsPDF from 'jspdf';
// import { exportProfessionalExcel } from '../../../../utils/exportProfessionalExcel';
// import autoTable from 'jspdf-autotable';
// import { getDataFundtion } from '../../../../Api/CRUDFunctions';
// import ReportPopupHeader from '../../../../Components/Global/ReportPopupHeader.jsx';

// const MONTH_LABELS = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

// const toFiscalMonth = (calMonth) => (calMonth - 6 + 12) % 12;

// const fmt = (n) =>
//   Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// const emptyMonths = () => Array.from({ length: 12 }, () => 0);

// const sumMonths = (list) =>
//   MONTH_LABELS.map((_, i) => list.reduce((s, item) => s + (item.Months?.[i] || 0), 0));

// const monthTotal = (months) => (months || []).reduce((s, v) => s + v, 0);

// const PeriodExpenseAndRevenueReportPopup = ({ data }) => {
//   const [isLoading, setIsLoading] = useState(false);
//   const [isExporting, setIsExporting] = useState(false);
//   // 4th-level grouped by 3rd level:
//   // [{ code, name, Months[], Total, accounts: [{ code, accountName, departments: [{ storeName, Months[], Total }] }] }]
//   const [revenueGroups, setRevenueGroups] = useState([]);
//   // 5xxx store groups, same shape as PeriodExpenseReport
//   const [storeGroups, setStoreGroups] = useState([]);

//   const getData = async () => {
//     try {
//       setIsLoading(true);

//       const allAccountsRes = await getDataFundtion("/ChartofAccounts");
//       const allAccounts = allAccountsRes.data || allAccountsRes || [];

//       const revenueAccounts = allAccounts.filter((acc) => (acc.AccountCode || '').startsWith('4'));
//       const expenseAccounts = allAccounts.filter((acc) => (acc.AccountCode || '').startsWith('5'));

//       const stage3ById = {};
//       allAccounts.forEach((acc) => {
//         if (String(acc.Stage) === '3') {
//           const id = acc._id || acc.id;
//           if (id) {
//             stage3ById[id] = {
//               code: acc.AccountCode || '',
//               name: acc.AccountName || '',
//             };
//           }
//         }
//       });

//       const revenueLookup = {};
//       revenueAccounts.forEach((acc) => {
//         const id = acc._id || acc.id;
//         if (!id) return;
//         revenueLookup[id] = {
//           name: acc.AccountName || '',
//           code: acc.AccountCode || '',
//           stage: String(acc.Stage || ''),
//           stage3Id: acc.Stage3 || '',
//         };
//       });

//       const isStage4Account = (accInfo) => {
//         if (accInfo.stage === '4') return true;
//         if (accInfo.stage === '1' || accInfo.stage === '2' || accInfo.stage === '3') return false;
//         return (accInfo.code || '').length > 5;
//       };

//       const expenseLookup = {};
//       expenseAccounts.forEach((acc) => {
//         const id = acc._id || acc.id;
//         if (!id) return;
//         expenseLookup[id] = {
//           name: acc.AccountName || '',
//           code: acc.AccountCode || '',
//         };
//       });

//       const storeRes = await getDataFundtion("/Store");
//       const stores = Array.isArray(storeRes) ? storeRes : (storeRes?.data || []);
//       const storeLookup = {};
//       stores.forEach((s) => { storeLookup[s._id] = s.StoreName || ''; });

//       const normalizeStoreName = (rawStoreId) => {
//         if (!rawStoreId || rawStoreId === 'none' || rawStoreId === '0' || rawStoreId === 0) {
//           return 'Head Office';
//         }
//         const name = (storeLookup[rawStoreId] || '').trim();
//         if (!name || /^head\s*office$/i.test(name)) return 'Head Office';
//         return name;
//       };

//       const getStage3 = (accInfo) => {
//         if (accInfo.stage3Id && stage3ById[accInfo.stage3Id]) {
//           return stage3ById[accInfo.stage3Id];
//         }
//         const prefix = (accInfo.code || '').substring(0, 5);
//         const found = Object.values(stage3ById).find((s) => s.code === prefix);
//         if (found) return found;
//         return { code: prefix || '4', name: 'Other Revenue' };
//       };

//       const revenueIds = Object.keys(revenueLookup).join(',');
//       const expenseIds = Object.keys(expenseLookup).join(',');

//       const [revenueLedger, expenseLedger] = await Promise.all([
//         revenueIds
//           ? getDataFundtion(`GernalLager?startDate=${data.startDate}&endDate=${data.endDate}&Account=${revenueIds}&Store=`)
//           : [],
//         expenseIds
//           ? getDataFundtion(`GernalLager?startDate=${data.startDate}&endDate=${data.endDate}&Account=${expenseIds}&Store=`)
//           : [],
//       ]);

//       const revenueArray = Array.isArray(revenueLedger) ? revenueLedger : [];
//       const expenseArray = Array.isArray(expenseLedger) ? expenseLedger : [];

//       // accountId -> storeName -> months[]  (credit - debit)
//       const revenueMonthly = {};
//       revenueArray.forEach((item) => {
//         const accountId = item.Account;
//         if (!accountId || !revenueLookup[accountId]) return;
//         if (item.Type === 'VoucherBefore') return;

//         const debit = Number(item.Debit) || 0;
//         const credit = Number(item.Credit) || 0;
//         const amount = credit - debit;
//         if (amount === 0 && debit === 0 && credit === 0) return;

//         const storeName = normalizeStoreName(item.store);
//         if (!revenueMonthly[accountId]) revenueMonthly[accountId] = {};
//         if (!revenueMonthly[accountId][storeName]) {
//           revenueMonthly[accountId][storeName] = emptyMonths();
//         }

//         const date = item.VoucherDate ? new Date(item.VoucherDate) : null;
//         const calMonth = date && !isNaN(date.getTime()) ? date.getMonth() : null;
//         if (calMonth !== null) {
//           revenueMonthly[accountId][storeName][toFiscalMonth(calMonth)] += amount;
//         }
//       });

//       const level3Map = {};
//       Object.keys(revenueMonthly).forEach((accountId) => {
//         const accInfo = revenueLookup[accountId];
//         if (!accInfo || !isStage4Account(accInfo)) return;
//         const stage3 = getStage3(accInfo);
//         const level3Key = stage3.code || stage3.name;

//         if (!level3Map[level3Key]) {
//           level3Map[level3Key] = {
//             code: stage3.code,
//             name: stage3.name,
//             Months: emptyMonths(),
//             accounts: {},
//           };
//         }

//         const storeMap = revenueMonthly[accountId];
//         Object.keys(storeMap).forEach((storeName) => {
//           const months = storeMap[storeName].map((v) => Number(v.toFixed(2)));
//           const total = Number(monthTotal(months).toFixed(2));
//           if (total === 0 && months.every((v) => v === 0)) return;

//           months.forEach((v, i) => {
//             level3Map[level3Key].Months[i] += v;
//           });

//           if (!level3Map[level3Key].accounts[accountId]) {
//             level3Map[level3Key].accounts[accountId] = {
//               code: accInfo.code,
//               accountName: accInfo.name,
//               departments: [],
//             };
//           }
//           level3Map[level3Key].accounts[accountId].departments.push({
//             storeName,
//             Months: months,
//             Total: total,
//           });
//         });
//       });

//       const revenueGroupList = Object.values(level3Map)
//         .map((group) => {
//           const accounts = Object.values(group.accounts)
//             .map((acc) => {
//               const departments = acc.departments.sort((a, b) => a.storeName.localeCompare(b.storeName));
//               return { ...acc, departments };
//             })
//             .filter((acc) => acc.departments.length > 0)
//             .sort((a, b) => (parseFloat(a.code) || 0) - (parseFloat(b.code) || 0));

//           const months = group.Months.map((v) => Number(v.toFixed(2)));
//           return {
//             code: group.code,
//             name: group.name,
//             Months: months,
//             Total: Number(monthTotal(months).toFixed(2)),
//             accounts,
//           };
//         })
//         .filter((g) => g.accounts.length > 0)
//         .sort((a, b) => (parseFloat(a.code) || 0) - (parseFloat(b.code) || 0));

//       setRevenueGroups(revenueGroupList);

//       // ---------- 5xxx: store-grouped like PeriodExpenseReport (debit - credit) ----------
//       const storeMonthlyTotals = {};
//       expenseArray.forEach((item) => {
//         const accountId = item.Account;
//         if (!accountId || !expenseLookup[accountId]) return;
//         if (item.Type === 'VoucherBefore') return;

//         const debit = Number(item.Debit) || 0;
//         const credit = Number(item.Credit) || 0;
//         if (debit === 0 && credit === 0) return;

//         const storeName = normalizeStoreName(item.store);
//         if (!storeMonthlyTotals[accountId]) storeMonthlyTotals[accountId] = {};
//         if (!storeMonthlyTotals[accountId][storeName]) {
//           storeMonthlyTotals[accountId][storeName] = Array.from({ length: 12 }, () => ({ debit: 0, credit: 0 }));
//         }

//         const date = item.VoucherDate ? new Date(item.VoucherDate) : null;
//         const calMonth = date && !isNaN(date.getTime()) ? date.getMonth() : null;
//         if (calMonth !== null) {
//           const fiscalIdx = toFiscalMonth(calMonth);
//           storeMonthlyTotals[accountId][storeName][fiscalIdx].debit += debit;
//           storeMonthlyTotals[accountId][storeName][fiscalIdx].credit += credit;
//         }
//       });

//       const allStoreNames = new Set();
//       Object.keys(storeMonthlyTotals).forEach((accountId) => {
//         Object.keys(storeMonthlyTotals[accountId]).forEach((storeName) => {
//           allStoreNames.add(storeName);
//         });
//       });

//       const storeGroupMap = {};
//       allStoreNames.forEach((storeName) => {
//         storeGroupMap[storeName] = { storeName, accounts: [] };
//       });

//       Object.keys(expenseLookup).forEach((accountId) => {
//         const storeMap = storeMonthlyTotals[accountId];
//         if (!storeMap) return;

//         const code = expenseLookup[accountId].code;
//         const accountName = expenseLookup[accountId].name;

//         Object.keys(storeMap).forEach((storeName) => {
//           const months = storeMap[storeName];
//           const monthBalances = months.map((m) => m.debit - m.credit);
//           const total = monthBalances.reduce((s, v) => s + v, 0);
//           storeGroupMap[storeName].accounts.push({
//             code,
//             accountName,
//             Months: monthBalances.map((v) => Number(v.toFixed(2))),
//             Total: Number(total.toFixed(2)),
//           });
//         });
//       });

//       Object.values(storeGroupMap).forEach((group) => {
//         group.accounts.sort((a, b) => (parseFloat(a.code) || 0) - (parseFloat(b.code) || 0));
//       });

//       const expenseResult = Object.values(storeGroupMap)
//         .filter((g) => g.accounts.length > 0)
//         .sort((a, b) => a.storeName.localeCompare(b.storeName));

//       setStoreGroups(expenseResult);
//       setIsLoading(false);
//     } catch (err) {
//       console.error('Error fetching expense and revenue report data:', err);
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     getData();
//   }, []);

//   const revenueTotalMonths = sumMonths(revenueGroups);
//   const revenueGrandTotal = revenueGroups.reduce((s, r) => s + r.Total, 0);

//   const expenseGrandMonths = MONTH_LABELS.map((_, i) =>
//     storeGroups.reduce((s, group) =>
//       s + group.accounts.reduce((sa, acc) => sa + acc.Months[i], 0), 0
//     )
//   );
//   const expenseGrandTotal = storeGroups.reduce((s, group) =>
//     s + group.accounts.reduce((sa, acc) => sa + acc.Total, 0), 0
//   );

//   const accountDeptMonths = (acc) => sumMonths(acc.departments);
//   const accountDeptTotal = (acc) => acc.departments.reduce((s, d) => s + d.Total, 0);

//   const downloadExcel = async () => {
//     setIsExporting(true);
//     try {
//       const exportRows = [];

//       const blankMonthRow = (accountNo, accountName, department) => {
//         const row = {
//           'Account No': accountNo,
//           'Account Name': accountName,
//           Department: department || '',
//         };
//         MONTH_LABELS.forEach((label) => { row[label] = ''; });
//         row.Total = '';
//         return row;
//       };

//       const amountRow = (accountNo, accountName, department, months, total) => {
//         const row = {
//           'Account No': accountNo,
//           'Account Name': accountName,
//           Department: department || '',
//         };
//         MONTH_LABELS.forEach((label, i) => {
//           row[label] = months[i] || '';
//         });
//         row.Total = total;
//         return row;
//       };

//       exportRows.push(blankMonthRow('', 'REVENUE (4xxx) - Account / Department', ''));

//       revenueGroups.forEach((group) => {
//         exportRows.push(blankMonthRow(group.code, group.name, ''));
//         group.accounts.forEach((acc) => {
//           acc.departments.forEach((dept, idx) => {
//             exportRows.push(amountRow(
//               idx === 0 ? acc.code : '',
//               idx === 0 ? acc.accountName : '',
//               dept.storeName,
//               dept.Months,
//               dept.Total
//             ));
//           });
//           exportRows.push(amountRow('', `${acc.accountName} - Total`, '', accountDeptMonths(acc), accountDeptTotal(acc)));
//         });
//         exportRows.push(amountRow('', `${group.name} - Total`, '', group.Months, group.Total));
//       });
//       exportRows.push(amountRow('', 'REVENUE TOTAL', '', revenueTotalMonths, revenueGrandTotal));

//       exportRows.push(blankMonthRow('', '', ''));
//       exportRows.push(blankMonthRow('', 'EXPENSE (5xxx) - Store Wise Breakup', ''));

//       storeGroups.forEach((group) => {
//         exportRows.push(blankMonthRow(group.storeName, '', ''));
//         group.accounts.forEach((acc) => {
//           exportRows.push(amountRow(acc.code, acc.accountName, '', acc.Months, acc.Total));
//         });
//         const storeMonthTotals = MONTH_LABELS.map((_, i) =>
//           group.accounts.reduce((s, acc) => s + acc.Months[i], 0)
//         );
//         const storeTotal = group.accounts.reduce((s, acc) => s + acc.Total, 0);
//         exportRows.push(amountRow('', `${group.storeName} - Total`, '', storeMonthTotals, storeTotal));
//       });
//       exportRows.push(amountRow('', 'EXPENSE GRAND TOTAL', '', expenseGrandMonths, expenseGrandTotal));

//       await exportProfessionalExcel({
//         title: 'Period Expense And Revenue Report',
//         fileName: 'Period_Expense_And_Revenue_Report',
//         sheetName: 'Expense And Revenue',
//         rows: exportRows,
//         meta: [
//           `Year: ${data.yearLabel}`,
//           `Period: ${data.startDate} to ${data.endDate}`,
//           'Revenue accounts (4xxx) then expense accounts (5xxx)',
//         ],
//         excludeKeys: ['_id', 'id'],
//       });
//     } catch (error) {
//       console.error('Export to Excel failed:', error);
//       alert('Failed to export to Excel. Please try again.');
//     } finally {
//       setIsExporting(false);
//     }
//   };

//   const downloadPDF = () => {
//     setIsExporting(true);
//     try {
//       const doc = new jsPDF({ orientation: 'landscape' });
//       const pageWidth = doc.internal.pageSize.getWidth();

//       doc.setFontSize(16);
//       doc.text('Period Expense And Revenue Report', pageWidth / 2, 15, { align: 'center' });
//       doc.setFontSize(10);
//       doc.text(`Year: ${data.yearLabel}`, 14, 22);
//       doc.text(`Period: ${data.startDate} to ${data.endDate}`, 14, 28);
//       doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);

//       const tableOptions = {
//         theme: 'grid',
//         styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
//         headStyles: { fillColor: [66, 139, 202], fontSize: 7 },
//         margin: { top: 35 },
//         didDrawPage: function (pageData) {
//           const pageCount = doc.internal.getNumberOfPages();
//           doc.setFontSize(8);
//           doc.text(
//             `Page ${pageData.pageNumber} of ${pageCount}`,
//             pageWidth - 20,
//             doc.internal.pageSize.getHeight() - 10,
//             { align: 'right' }
//           );
//         },
//       };

//       const detailHead = [['Account No', 'Account Name', 'Department', ...MONTH_LABELS, 'Total']];
//       const detailBody = [];
//       revenueGroups.forEach((group) => {
//         detailBody.push([
//           { content: `${group.code} - ${group.name}`, colSpan: 16, styles: { fontStyle: 'bold', fillColor: [230, 240, 250] } },
//         ]);
//         group.accounts.forEach((acc) => {
//           acc.departments.forEach((dept, idx) => {
//             detailBody.push([
//               idx === 0 ? acc.code : '',
//               idx === 0 ? acc.accountName : '',
//               dept.storeName,
//               ...dept.Months.map((v) => (v ? fmt(v) : '')),
//               fmt(dept.Total),
//             ]);
//           });
//           detailBody.push([
//             '', `${acc.accountName} - Total`, '',
//             ...accountDeptMonths(acc).map((v) => fmt(v)),
//             fmt(accountDeptTotal(acc)),
//           ]);
//         });
//         detailBody.push([
//           '', `${group.name} - Total`, '',
//           ...group.Months.map((v) => fmt(v)),
//           fmt(group.Total),
//         ]);
//       });

//       autoTable(doc, {
//         ...tableOptions,
//         head: detailHead,
//         body: detailBody,
//         startY: 40,
//       });

//       const expenseHead = [['Account No', 'Account Name', ...MONTH_LABELS, 'Total']];
//       const expenseBody = [];
//       storeGroups.forEach((group) => {
//         expenseBody.push([
//           { content: group.storeName, colSpan: 14, styles: { fontStyle: 'bold', fillColor: [230, 240, 250] } },
//         ]);
//         group.accounts.forEach((acc) => {
//           expenseBody.push([
//             acc.code,
//             acc.accountName,
//             ...acc.Months.map((v) => (v ? fmt(v) : '')),
//             fmt(acc.Total),
//           ]);
//         });
//         const storeMonthTotals = MONTH_LABELS.map((_, i) =>
//           group.accounts.reduce((s, acc) => s + acc.Months[i], 0)
//         );
//         const storeTotal = group.accounts.reduce((s, acc) => s + acc.Total, 0);
//         expenseBody.push([
//           '', `${group.storeName} - Total`,
//           ...storeMonthTotals.map((v) => fmt(v)),
//           fmt(storeTotal),
//         ]);
//       });
//       expenseBody.push([
//         '', 'GRAND TOTAL',
//         ...expenseGrandMonths.map((v) => fmt(v)),
//         fmt(expenseGrandTotal),
//       ]);

//       autoTable(doc, {
//         ...tableOptions,
//         head: expenseHead,
//         body: expenseBody,
//         startY: doc.lastAutoTable.finalY + 10,
//       });

//       const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
//       doc.save(`Period_Expense_And_Revenue_Report_${timestamp}.pdf`);
//     } catch (error) {
//       console.error('Export to PDF failed:', error);
//       alert('Failed to export to PDF. Please try again.');
//     } finally {
//       setIsExporting(false);
//     }
//   };

//   const handlePrint = () => {
//     const printContent = document.getElementById('period-expense-revenue-report');
//     if (!printContent) {
//       alert('Report content not found.');
//       return;
//     }
//     const printWindow = window.open('', '_blank', 'width=1200,height=800');
//     printWindow.document.write(`
//       <html>
//         <head>
//           <title>Period Expense And Revenue Report</title>
//           <style>
//             body { font-family: 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif; padding: 20px; }
//             table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
//             th, td { padding: 6px 8px; border: 1px solid #ddd; font-size: 11px; }
//             th { background: #f8f9fa; font-weight: 600; }
//             .num { text-align: right; font-family: 'Courier New', monospace; }
//             tr.section-title td { background: #eef2f7; font-weight: bold; }
//           </style>
//         </head>
//         <body>${printContent.innerHTML}</body>
//       </html>
//     `);
//     printWindow.document.close();
//     printWindow.focus();
//     setTimeout(() => {
//       printWindow.print();
//       printWindow.close();
//     }, 500);
//   };

//   const renderMonthCells = (months, extra = {}) =>
//     months.map((v, i) => (
//       <td key={i} style={{ ...styles.tableCell, ...styles.amount, ...extra }}>{v ? fmt(v) : ''}</td>
//     ));

//   return (
//     <div style={styles.container} id="period-expense-revenue-report">
//       <ReportPopupHeader title="Period Expense And Revenue Report" />

//       {isExporting && (
//         <div style={styles.exportLoader}>
//           <div style={styles.exportLoaderContent}>
//             <div style={styles.spinner}></div>
//             <p>Exporting data...</p>
//           </div>
//         </div>
//       )}

//       {isLoading && (
//         <div style={styles.loader}>
//           <div style={styles.spinner}></div>
//           <p>Loading data...</p>
//         </div>
//       )}

//       <div style={styles.salesReportHeader}>
//         <div style={styles.companyInfo}>
//           <div style={styles.companyName}>Pearl Dynamic</div>
//           <div style={styles.companyAddress}>123 Business Avenue, City, Country</div>
//           <div style={styles.companyContact}>contact@faedibles.com | +1 (234) 567-8901</div>
//         </div>

//         <div style={styles.reportInfo}>
//           <div style={styles.reportTitle}>Period Expense And Revenue Report</div>
//           <div style={styles.reportDate}>Generated: {new Date().toLocaleDateString()}</div>
//           <div style={styles.reportRange}>Year: {data.yearLabel}</div>
//           <div style={styles.reportRange}>Period: {data.startDate} to {data.endDate}</div>
//           <div style={styles.reportRange}>Filter: Revenue (4xxx) then Expense (5xxx)</div>
//         </div>
//       </div>

//       {/* ================= REVENUE 4xxx ================= */}
//       <div style={styles.sectionBanner}>Revenue Accounts (4xxx)</div>

//       <div style={styles.sectionTitle}>4th Level Account / Department</div>
//       {revenueGroups.length > 0 ? (
//         revenueGroups.map((group, gi) => (
//           <div key={group.code || gi} style={{ marginBottom: '24px' }}>
//             <div style={styles.storeHeading}>
//               {group.code} - {group.name}
//               <span style={{ float: 'right', fontFamily: "'Courier New', monospace" }}>{fmt(group.Total)}</span>
//             </div>
//             <div style={styles.tableContainer}>
//               <table style={styles.salesDataTable}>
//                 <thead>
//                   <tr>
//                     <th style={{ ...styles.tableHeader, minWidth: '90px' }}>Account</th>
//                     <th style={{ ...styles.tableHeader, minWidth: '180px' }}>Account Name</th>
//                     <th style={{ ...styles.tableHeader, minWidth: '150px' }}>Department</th>
//                     {MONTH_LABELS.map((m) => (
//                       <th key={m} style={styles.tableHeader}>{m}</th>
//                     ))}
//                     <th style={{ ...styles.tableHeader, borderRight: 'none' }}>Total</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {group.accounts.map((acc, ai) => (
//                     <React.Fragment key={`${acc.code}-${ai}`}>
//                       {acc.departments.map((dept, di) => (
//                         <tr key={`${acc.code}-${dept.storeName}-${di}`} style={{ ...styles.tableRow, backgroundColor: di % 2 === 0 ? '#f8fafc' : '#ffffff' }}>
//                           <td style={{ ...styles.tableCell, fontFamily: "'Courier New', monospace" }}>{di === 0 ? acc.code : ''}</td>
//                           <td style={styles.tableCell}>{di === 0 ? acc.accountName : ''}</td>
//                           <td style={styles.tableCell}>{dept.storeName}</td>
//                           {renderMonthCells(dept.Months)}
//                           <td style={{ ...styles.tableCell, ...styles.amount, fontWeight: 'bold', borderRight: 'none' }}>{fmt(dept.Total)}</td>
//                         </tr>
//                       ))}
//                       <tr style={{ backgroundColor: '#eef2f7', fontWeight: 'bold' }}>
//                         <td colSpan={2} style={{ ...styles.tableCell, textAlign: 'right' }}>{acc.accountName} - Total</td>
//                         <td style={styles.tableCell}></td>
//                         {accountDeptMonths(acc).map((v, i) => (
//                           <td key={i} style={{ ...styles.tableCell, ...styles.amount, fontWeight: 'bold' }}>{fmt(v)}</td>
//                         ))}
//                         <td style={{ ...styles.tableCell, ...styles.amount, fontWeight: 'bold', borderRight: 'none' }}>
//                           {fmt(accountDeptTotal(acc))}
//                         </td>
//                       </tr>
//                     </React.Fragment>
//                   ))}
//                 </tbody>
//                 <tfoot>
//                   <tr style={{ backgroundColor: '#eef2f7', fontWeight: 'bold' }}>
//                     <td colSpan={3} style={{ ...styles.tableCell, textAlign: 'right', fontWeight: 'bold' }}>
//                       {group.name} - Total
//                     </td>
//                     {group.Months.map((v, i) => (
//                       <td key={i} style={{ ...styles.tableCell, ...styles.amount, fontWeight: 'bold' }}>{fmt(v)}</td>
//                     ))}
//                     <td style={{ ...styles.tableCell, ...styles.amount, fontWeight: 'bold', borderRight: 'none' }}>
//                       {fmt(group.Total)}
//                     </td>
//                   </tr>
//                 </tfoot>
//               </table>
//             </div>
//           </div>
//         ))
//       ) : (
//         !isLoading && (
//           <div style={{ ...styles.sectionTitle, textAlign: 'center', color: '#95a5a6', fontStyle: 'italic' }}>
//             No 4th level revenue data available
//           </div>
//         )
//       )}

//       {/* ================= EXPENSE 5xxx ================= */}
//       <div style={{ ...styles.sectionBanner, background: '#b45309', marginTop: '28px' }}>Expense Accounts (5xxx)</div>

//       {storeGroups.length > 0 ? (
//         storeGroups.map((group, gi) => {
//           const storeMonthTotals = MONTH_LABELS.map((_, i) =>
//             group.accounts.reduce((s, acc) => s + acc.Months[i], 0)
//           );
//           const storeTotal = group.accounts.reduce((s, acc) => s + acc.Total, 0);

//           return (
//             <div key={gi} style={{ marginBottom: '24px' }}>
//               <div style={styles.storeHeading}>{group.storeName}</div>
//               <div style={styles.tableContainer}>
//                 <table style={styles.salesDataTable}>
//                   <thead>
//                     <tr>
//                       <th style={{ ...styles.tableHeader, minWidth: '90px' }}>Account No</th>
//                       <th style={{ ...styles.tableHeader, minWidth: '220px' }}>Account Name</th>
//                       {MONTH_LABELS.map((m) => (
//                         <th key={m} style={styles.tableHeader}>{m}</th>
//                       ))}
//                       <th style={{ ...styles.tableHeader, borderRight: 'none' }}>Total</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {group.accounts.map((acc, ai) => (
//                       <tr key={ai} style={{ ...styles.tableRow, backgroundColor: ai % 2 === 0 ? '#f8fafc' : '#ffffff' }}>
//                         <td style={{ ...styles.tableCell, fontFamily: "'Courier New', monospace" }}>{acc.code}</td>
//                         <td style={styles.tableCell}>{acc.accountName}</td>
//                         {renderMonthCells(acc.Months)}
//                         <td style={{ ...styles.tableCell, ...styles.amount, fontWeight: 'bold', borderRight: 'none' }}>{fmt(acc.Total)}</td>
//                       </tr>
//                     ))}
//                   </tbody>
//                   <tfoot>
//                     <tr style={{ backgroundColor: '#eef2f7', fontWeight: 'bold' }}>
//                       <td colSpan={2} style={{ ...styles.tableCell, textAlign: 'right', fontWeight: 'bold' }}>
//                         {group.storeName} - Total
//                       </td>
//                       {storeMonthTotals.map((v, i) => (
//                         <td key={i} style={{ ...styles.tableCell, ...styles.amount, fontWeight: 'bold' }}>{fmt(v)}</td>
//                       ))}
//                       <td style={{ ...styles.tableCell, ...styles.amount, fontWeight: 'bold', borderRight: 'none' }}>
//                         {fmt(storeTotal)}
//                       </td>
//                     </tr>
//                   </tfoot>
//                 </table>
//               </div>
//             </div>
//           );
//         })
//       ) : (
//         !isLoading && (
//           <div style={{ ...styles.sectionTitle, textAlign: 'center', color: '#95a5a6', fontStyle: 'italic' }}>
//             No expense data available for the selected year (5xxx accounts only)
//           </div>
//         )
//       )}

//       {storeGroups.length > 0 && (
//         <div style={styles.tableContainer}>
//           <table style={styles.salesDataTable}>
//             <thead>
//               <tr>
//                 <th style={{ ...styles.tableHeader, minWidth: '90px' }}>Account No</th>
//                 <th style={{ ...styles.tableHeader, minWidth: '220px' }}>Account Name</th>
//                 {MONTH_LABELS.map((m) => (
//                   <th key={m} style={styles.tableHeader}>{m}</th>
//                 ))}
//                 <th style={{ ...styles.tableHeader, borderRight: 'none' }}>Total</th>
//               </tr>
//             </thead>
//             <tfoot>
//               <tr style={{ backgroundColor: '#2c3e50', color: 'white' }}>
//                 <td colSpan={2} style={{ ...styles.tableCell, textAlign: 'right', fontWeight: 'bold', borderRight: 'none', color: 'white' }}>EXPENSE GRAND TOTAL</td>
//                 {expenseGrandMonths.map((v, i) => (
//                   <td key={i} style={{ ...styles.tableCell, ...styles.amount, fontWeight: 'bold', color: 'white' }}>{v ? fmt(v) : ''}</td>
//                 ))}
//                 <td style={{ ...styles.tableCell, ...styles.amount, fontWeight: 'bold', borderRight: 'none', color: 'white' }}>{fmt(expenseGrandTotal)}</td>
//               </tr>
//             </tfoot>
//           </table>
//         </div>
//       )}

//       <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
//         <button onClick={downloadExcel} style={styles.exportBtn} disabled={isExporting}>
//           📊 Export Excel
//         </button>
//         <button onClick={downloadPDF} style={styles.exportBtn} disabled={isExporting}>
//           📄 Export PDF
//         </button>
//         <button onClick={handlePrint} style={styles.exportBtn} disabled={isExporting}>
//           🖨️ Print
//         </button>
//       </div>
//     </div>
//   );
// };

// const styles = {
//   container: {
//     fontFamily: "'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif",
//     background: '#fff',
//     borderRadius: '8px',
//     boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
//     padding: '24px',
//     margin: '20px auto',
//     maxWidth: '1600px',
//     color: '#333',
//     position: 'relative',
//     overflow: 'scroll',
//   },
//   loader: {
//     position: 'fixed',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     backgroundColor: 'rgba(0, 0, 0, 0.5)',
//     display: 'flex',
//     justifyContent: 'center',
//     alignItems: 'center',
//     zIndex: 9999,
//     flexDirection: 'column',
//     color: 'white',
//   },
//   exportLoader: {
//     position: 'fixed',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     backgroundColor: 'rgba(0, 0, 0, 0.3)',
//     display: 'flex',
//     justifyContent: 'center',
//     alignItems: 'center',
//     zIndex: 9998,
//   },
//   exportLoaderContent: {
//     background: 'white',
//     padding: '30px',
//     borderRadius: '8px',
//     boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
//     textAlign: 'center',
//   },
//   spinner: {
//     border: '4px solid #f3f3f3',
//     borderTop: '4px solid #3b82f6',
//     borderRadius: '50%',
//     width: '48px',
//     height: '48px',
//     animation: 'spin 1s linear infinite',
//     margin: '0 auto 15px',
//   },
//   salesReportHeader: {
//     display: 'flex',
//     justifyContent: 'space-between',
//     alignItems: 'flex-start',
//     marginBottom: '24px',
//     paddingBottom: '20px',
//     borderBottom: '1px solid #eaeaea',
//   },
//   companyInfo: { textAlign: 'left' },
//   companyName: { fontSize: '24px', fontWeight: '700', color: '#2c3e50', margin: '0 0 8px 0' },
//   companyAddress: { fontSize: '12px', color: '#7f8c8d', margin: '4px 0' },
//   companyContact: { fontSize: '12px', color: '#7f8c8d', margin: '4px 0' },
//   reportInfo: { textAlign: 'right' },
//   reportTitle: { fontSize: '20px', fontWeight: '600', color: '#3498db', margin: '0 0 8px 0' },
//   reportDate: { fontSize: '12px', color: '#7f8c8d', margin: '4px 0' },
//   reportRange: { fontSize: '12px', color: '#7f8c8d', margin: '4px 0' },
//   sectionBanner: {
//     fontSize: '17px',
//     fontWeight: '700',
//     color: '#fff',
//     padding: '10px 14px',
//     background: '#1d4ed8',
//     borderRadius: '4px',
//     marginBottom: '12px',
//   },
//   sectionTitle: {
//     fontSize: '16px',
//     fontWeight: '700',
//     color: '#2c3e50',
//     padding: '8px 12px',
//     background: '#f1f5f9',
//     borderRadius: '4px',
//     marginBottom: '10px',
//   },
//   storeHeading: {
//     fontSize: '15px',
//     fontWeight: '700',
//     color: '#fff',
//     padding: '8px 14px',
//     background: '#3b82f6',
//     borderRadius: '4px',
//     marginBottom: '0',
//   },
//   tableContainer: { overflowX: 'auto', overflowY: 'hidden', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '4px', WebkitOverflowScrolling: 'touch', minHeight: '60px' },
//   salesDataTable: { minWidth: '1100px', borderCollapse: 'collapse', fontSize: '12px', width: '100%' },
//   tableHeader: { background: '#f1f5f9', padding: '10px 8px', textAlign: 'left', fontWeight: '600', color: '#1e293b', borderBottom: '2px solid #94a3b8', borderRight: '1px solid #cbd5e1', whiteSpace: 'nowrap', position: 'sticky', top: 0 },
//   tableRow: { borderBottom: '1px solid #e2e8f0' },
//   tableCell: { padding: '8px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' },
//   amount: { textAlign: 'right', fontFamily: "'Courier New', monospace" },
//   noData: { textAlign: 'center', padding: '30px', color: '#95a5a6', fontStyle: 'italic' },
//   exportBtn: {
//     padding: '8px 16px',
//     border: '1px solid #d1d5db',
//     borderRadius: '6px',
//     background: '#f8fafc',
//     cursor: 'pointer',
//     fontSize: '13px',
//     fontWeight: '500',
//     color: '#374151',
//   },
// };

// export default PeriodExpenseAndRevenueReportPopup;
import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import { exportProfessionalExcel } from '../../../../utils/exportProfessionalExcel';
import autoTable from 'jspdf-autotable';
import { getDataFundtion } from '../../../../Api/CRUDFunctions';
import ReportPopupHeader from '../../../../Components/Global/ReportPopupHeader.jsx';

const MONTH_LABELS = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

// Same column widths on account/department tables and store-wise tables, so Jul lines up.
const REPORT_COLS = { account: 160, name: 340, department: 220, month: 160, total: 180 };
const REPORT_TABLE_WIDTH =
  REPORT_COLS.account + REPORT_COLS.name + REPORT_COLS.department + (REPORT_COLS.month * 12) + REPORT_COLS.total;

// Expense 4th level is only these stage-3 department parents.
const DEPT_PARENT_CODES = ['50101', '50201', '50301'];

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ZERO_MONTHS = Array(12).fill(0);

const EMPTY_TOTALS = {
  revenueMonths: ZERO_MONTHS,
  revenueTotal: 0,
  expenseDeptMonths: ZERO_MONTHS,
  expenseDeptTotal: 0,
  expenseGrandMonths: ZERO_MONTHS,
  expenseGrandTotal: 0,
};

// ---------- Safe helpers (backend se Months miss ho to crash na ho) ----------
const safeMonths = (m) => (Array.isArray(m) ? m : ZERO_MONTHS);

const sumDeptMonths = (departments = []) =>
  MONTH_LABELS.map((_, i) =>
    (departments || []).reduce((s, d) => s + (d?.Months?.[i] || 0), 0)
  );

// Account level: backend de to wahi use karo, warna departments se calculate
const getAccMonths = (acc) =>
  Array.isArray(acc?.Months) ? acc.Months : sumDeptMonths(acc?.departments);

const getAccTotal = (acc) =>
  acc?.Total ?? (acc?.departments || []).reduce((s, d) => s + (d?.Total || 0), 0);

const asList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

const toFiscalMonth = (calMonth) => (calMonth - 6 + 12) % 12;
const emptyMonths = () => Array.from({ length: 12 }, () => 0);
const round2 = (n) => Number(Number(n || 0).toFixed(2));
const monthsTotal = (months) => (months || []).reduce((sum, value) => sum + (Number(value) || 0), 0);

const addMonthAmount = (bucket, accountId, storeName, fiscalIdx, amount) => {
  if (!bucket[accountId]) bucket[accountId] = {};
  if (!bucket[accountId][storeName]) bucket[accountId][storeName] = emptyMonths();
  bucket[accountId][storeName][fiscalIdx] += amount;
};

const isStage4Account = (acc) => {
  if (acc.stage === '4') return true;
  if (acc.stage === '1' || acc.stage === '2' || acc.stage === '3') return false;
  return (acc.code || '').length > 5;
};

const REPORT_API = 'GernalLager/PeriodExpenseRevenueReport';

const accountCodeOf = (acc) => String(acc?.code || acc?.AccountCode || acc?.accountCode || '').trim();

const deptParentCode = (code) =>
  DEPT_PARENT_CODES.find((parent) => String(code || '').trim().startsWith(parent)) || '';

const unwrapReport = (res) => {
  if (!res) return {};
  if (Array.isArray(res)) return { rows: res };
  if (res.expenseDeptGroups || res.storeGroups || res.accounts || res.rows) return res;
  if (Array.isArray(res.data)) return { rows: res.data };
  if (res.data && typeof res.data === 'object') return res.data;
  return {};
};

const numericMonths = (source) => {
  const list = source?.Months || source?.months;
  if (!Array.isArray(list)) return null;
  const months = emptyMonths();
  list.forEach((value, index) => {
    if (index < 12) months[index] = Number(value) || 0;
  });
  return months;
};

// 50101 / 50201 / 50301 accounts from PeriodExpenseRevenueReport, split by store.
const buildDeptGroupsFromReport = (report, { accountById, stage3ByCode, resolveStore }) => {
  const nameByCode = {};
  Object.values(accountById || {}).forEach((acc) => {
    if (acc.code) nameByCode[acc.code] = acc.name;
  });

  const bucket = {};
  DEPT_PARENT_CODES.forEach((code) => {
    bucket[code] = { code, name: stage3ByCode[code]?.name || code, accounts: {} };
  });

  const addLine = (code, accountName, storeName, months) => {
    const parent = deptParentCode(code);
    const group = parent && bucket[parent];
    if (!group || !months) return;
    const cleanCode = String(code).trim();
    if (!group.accounts[cleanCode]) {
      group.accounts[cleanCode] = {
        code: cleanCode,
        accountName: accountName || nameByCode[cleanCode] || cleanCode,
        stores: {},
      };
    }
    const acc = group.accounts[cleanCode];
    if (accountName && acc.accountName === acc.code) acc.accountName = accountName;
    const store = resolveStore(storeName);
    if (!acc.stores[store]) acc.stores[store] = emptyMonths();
    months.forEach((value, index) => {
      if (index < 12) acc.stores[store][index] += Number(value) || 0;
    });
  };

  const takeAccount = (acc, fallbackStore) => {
    const code = accountCodeOf(acc);
    if (!deptParentCode(code)) return;
    const accountName = acc.accountName || acc.AccountName || acc.name || nameByCode[code] || '';
    const departments = acc.departments || acc.stores || [];
    if (Array.isArray(departments) && departments.length && (departments[0]?.storeName || departments[0]?.StoreName || departments[0]?.Months || departments[0]?.months)) {
      departments.forEach((dept) => {
        const months = numericMonths(dept);
        if (!months) return;
        addLine(code, accountName, dept.storeName || dept.StoreName || dept.Department || dept.department || fallbackStore, months);
      });
      return;
    }
    const months = numericMonths(acc);
    if (!months) return;
    addLine(code, accountName, acc.storeName || acc.StoreName || acc.Department || fallbackStore, months);
  };

  const grouped = Array.isArray(report.expenseDeptGroups) ? report.expenseDeptGroups : [];
  const groupedHasDept = grouped.some((group) =>
    (group.accounts || []).some((acc) => deptParentCode(accountCodeOf(acc)))
  );
  const storeGroups = Array.isArray(report.storeGroups) ? report.storeGroups : [];
  const storeHasDept = storeGroups.some((group) =>
    (group.accounts || []).some((acc) => deptParentCode(accountCodeOf(acc)))
  );

  if (groupedHasDept) {
    grouped.forEach((group) => {
      const parent = deptParentCode(group.code);
      if (parent && group.name && bucket[parent].name === parent) bucket[parent].name = group.name;
      (group.accounts || []).forEach((acc) => takeAccount(acc, group.storeName));
    });
  } else if (storeHasDept) {
    storeGroups.forEach((group) => {
      (group.accounts || []).forEach((acc) => takeAccount(acc, group.storeName));
    });
  } else {
    const rows = Array.isArray(report.rows) ? report.rows : (Array.isArray(report.accounts) ? report.accounts : []);
    rows.forEach((item) => {
      if (item.Type === 'VoucherBefore') return;
      const code = accountCodeOf(item) || accountById[item.Account]?.code || '';
      if (!deptParentCode(code)) return;
      const ready = numericMonths(item);
      if (ready) {
        takeAccount({ ...item, code }, item.storeName || item.StoreName || item.store || item.Store);
        return;
      }
      const debit = Number(item.Debit) || 0;
      const credit = Number(item.Credit) || 0;
      if (debit === 0 && credit === 0) return;
      const date = item.VoucherDate ? new Date(item.VoucherDate) : null;
      if (!date || Number.isNaN(date.getTime())) return;
      const months = emptyMonths();
      months[toFiscalMonth(date.getMonth())] = debit - credit;
      addLine(
        code,
        item.AccountName || item.accountName || item.name,
        item.storeName || item.StoreName || item.store || item.Store,
        months
      );
    });
  }

  return DEPT_PARENT_CODES
    .map((code) => bucket[code])
    .map((group) => {
      const accounts = Object.values(group.accounts)
        .map((acc) => {
          const departments = Object.entries(acc.stores)
            .map(([storeName, rawMonths]) => {
              const months = rawMonths.map(round2);
              return { storeName, Months: months, Total: round2(monthsTotal(months)) };
            })
            .filter((dept) => !(dept.Total === 0 && dept.Months.every((value) => value === 0)))
            .sort((a, b) => a.storeName.localeCompare(b.storeName));
          const months = sumDeptMonths(departments).map(round2);
          return {
            code: acc.code,
            accountName: acc.accountName,
            departments,
            Months: months,
            Total: round2(monthsTotal(months)),
          };
        })
        .filter((acc) => acc.departments.length > 0)
        .sort((a, b) => (parseFloat(a.code) || 0) - (parseFloat(b.code) || 0));
      const months = sumDeptMonths(accounts.map((acc) => ({ Months: acc.Months }))).map(round2);
      return { code: group.code, name: group.name, Months: months, Total: round2(monthsTotal(months)), accounts };
    })
    .filter((group) => group.accounts.length > 0);
};

const PeriodExpenseAndRevenueReportPopup = ({ data }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  // Backend se aane wala data:
  // revenueGroups / expenseDeptGroups:
  //   [{ code, name, Months[], Total, accounts: [{ code, accountName, Months[], Total, departments: [{ storeName, Months[], Total }] }] }]
  // storeGroups:
  //   [{ storeName, Months[], Total, accounts: [{ code, accountName, Months[], Total }] }]
  const [revenueGroups, setRevenueGroups] = useState([]);
  const [expenseDeptGroups, setExpenseDeptGroups] = useState([]);
  const [storeGroups, setStoreGroups] = useState([]);
  const [totals, setTotals] = useState(EMPTY_TOTALS);

  const getData = async () => {
    try {
      setIsLoading(true);

      // Single fast API — Mongo aggregates by account/store/month (no full ledger dump)
      const report = unwrapReport(
        await getDataFundtion(
          `${REPORT_API}?startDate=${data.startDate}&endDate=${data.endDate}`
        )
      );

      const revenueGroupList = Array.isArray(report.revenueGroups) ? report.revenueGroups : [];
      const expenseDeptList = Array.isArray(report.expenseDeptGroups) ? report.expenseDeptGroups : [];
      const storeGroupList = Array.isArray(report.storeGroups) ? report.storeGroups : [];
      const t = report.totals || {};

      const revenueMonths = Array.isArray(t.revenueMonths)
        ? t.revenueMonths.map(round2)
        : sumDeptMonths(revenueGroupList.map((group) => ({ Months: group.Months }))).map(round2);
      const expenseDeptMonths = Array.isArray(t.expenseDeptMonths)
        ? t.expenseDeptMonths.map(round2)
        : sumDeptMonths(expenseDeptList.map((group) => ({ Months: group.Months }))).map(round2);
      const storeMonths = sumDeptMonths(storeGroupList.map((group) => ({ Months: group.Months }))).map(round2);
      const expenseGrandMonths = Array.isArray(t.expenseGrandMonths)
        ? t.expenseGrandMonths.map(round2)
        : MONTH_LABELS.map((_, index) => round2((expenseDeptMonths[index] || 0) + (storeMonths[index] || 0)));

      setRevenueGroups(revenueGroupList);
      setExpenseDeptGroups(expenseDeptList);
      setStoreGroups(storeGroupList);
      setTotals({
        revenueMonths,
        revenueTotal: round2(t.revenueTotal ?? monthsTotal(revenueMonths)),
        expenseDeptMonths,
        expenseDeptTotal: round2(t.expenseDeptTotal ?? monthsTotal(expenseDeptMonths)),
        expenseGrandMonths,
        expenseGrandTotal: round2(t.expenseGrandTotal ?? monthsTotal(expenseGrandMonths)),
      });
    } catch (err) {
      console.error('Error fetching expense and revenue report data:', err);
      setRevenueGroups([]);
      setExpenseDeptGroups([]);
      setStoreGroups([]);
      setTotals(EMPTY_TOTALS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  const revenueTotalMonths = safeMonths(totals.revenueMonths);
  const revenueGrandTotal = totals.revenueTotal || 0;
  const expenseDeptTotalMonths = safeMonths(totals.expenseDeptMonths);
  const expenseDeptGrandTotal = totals.expenseDeptTotal || 0;
  const expenseGrandMonths = safeMonths(totals.expenseGrandMonths);
  const expenseGrandTotal = totals.expenseGrandTotal || 0;

  const downloadExcel = async () => {
    setIsExporting(true);
    try {
      const exportRows = [];

      const blankMonthRow = (accountNo, accountName, department) => {
        const row = {
          'Account No': accountNo,
          'Account Name': accountName,
          Department: department || '',
        };
        MONTH_LABELS.forEach((label) => { row[label] = ''; });
        row.Total = '';
        return row;
      };

      const amountRow = (accountNo, accountName, department, months, total) => {
        const safe = safeMonths(months);
        const row = {
          'Account No': accountNo,
          'Account Name': accountName,
          Department: department || '',
        };
        MONTH_LABELS.forEach((label, i) => {
          row[label] = safe[i] || '';
        });
        row.Total = total;
        return row;
      };

      exportRows.push(blankMonthRow('', 'REVENUE (4xxx) - Account / Department', ''));

      revenueGroups.forEach((group) => {
        exportRows.push(blankMonthRow(group.code, group.name, ''));
        (group.accounts || []).forEach((acc) => {
          (acc.departments || []).forEach((dept, idx) => {
            exportRows.push(amountRow(
              idx === 0 ? acc.code : '',
              idx === 0 ? acc.accountName : '',
              dept.storeName,
              dept.Months,
              dept.Total
            ));
          });
          exportRows.push(amountRow('', `${acc.accountName} - Total`, '', getAccMonths(acc), getAccTotal(acc)));
        });
        exportRows.push(amountRow('', `${group.name} - Total`, '', group.Months, group.Total));
      });
      exportRows.push(amountRow('', 'REVENUE TOTAL', '', revenueTotalMonths, revenueGrandTotal));

      exportRows.push(blankMonthRow('', '', ''));
      exportRows.push(blankMonthRow('', 'EXPENSE (5xxx) - 4th Level Account / Department (50101 / 50201 / 50301)', ''));

      expenseDeptGroups.forEach((group) => {
        exportRows.push(blankMonthRow(group.code, group.name, ''));
        (group.accounts || []).forEach((acc) => {
          (acc.departments || []).forEach((dept, idx) => {
            exportRows.push(amountRow(
              idx === 0 ? acc.code : '',
              idx === 0 ? acc.accountName : '',
              dept.storeName,
              dept.Months,
              dept.Total
            ));
          });
          exportRows.push(amountRow('', `${acc.accountName} - Total`, '', getAccMonths(acc), getAccTotal(acc)));
        });
        exportRows.push(amountRow('', `${group.name} - Total`, '', group.Months, group.Total));
      });
      if (expenseDeptGroups.length > 0) {
        exportRows.push(amountRow('', 'DEPARTMENT EXPENSE TOTAL', '', expenseDeptTotalMonths, expenseDeptGrandTotal));
      }

      exportRows.push(blankMonthRow('', '', ''));
      exportRows.push(blankMonthRow('', 'EXPENSE (5xxx) - Store Wise Breakup', ''));

      storeGroups.forEach((group) => {
        exportRows.push(blankMonthRow(group.storeName, '', ''));
        (group.accounts || []).forEach((acc) => {
          exportRows.push(amountRow(acc.code, acc.accountName, '', acc.Months, acc.Total));
        });
        exportRows.push(amountRow('', `${group.storeName} - Total`, '', group.Months, group.Total));
      });
      exportRows.push(amountRow('', 'EXPENSE GRAND TOTAL', '', expenseGrandMonths, expenseGrandTotal));

      await exportProfessionalExcel({
        title: 'Period Expense And Revenue Report',
        fileName: 'Period_Expense_And_Revenue_Report',
        sheetName: 'Expense And Revenue',
        rows: exportRows,
        meta: [
          `Year: ${data.yearLabel}`,
          `Period: ${data.startDate} to ${data.endDate}`,
          'Revenue accounts (4xxx) then expense accounts (5xxx)',
        ],
        excludeKeys: ['_id', 'id'],
      });
    } catch (error) {
      console.error('Export to Excel failed:', error);
      alert('Failed to export to Excel. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const downloadPDF = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFontSize(16);
      doc.text('Period Expense And Revenue Report', pageWidth / 2, 15, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Year: ${data.yearLabel}`, 14, 22);
      doc.text(`Period: ${data.startDate} to ${data.endDate}`, 14, 28);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);

      const tableOptions = {
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
        headStyles: { fillColor: [66, 139, 202], fontSize: 7 },
        margin: { top: 35 },
        didDrawPage: function (pageData) {
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.text(
            `Page ${pageData.pageNumber} of ${pageCount}`,
            pageWidth - 20,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'right' }
          );
        },
      };

      const detailHead = [['Account No', 'Account Name', 'Department', ...MONTH_LABELS, 'Total']];

      const buildDeptBody = (groups) => {
        const body = [];
        groups.forEach((group) => {
          body.push([
            { content: `${group.code} - ${group.name}`, colSpan: 16, styles: { fontStyle: 'bold', fillColor: [230, 240, 250] } },
          ]);
          (group.accounts || []).forEach((acc) => {
            (acc.departments || []).forEach((dept, idx) => {
              body.push([
                idx === 0 ? acc.code : '',
                idx === 0 ? acc.accountName : '',
                dept.storeName,
                ...safeMonths(dept.Months).map((v) => (v ? fmt(v) : '')),
                fmt(dept.Total),
              ]);
            });
            body.push([
              '', `${acc.accountName} - Total`, '',
              ...getAccMonths(acc).map((v) => fmt(v)),
              fmt(getAccTotal(acc)),
            ]);
          });
          body.push([
            '', `${group.name} - Total`, '',
            ...safeMonths(group.Months).map((v) => fmt(v)),
            fmt(group.Total),
          ]);
        });
        return body;
      };

      autoTable(doc, {
        ...tableOptions,
        head: detailHead,
        body: buildDeptBody(revenueGroups),
        startY: 40,
      });

      const expenseDeptBody = buildDeptBody(expenseDeptGroups);
      if (expenseDeptBody.length > 0) {
        autoTable(doc, {
          ...tableOptions,
          head: detailHead,
          body: expenseDeptBody,
          startY: doc.lastAutoTable.finalY + 10,
        });
      }

      const expenseHead = [['Account No', 'Account Name', ...MONTH_LABELS, 'Total']];
      const expenseBody = [];
      storeGroups.forEach((group) => {
        expenseBody.push([
          { content: group.storeName, colSpan: 14, styles: { fontStyle: 'bold', fillColor: [230, 240, 250] } },
        ]);
        (group.accounts || []).forEach((acc) => {
          expenseBody.push([
            acc.code,
            acc.accountName,
            ...safeMonths(acc.Months).map((v) => (v ? fmt(v) : '')),
            fmt(acc.Total),
          ]);
        });
        expenseBody.push([
          '', `${group.storeName} - Total`,
          ...safeMonths(group.Months).map((v) => fmt(v)),
          fmt(group.Total),
        ]);
      });
      expenseBody.push([
        '', 'GRAND TOTAL',
        ...expenseGrandMonths.map((v) => fmt(v)),
        fmt(expenseGrandTotal),
      ]);

      autoTable(doc, {
        ...tableOptions,
        head: expenseHead,
        body: expenseBody,
        startY: (doc.lastAutoTable?.finalY ?? 40) + 10,
      });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      doc.save(`Period_Expense_And_Revenue_Report_${timestamp}.pdf`);
    } catch (error) {
      console.error('Export to PDF failed:', error);
      alert('Failed to export to PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('period-expense-revenue-report');
    if (!printContent) {
      alert('Report content not found.');
      return;
    }
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    printWindow.document.write(`
      <html>
        <head>
          <title>Period Expense And Revenue Report</title>
          <style>
            body { font-family: 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            th, td { padding: 6px 8px; border: 1px solid #ddd; font-size: 11px; }
            th { background: #f8f9fa; font-weight: 600; }
            .num { text-align: right; font-family: 'Courier New', monospace; }
            tr.section-title td { background: #eef2f7; font-weight: bold; }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const fixedCol = (width, extra = {}) => ({
    width,
    minWidth: width,
    maxWidth: width,
    boxSizing: 'border-box',
    ...extra,
  });

  const renderColGroup = () => (
    <colgroup>
      <col style={{ width: REPORT_COLS.account }} />
      <col style={{ width: REPORT_COLS.name }} />
      <col style={{ width: REPORT_COLS.department }} />
      {MONTH_LABELS.map((month) => <col key={month} style={{ width: REPORT_COLS.month }} />)}
      <col style={{ width: REPORT_COLS.total }} />
    </colgroup>
  );

  const renderLeadHeaders = () => (
    <>
      <th style={{ ...styles.tableHeader, ...fixedCol(REPORT_COLS.account) }}>Account</th>
      <th style={{ ...styles.tableHeader, ...fixedCol(REPORT_COLS.name) }}>Account Name</th>
      <th style={{ ...styles.tableHeader, ...fixedCol(REPORT_COLS.department) }}>Department</th>
    </>
  );

  const storeNameWidth = REPORT_COLS.name + REPORT_COLS.department;

  const renderStoreColGroup = () => (
    <colgroup>
      <col style={{ width: REPORT_COLS.account }} />
      <col style={{ width: storeNameWidth }} />
      {MONTH_LABELS.map((month) => <col key={month} style={{ width: REPORT_COLS.month }} />)}
      <col style={{ width: REPORT_COLS.total }} />
    </colgroup>
  );

  const renderStoreLeadHeaders = () => (
    <>
      <th style={{ ...styles.tableHeader, ...fixedCol(REPORT_COLS.account) }}>Account</th>
      <th style={{ ...styles.tableHeader, ...fixedCol(storeNameWidth) }}>Account Name</th>
    </>
  );

  const renderMonthHeader = () =>
    MONTH_LABELS.map((m) => (
      <th key={m} style={{ ...styles.tableHeader, ...styles.monthCol }}>{m}</th>
    ));

  const renderMonthCells = (months, extra = {}) =>
    safeMonths(months).map((v, i) => (
      <td key={i} style={{ ...styles.tableCell, ...styles.amount, ...styles.monthCol, ...extra }}>{v ? fmt(v) : ''}</td>
    ));

  const renderScrollTable = (colGroup, leadHeaders, body, foot) => (
    <div style={styles.tableContainer}>
      <table style={styles.salesDataTable}>
        {colGroup}
        <thead>
          <tr>
            {leadHeaders}
            {renderMonthHeader()}
            <th style={{ ...styles.tableHeader, ...fixedCol(REPORT_COLS.total), borderRight: 'none' }}>Total</th>
          </tr>
        </thead>
        {body}
        {foot}
      </table>
    </div>
  );

  const renderDepartmentGroups = (groups, emptyMessage) => (
    groups.length > 0 ? (
      groups.map((group, gi) => (
        <div key={group.code || gi} style={{ marginBottom: '24px' }}>
          <div style={styles.storeHeading}>
            {group.code} - {group.name}
            <span style={{ float: 'right', fontFamily: "'Courier New', monospace" }}>{fmt(group.Total)}</span>
          </div>
          {(group.accounts || []).map((acc, ai) => (
            <div key={`${acc.code}-${ai}`} style={{ marginBottom: '10px' }}>
              {renderScrollTable(
                renderColGroup(),
                renderLeadHeaders(),
                <tbody>
                  {(acc.departments || []).map((dept, di) => (
                    <tr key={`${acc.code}-${dept.storeName}-${di}`} style={{ ...styles.tableRow, backgroundColor: di % 2 === 0 ? '#f8fafc' : '#ffffff' }}>
                      <td style={{ ...styles.tableCell, fontFamily: "'Courier New', monospace" }}>{di === 0 ? acc.code : ''}</td>
                      <td style={styles.tableCell}>{di === 0 ? acc.accountName : ''}</td>
                      <td style={styles.tableCell}>{dept.storeName}</td>
                      {renderMonthCells(dept.Months)}
                      <td style={{ ...styles.tableCell, ...styles.amount, fontWeight: 'bold', borderRight: 'none' }}>{fmt(dept.Total)}</td>
                    </tr>
                  ))}
                  <tr style={{ backgroundColor: '#eef2f7', fontWeight: 'bold' }}>
                    <td colSpan={2} style={{ ...styles.tableCell, textAlign: 'right' }}>{acc.accountName} - Total</td>
                    <td style={styles.tableCell}></td>
                    {renderMonthCells(getAccMonths(acc), { fontWeight: 'bold' })}
                    <td style={{ ...styles.tableCell, ...styles.amount, fontWeight: 'bold', borderRight: 'none' }}>
                      {fmt(getAccTotal(acc))}
                    </td>
                  </tr>
                </tbody>
              )}
            </div>
          ))}
          {renderScrollTable(
            renderColGroup(),
            renderLeadHeaders(),
            null,
            <tfoot>
              <tr style={{ backgroundColor: '#eef2f7', fontWeight: 'bold' }}>
                <td colSpan={3} style={{ ...styles.tableCell, textAlign: 'right', fontWeight: 'bold' }}>
                  {group.name} - Total
                </td>
                {renderMonthCells(group.Months, { fontWeight: 'bold' })}
                <td style={{ ...styles.tableCell, ...styles.amount, fontWeight: 'bold', borderRight: 'none' }}>
                  {fmt(group.Total)}
                </td>
              </tr>
            </tfoot>
          )}
        </div>
      ))
    ) : (
      !isLoading && (
        <div style={{ ...styles.sectionTitle, textAlign: 'center', color: '#95a5a6', fontStyle: 'italic' }}>
          {emptyMessage}
        </div>
      )
    )
  );

  return (
    <div style={styles.container} id="period-expense-revenue-report">
      <ReportPopupHeader title="Period Expense And Revenue Report" />

      {isExporting && (
        <div style={styles.exportLoader}>
          <div style={styles.exportLoaderContent}>
            <div style={styles.spinner}></div>
            <p>Exporting data...</p>
          </div>
        </div>
      )}

      {isLoading && (
        <div style={styles.loader}>
          <div style={styles.spinner}></div>
          <p>Loading data...</p>
        </div>
      )}

      <div style={styles.salesReportHeader}>
        <div style={styles.companyInfo}>
          <div style={styles.companyName}>Pearl Dynamic</div>
          <div style={styles.companyAddress}>123 Business Avenue, City, Country</div>
          <div style={styles.companyContact}>contact@faedibles.com | +1 (234) 567-8901</div>
        </div>

        <div style={styles.reportInfo}>
          <div style={styles.reportTitle}>Period Expense And Revenue Report</div>
          <div style={styles.reportDate}>Generated: {new Date().toLocaleDateString()}</div>
          <div style={styles.reportRange}>Year: {data.yearLabel}</div>
          <div style={styles.reportRange}>Period: {data.startDate} to {data.endDate}</div>
          <div style={styles.reportRange}>Filter: Revenue (4xxx) then Expense (5xxx)</div>
        </div>
      </div>

      {/* ================= REVENUE 4xxx ================= */}
      <div style={styles.sectionBanner}>Revenue Accounts (4xxx)</div>

      <div style={styles.sectionTitle}>4th Level Account / Department</div>
      {renderDepartmentGroups(revenueGroups, 'No 4th level revenue data available')}

      {/* ================= EXPENSE 5xxx ================= */}
      <div style={{ ...styles.sectionBanner, background: '#b45309', marginTop: '28px' }}>Expense Accounts (5xxx)</div>

      <div style={styles.sectionTitle}>4th Level Account / Department (50101 / 50201 / 50301)</div>
      {renderDepartmentGroups(expenseDeptGroups, 'No 4th level expense data available for 50101 / 50201 / 50301')}

      <div style={styles.sectionTitle}>Store Wise Breakup</div>
      {storeGroups.length > 0 ? (
        storeGroups.map((group, gi) => (
          <div key={group.storeName || gi} style={{ marginBottom: '24px' }}>
            <div style={styles.storeHeading}>{group.storeName}</div>
            {renderScrollTable(
              renderStoreColGroup(),
              renderStoreLeadHeaders(),
              <tbody>
                {(group.accounts || []).map((acc, ai) => (
                  <tr
                    key={`${group.storeName}-${acc.code}-${ai}`}
                    style={{ ...styles.tableRow, backgroundColor: ai % 2 === 0 ? '#f8fafc' : '#ffffff' }}
                  >
                    <td style={{ ...styles.tableCell, fontFamily: "'Courier New', monospace" }}>{acc.code}</td>
                    <td style={styles.tableCell}>{acc.accountName}</td>
                    {renderMonthCells(acc.Months)}
                    <td style={{ ...styles.tableCell, ...styles.amount, fontWeight: 'bold', borderRight: 'none' }}>
                      {fmt(acc.Total)}
                    </td>
                  </tr>
                ))}
              </tbody>,
              <tfoot>
                <tr style={{ backgroundColor: '#eef2f7', fontWeight: 'bold' }}>
                  <td colSpan={2} style={{ ...styles.tableCell, textAlign: 'right', fontWeight: 'bold' }}>
                    {group.storeName} - Total
                  </td>
                  {renderMonthCells(group.Months, { fontWeight: 'bold' })}
                  <td style={{ ...styles.tableCell, ...styles.amount, fontWeight: 'bold', borderRight: 'none' }}>
                    {fmt(group.Total)}
                  </td>
                </tr>
              </tfoot>
            )}
          </div>
        ))
      ) : (
        !isLoading && (
          <div style={{ ...styles.sectionTitle, textAlign: 'center', color: '#95a5a6', fontStyle: 'italic' }}>
            No expense data available for the selected year (5xxx accounts only)
          </div>
        )
      )}

      {(storeGroups.length > 0 || expenseDeptGroups.length > 0) && (
        <div style={styles.tableContainer}>
          <table style={styles.salesDataTable}>
            {renderStoreColGroup()}
            <thead>
              <tr>
                {renderStoreLeadHeaders()}
                {renderMonthHeader()}
                <th style={{ ...styles.tableHeader, ...fixedCol(REPORT_COLS.total), borderRight: 'none' }}>Total</th>
              </tr>
            </thead>
            <tfoot>
              <tr style={{ backgroundColor: '#2c3e50', color: 'white' }}>
                <td colSpan={2} style={{ ...styles.tableCell, textAlign: 'right', fontWeight: 'bold', borderRight: 'none', color: 'white' }}>EXPENSE GRAND TOTAL</td>
                {renderMonthCells(expenseGrandMonths, { fontWeight: 'bold', color: 'white' })}
                <td style={{ ...styles.tableCell, ...styles.amount, fontWeight: 'bold', borderRight: 'none', color: 'white' }}>{fmt(expenseGrandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
        <button onClick={downloadExcel} style={styles.exportBtn} disabled={isExporting}>
          📊 Export Excel
        </button>
        <button onClick={downloadPDF} style={styles.exportBtn} disabled={isExporting}>
          📄 Export PDF
        </button>
        <button onClick={handlePrint} style={styles.exportBtn} disabled={isExporting}>
          🖨️ Print
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    fontFamily: "'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif",
    background: '#fff',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    padding: '24px',
    margin: '0',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    color: '#333',
    position: 'relative',
    overflowX: 'hidden',
  },
  loader: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    flexDirection: 'column',
    color: 'white',
  },
  exportLoader: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9998,
  },
  exportLoaderContent: {
    background: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
    textAlign: 'center',
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    width: '48px',
    height: '48px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 15px',
  },
  salesReportHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    paddingBottom: '20px',
    borderBottom: '1px solid #eaeaea',
  },
  companyInfo: { textAlign: 'left' },
  companyName: { fontSize: '24px', fontWeight: '700', color: '#2c3e50', margin: '0 0 8px 0' },
  companyAddress: { fontSize: '12px', color: '#7f8c8d', margin: '4px 0' },
  companyContact: { fontSize: '12px', color: '#7f8c8d', margin: '4px 0' },
  reportInfo: { textAlign: 'right' },
  reportTitle: { fontSize: '20px', fontWeight: '600', color: '#3498db', margin: '0 0 8px 0' },
  reportDate: { fontSize: '12px', color: '#7f8c8d', margin: '4px 0' },
  reportRange: { fontSize: '12px', color: '#7f8c8d', margin: '4px 0' },
  sectionBanner: {
    fontSize: '17px',
    fontWeight: '700',
    color: '#fff',
    padding: '10px 14px',
    background: '#1d4ed8',
    borderRadius: '4px',
    marginBottom: '12px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#2c3e50',
    padding: '8px 12px',
    background: '#f1f5f9',
    borderRadius: '4px',
    marginBottom: '10px',
  },
  storeHeading: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#fff',
    padding: '8px 14px',
    background: '#3b82f6',
    borderRadius: '4px',
    marginBottom: '0',
  },
  tableContainer: {
    overflowX: 'auto',
    overflowY: 'hidden',
    width: '100%',
    maxWidth: '100%',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    marginBottom: '4px',
    minHeight: '60px',
    WebkitOverflowScrolling: 'touch',
  },
  salesDataTable: {
    borderCollapse: 'collapse',
    fontSize: '12px',
    tableLayout: 'fixed',
    width: `${REPORT_TABLE_WIDTH}px`,
    minWidth: `${REPORT_TABLE_WIDTH}px`,
  },
  tableHeader: { background: '#f1f5f9', padding: '10px 8px', textAlign: 'left', fontWeight: '600', color: '#1e293b', borderBottom: '2px solid #94a3b8', borderRight: '1px solid #cbd5e1', whiteSpace: 'nowrap', position: 'sticky', top: 0 },
  tableRow: { borderBottom: '1px solid #e2e8f0' },
  tableCell: { padding: '8px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' },
  amount: { textAlign: 'right', fontFamily: "'Courier New', monospace", whiteSpace: 'nowrap', minWidth: `${REPORT_COLS.month}px` },
  monthCol: {
    width: `${REPORT_COLS.month}px`,
    minWidth: `${REPORT_COLS.month}px`,
    maxWidth: `${REPORT_COLS.month}px`,
    boxSizing: 'border-box',
    paddingLeft: '6px',
    paddingRight: '6px',
    whiteSpace: 'nowrap',
    textAlign: 'right',
    fontFamily: "'Courier New', monospace",
  },
  noData: { textAlign: 'center', padding: '30px', color: '#95a5a6', fontStyle: 'italic' },
  exportBtn: {
    padding: '8px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    background: '#f8fafc',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151',
  },
};

export default PeriodExpenseAndRevenueReportPopup;

