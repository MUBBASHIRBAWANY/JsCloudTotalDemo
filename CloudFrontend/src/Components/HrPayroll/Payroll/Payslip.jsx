import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom';
import { getDataFundtion } from '../../../Api/CRUDFunctions';

const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const Payslip = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payslip, setPayslip] = useState(null);
  const printRef = useRef();

  useEffect(() => {
    if (id) {
      getDataFundtion(`/Payroll/payslip/${id}`).then((res) => setPayslip(res.data));
    }
  }, [id]);

  const handlePrint = () => {
    const printContent = printRef.current.innerHTML;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  if (!payslip) return <div className="p-6">Loading...</div>;

  const emp = payslip.employeeId;

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h2 className="pd-section-title">Payslip</h2>
        <div className="flex gap-3">
          <button className="pd-btn-save" onClick={handlePrint}>Print</button>
          <button className="pd-btn-outline" onClick={() => navigate("/PayrollList")}>Back</button>
        </div>
      </div>

      <div ref={printRef} className="pd-card p-6 max-w-4xl mx-auto">
        <style jsx>{`
          @media print {
            body * { visibility: hidden; }
            #print-area, #print-area * { visibility: visible; }
            #print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 15px 20px !important;
              background: white;
            }
            
            @page {
              size: A4 portrait;
              margin: 0.3in 0.2in;
            }
            
            #print-area * {
              font-size: 10px !important;
              line-height: 1.3 !important;
            }
            
            #print-area h1 {
              font-size: 16px !important;
              letter-spacing: 2px;
            }
            
            #print-area .payslip-title {
              font-size: 20px !important;
              letter-spacing: 4px;
              color: #1a237e !important;
            }
            
            #print-area .text-xs {
              font-size: 8px !important;
            }
            
            #print-area .text-sm {
              font-size: 9px !important;
            }
            
            #print-area .text-base {
              font-size: 10px !important;
            }
            
            #print-area .text-lg {
              font-size: 12px !important;
            }
            
            #print-area .text-xl {
              font-size: 14px !important;
            }
            
            #print-area .p-6 { padding: 10px 15px !important; }
            #print-area .p-2 { padding: 4px 6px !important; }
            #print-area .p-1 { padding: 2px 4px !important; }
            #print-area .mb-4 { margin-bottom: 6px !important; }
            #print-area .mb-3 { margin-bottom: 4px !important; }
            #print-area .mb-2 { margin-bottom: 3px !important; }
            #print-area .mt-4 { margin-top: 6px !important; }
            #print-area .gap-2 { gap: 4px !important; }
            
            #print-area table {
              border-collapse: collapse !important;
              width: 100% !important;
            }
            
            #print-area table td, 
            #print-area table th {
              padding: 3px 6px !important;
              border: 1px solid #333 !important;
              text-align: left !important;
            }
            
            #print-area .no-border td,
            #print-area .no-border th {
              border: none !important;
            }
            
            #print-area .border-top {
              border-top: 2px solid #1a237e !important;
            }
            
            #print-area .border-bottom {
              border-bottom: 2px solid #1a237e !important;
            }
            
            #print-area .bg-gray-100 {
              background-color: #f5f5f5 !important;
            }
            
            #print-area .bg-primary {
              background-color: #1a237e !important;
              color: white !important;
            }
            
            #print-area .font-bold {
              font-weight: 700 !important;
            }
            
            #print-area .text-right {
              text-align: right !important;
            }
            
            #print-area .text-center {
              text-align: center !important;
            }
            
            #print-area .text-primary {
              color: #1a237e !important;
            }
          }
        `}</style>

        <div id="print-area">
          {/* Header Section */}
          <div className="text-center mb-4 border-bottom pb-2">
            <h1 className="payslip-title font-bold">PAYSLIP</h1>
            <p className="text-sm font-semibold text-gray-600">
              {months[payslip.month]} {payslip.year}
            </p>
          </div>

          {/* Employee Information - Tabular */}
          <table className="w-full mb-4 text-sm">
            <tbody>
              <tr>
                <td className="p-2 font-semibold" style={{ width: '15%' }}>Employee:</td>
                <td className="p-2" style={{ width: '35%' }}>{emp?.firstName} {emp?.lastName}</td>
                <td className="p-2 font-semibold" style={{ width: '15%' }}>Code:</td>
                <td className="p-2" style={{ width: '35%' }}>{emp?.code}</td>
              </tr>
              <tr>
                <td className="p-2 font-semibold">Department:</td>
                <td className="p-2">{emp?.departmentId?.name}</td>
                <td className="p-2 font-semibold">Designation:</td>
                <td className="p-2">{emp?.designationId?.name}</td>
              </tr>
              <tr>
                <td className="p-2 font-semibold">CNIC:</td>
                <td className="p-2">{emp?.cnic}</td>
                <td className="p-2 font-semibold">Province:</td>
                <td className="p-2">{emp?.policyTags?.province}</td>
              </tr>
              <tr>
                <td className="p-2 font-semibold">Bank:</td>
                <td className="p-2">{emp?.bankName}</td>
                <td className="p-2 font-semibold">Account:</td>
                <td className="p-2">{emp?.bankAccount}</td>
              </tr>
              <tr>
                <td className="p-2 font-semibold">Employment:</td>
                <td className="p-2" colSpan="3">{emp?.employmentType}</td>
              </tr>
            </tbody>
          </table>

          {/* Attendance Summary - Tabular */}
          <div className="mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="p-2 text-center">Total Days</th>
                  <th className="p-2 text-center">Present</th>
                  <th className="p-2 text-center">Absent</th>
                  <th className="p-2 text-center">Late</th>
                  <th className="p-2 text-center">Leave</th>
                  <th className="p-2 text-center">Holidays</th>
                  <th className="p-2 text-center">Off Days</th>
                  <th className="p-2 text-center">Extra Days</th>
                  <th className="p-2 text-center">OT Hours</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-gray-100">
                  <td className="p-2 text-center font-bold">{payslip.totalDaysInMonth}</td>
                  <td className="p-2 text-center font-bold">{payslip.presentDays}</td>
                  <td className="p-2 text-center font-bold">{payslip.absentDays}</td>
                  <td className="p-2 text-center font-bold">{payslip.lateDays}</td>
                  <td className="p-2 text-center font-bold">{payslip.leaveDays}</td>
                  <td className="p-2 text-center font-bold">{payslip.holidayDays}</td>
                  <td className="p-2 text-center font-bold">{payslip.offDays}</td>
                  <td className="p-2 text-center font-bold text-green-600">{payslip.extraDays || 0}</td>
                  <td className="p-2 text-center font-bold">{payslip.overtimeHours}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {payslip.totalLateMinutes > 0 && (
            <div className="mb-4">
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="p-2 font-semibold" style={{ width: '50%' }}>Late Minutes:</td>
                    <td className="p-2 text-right font-bold">{payslip.totalLateMinutes} min</td>
                    <td className="p-2 font-semibold" style={{ width: '50%' }}>Late Penalty:</td>
                    <td className="p-2 text-right font-bold">Rs. {Number(payslip.latePenalty || 0).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {(payslip.totalEarlyMinutes > 0) && (
            <div className="mb-4">
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="p-2 font-semibold" style={{ width: '50%' }}>Early Departure Minutes:</td>
                    <td className="p-2 text-right font-bold">{payslip.totalEarlyMinutes} min</td>
                    <td className="p-2 font-semibold" style={{ width: '50%' }}>Early Departure Penalty:</td>
                    <td className="p-2 text-right font-bold">Rs. {Number(payslip.earlyDeparturePenalty || 0).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Earnings & Deductions - Tabular Side by Side */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Earnings Table */}
            <div>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-primary text-white">
                    <th className="p-2 text-left" colSpan="2">EARNINGS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2">Basic Salary</td>
                    <td className="p-2 text-right font-semibold">Rs. {Number(payslip.basicSalary || 0).toLocaleString()}</td>
                  </tr>
                  {(payslip.allowances || []).map((a, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="p-2">{a.name}</td>
                      <td className="p-2 text-right">Rs. {Number(a.amount || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                  {payslip.overtimePay > 0 && (
                    <tr>
                      <td className="p-2">Overtime ({payslip.overtimeHours} hrs)</td>
                      <td className="p-2 text-right">Rs. {Number(payslip.overtimePay || 0).toLocaleString()}</td>
                    </tr>
                  )}
                  {payslip.extraDays > 0 && (
                    <tr>
                      <td className="p-2">Extra Days ({payslip.extraDays} days)</td>
                      <td className="p-2 text-right">Rs. {Number(payslip.extraDayPay || 0).toLocaleString()}</td>
                    </tr>
                  )}
                  {payslip.attendanceAllowance > 0 && (
                    <tr>
                      <td className="p-2 text-green-600 font-medium">Attendance Allowance</td>
                      <td className="p-2 text-right text-green-600 font-bold">Rs. {Number(payslip.attendanceAllowance || 0).toLocaleString()}</td>
                    </tr>
                  )}
                  <tr className="border-top font-bold">
                    <td className="p-2">Gross Salary</td>
                    <td className="p-2 text-right text-primary">Rs. {Number(payslip.grossSalary || 0).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Deductions Table - Always show standard fields */}
            <div>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-primary text-white">
                    <th className="p-2 text-left" colSpan="2">DEDUCTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Standard deduction fields that should always appear
                    const standardDeductions = [
                      'Absent Deduction',
                      'Late Penalty',
                      'Early Departure Penalty',
                      'EOBI (Employee)',
                      'Social Security',
                      'EBF (Employee)',
                      'Income Tax',
                      'Loan Repayment',
                      'Advance Recovery'
                    ];

                    // Get actual deductions from payroll
                    const actualDeductions = payslip.deductions || [];

                    // Merge: show standard fields + any extra deductions from payroll
                    const mergedDeductions = [];
                    const shownNames = new Set();

                    // First: add standard deductions in order
                    for (const stdName of standardDeductions) {
                      const actual = actualDeductions.find(d => d.name === stdName);
                      mergedDeductions.push({
                        name: stdName,
                        amount: actual ? actual.amount : 0
                      });
                      shownNames.add(stdName);
                    }

                    // Then: add any extra deductions not in standard list
                    for (const d of actualDeductions) {
                      if (!shownNames.has(d.name)) {
                        mergedDeductions.push(d);
                      }
                    }

                    return mergedDeductions.map((d, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                        <td className="p-2">{d.name}</td>
                        <td className="p-2 text-right">Rs. {Math.round(d.amount || 0).toLocaleString()}</td>
                      </tr>
                    ));
                  })()}
                  <tr className="border-top font-bold">
                    <td className="p-2">Total Deductions</td>
                    <td className="p-2 text-right text-primary">Rs. {Math.round(payslip.totalDeductions || 0).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Net Salary - Highlighted */}
          <div className="border-top pt-3 mb-4">
            <table className="w-full text-lg">
              <tbody>
                <tr>
                  <td className="p-2 font-bold text-primary" style={{ fontSize: '16px', width: '70%' }}>
                    NET SALARY
                  </td>
                  <td className="p-2 text-right font-bold text-primary" style={{ fontSize: '18px', width: '30%' }}>
                    Rs. {Number(payslip.netSalary || 0).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Journal Voucher Status */}
          {payslip.status === 'closed' && payslip.journalVoucherId && (
            <div className="mb-3 p-2 bg-purple-50 rounded text-xs border border-purple-200">
              <span className="font-semibold">✓ Journal Voucher Posted</span>
              {payslip.closedAt && (
                <span className="ml-2 text-gray-500">
                  on {new Date(payslip.closedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 text-center text-xs mt-4">
            <div>
              <div className="border-t border-gray-400 pt-1 mt-6">Employee Signature</div>
              <div className="text-gray-400 text-[8px]">(Name & Date)</div>
            </div>
            <div>
              <div className="border-t border-gray-400 pt-1 mt-6">Authorized Signature</div>
              <div className="text-gray-400 text-[8px]">(Name & Date)</div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-[7px] text-gray-400 mt-3 border-top pt-2">
            This is a computer-generated payslip. No signature required for processing.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payslip;
// import React, { useEffect, useState, useRef } from 'react'
// import { useParams, useNavigate } from 'react-router-dom';
// import { getDataFundtion } from '../../../Api/CRUDFunctions';

// const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// const Payslip = () => {
//   const { id } = useParams();
//   const navigate = useNavigate();
//   const [payslip, setPayslip] = useState(null);
//   const printRef = useRef();

//   useEffect(() => {
//     if (id) {
//       getDataFundtion(`/Payroll/payslip/${id}`).then((res) => setPayslip(res.data));
//     }
//   }, [id]);

//   const handlePrint = () => {
//     const printContent = printRef.current.innerHTML;
//     const originalContent = document.body.innerHTML;
//     document.body.innerHTML = printContent;
//     window.print();
//     document.body.innerHTML = originalContent;
//     window.location.reload();
//   };

//   if (!payslip) return <div className="p-6">Loading...</div>;

//   const emp = payslip.employeeId;

//   return (
//     <div>
//       <div className="flex justify-between items-center mb-5">
//         <h2 className="pd-section-title">Payslip</h2>
//         <div className="flex gap-3">
//           <button className="pd-btn-save" onClick={handlePrint}>Print</button>
//           <button className="pd-btn-outline" onClick={() => navigate("/PayrollList")}>Back</button>
//         </div>
//       </div>

//       <div ref={printRef} className="pd-card p-8 max-w-2xl mx-auto">
//         <div className="text-center mb-6">
//           <h1 className="text-2xl font-bold">PAYSLIP</h1>
//           <p className="text-gray-600">{months[payslip.month]} {payslip.year}</p>
//         </div>

//         <div className="grid grid-cols-2 gap-4 mb-6 pb-4" style={{ borderBottom: '2px solid var(--pd-border)' }}>
//           <div>
//             <p><span className="font-semibold">Employee:</span> {emp?.firstName} {emp?.lastName}</p>
//             <p><span className="font-semibold">Code:</span> {emp?.code}</p>
//             <p><span className="font-semibold">Department:</span> {emp?.departmentId?.name}</p>
//             <p><span className="font-semibold">Designation:</span> {emp?.designationId?.name}</p>
//             <p><span className="font-semibold">Province:</span> {emp?.policyTags?.province}</p>
//           </div>
//           <div>
//             <p><span className="font-semibold">CNIC:</span> {emp?.cnic}</p>
//             <p><span className="font-semibold">Bank:</span> {emp?.bankName}</p>
//             <p><span className="font-semibold">Account:</span> {emp?.bankAccount}</p>
//             <p><span className="font-semibold">Employment Type:</span> {emp?.employmentType}</p>
//           </div>
//         </div>

//         <div className="grid grid-cols-4 gap-4 mb-6 pb-4" style={{ borderBottom: '2px solid var(--pd-border)' }}>
//           <div className="text-center"><p className="text-sm text-gray-500">Total Days</p><p className="text-lg font-bold">{payslip.totalDaysInMonth}</p></div>
//           <div className="text-center"><p className="text-sm text-gray-500">Present</p><p className="text-lg font-bold">{payslip.presentDays}</p></div>
//           <div className="text-center"><p className="text-sm text-gray-500">Absent</p><p className="text-lg font-bold">{payslip.absentDays}</p></div>
//           <div className="text-center"><p className="text-sm text-gray-500">Late</p><p className="text-lg font-bold">{payslip.lateDays}</p></div>
//         </div>
//         <div className="grid grid-cols-4 gap-4 mb-6 pb-4" style={{ borderBottom: '2px solid var(--pd-border)' }}>
//           <div className="text-center"><p className="text-sm text-gray-500">Leave Days</p><p className="text-lg font-bold">{payslip.leaveDays}</p></div>
//           <div className="text-center"><p className="text-sm text-gray-500">Holidays</p><p className="text-lg font-bold">{payslip.holidayDays}</p></div>
//           <div className="text-center"><p className="text-sm text-gray-500">Off Days</p><p className="text-lg font-bold">{payslip.offDays}</p></div>
//           <div className="text-center"><p className="text-sm text-gray-500">OT Hours</p><p className="text-lg font-bold">{payslip.overtimeHours}</p></div>
//         </div>
//         {payslip.status === 'closed' && payslip.journalVoucherId && (
//           <div className="mb-4 p-3 bg-purple-50 rounded text-sm">
//             <span className="font-semibold">Journal Voucher:</span> Posted
//             {payslip.closedAt && <span className="ml-2 text-gray-500">on {new Date(payslip.closedAt).toLocaleDateString()}</span>}
//           </div>
//         )}
//         {payslip.totalLateMinutes > 0 && (
//           <div className="grid grid-cols-2 gap-4 mb-6 pb-4" style={{ borderBottom: '2px solid var(--pd-border)' }}>
//             <div className="text-center"><p className="text-sm text-gray-500">Late Minutes</p><p className="text-lg font-bold">{payslip.totalLateMinutes} min</p></div>
//             <div className="text-center"><p className="text-sm text-gray-500">Late Penalty</p><p className="text-lg font-bold">Rs. {Number(payslip.latePenalty || 0).toLocaleString()}</p></div>
//           </div>
//         )}

//         <div className="mb-6">
//           <h3 className="font-semibold mb-2">Earnings</h3>
//           <table className="w-full text-sm">
//             <tbody>
//               <tr style={{ borderBottom: '1px solid var(--pd-border)' }}>
//                 <td className="py-2">Basic Salary</td>
//                 <td className="py-2 text-right">Rs. {Number(payslip.basicSalary || 0).toLocaleString()}</td>
//               </tr>
//               {(payslip.allowances || []).map((a, i) => (
//                 <tr key={i} style={{ borderBottom: '1px solid var(--pd-border)' }}>
//                   <td className="py-2">{a.name}</td>
//                   <td className="py-2 text-right">Rs. {Number(a.amount || 0).toLocaleString()}</td>
//                 </tr>
//               ))}
//               {payslip.overtimePay > 0 && (
//                 <tr style={{ borderBottom: '1px solid var(--pd-border)' }}>
//                   <td className="py-2">Overtime ({payslip.overtimeHours} hrs)</td>
//                   <td className="py-2 text-right">Rs. {Number(payslip.overtimePay || 0).toLocaleString()}</td>
//                 </tr>
//               )}
//               <tr className="font-bold" style={{ borderTop: '2px solid var(--pd-border)' }}>
//                 <td className="py-2">Gross Salary</td>
//                 <td className="py-2 text-right">Rs. {Number(payslip.grossSalary || 0).toLocaleString()}</td>
//               </tr>
//             </tbody>
//           </table>
//         </div>

//         <div className="mb-6">
//           <h3 className="font-semibold mb-2">Deductions</h3>
//           <table className="w-full text-sm">
//             <tbody>
//               {(payslip.deductions || []).map((d, i) => (
//                 <tr key={i} style={{ borderBottom: '1px solid var(--pd-border)' }}>
//                   <td className="py-2">{d.name}</td>
//                   <td className="py-2 text-right">Rs. {Number(d.amount || 0).toLocaleString()}</td>
//                 </tr>
//               ))}
//               {(!payslip.deductions || payslip.deductions.length === 0) && (
//                 <tr><td className="py-2 text-gray-500" colSpan={2}>No deductions</td></tr>
//               )}
//               <tr className="font-bold" style={{ borderTop: '2px solid var(--pd-border)' }}>
//                 <td className="py-2">Total Deductions</td>
//                 <td className="py-2 text-right">Rs. {Number(payslip.totalDeductions || 0).toLocaleString()}</td>
//               </tr>
//             </tbody>
//           </table>
//         </div>

//         <div className="text-right pt-4" style={{ borderTop: '2px solid var(--pd-border)' }}>
//           <span className="text-xl font-bold">Net Salary: Rs. {Number(payslip.netSalary || 0).toLocaleString()}</span>
//         </div>

//         <div className="mt-8 grid grid-cols-2 gap-8 text-center text-sm text-gray-500">
//           <div><div className="border-t border-gray-400 mt-8 pt-2">Employee Signature</div></div>
//           <div><div className="border-t border-gray-400 mt-8 pt-2">Authorized Signature</div></div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Payslip;
