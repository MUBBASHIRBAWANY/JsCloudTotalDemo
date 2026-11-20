import React from 'react';
import { employeeLineLabel, useEmployeeSubAccounts } from '../employeeSubAccounts';
import { formatAmount, amountToWords } from '../../../../utils/amountToWords.js';

const PaymentVoucherPrintable = ({ voucherData, Account, MainAccount, Store, loginVendor }) => {
  const employeeAccounts = useEmployeeSubAccounts();
  const voucherDate = voucherData?.VoucherDate || '';
  const voucherNumber = voucherData?.VoucherNumber || '';
  const totalAmount = voucherData?.TotalDebit || 0;
  const items = (voucherData?.VoucharData || []).filter(row => !(row.Account === MainAccount && row.show === true));
  const userName = loginVendor?.firstname || loginVendor?.Name || loginVendor?.name || '';

  const toCapitalize = (str) => {
    if (!str) return '';
    return str.replace(/\b\w/g, char => char.toUpperCase());
  };

  const getAccountCode = (accountId) => {
    if (!accountId) return '';
    if (Array.isArray(Account) && Account.length) {
      const acc = Account.find(a => String(a._id) === String(accountId));
      if (acc) return acc.AccountCode || '';
    }
    return '';
  };

  const getAccountName = (accountId) => {
    if (!accountId) return '';
    if (Array.isArray(Account) && Account.length) {
      const acc = Account.find(a => String(a._id) === String(accountId));
      if (acc) return toCapitalize(acc.AccountName || '');
    }
    return '';
  };

  const getStoreLabel = (storeId) => {
    if (!storeId) return '';
    if (Array.isArray(Store) && Store.length) {
      const s = Store.find(x => String(x._id) === String(storeId));
      if (s) return toCapitalize(s.StoreName || '');
    }
    return '';
  };

  return (
    <div id="voucher-print-section" style={{ padding: '24px', border: '1px solid #ccc', background: '#fff', color: '#000', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto' }}>

      {/* Top header line */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
        <span>Date & Time : {new Date().toLocaleString()}</span>
        <span>User : {userName}</span>
      </div>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 4px 0' }}>PEARL DYNAMIC (PVT) LTD</h1>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>CASH PAYMENT VOUCHER</h2>
      </div>

      {/* Voucher Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 40px', fontSize: '13px', marginBottom: '20px' }}>
        <div><strong>VOUCHER #</strong> : {voucherNumber}</div>
        <div><strong>VOUCHER DATE</strong> : {voucherDate}</div>
      </div>

      {/* Data Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '16px' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', width: '100px' }}>A/C. CODE</th>
            <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold' }}>ACCOUNT NAME</th>
            <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold' }}>DEPARTMENT</th>
            <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold' }}>NARRATION</th>
            <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', width: '120px' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row, idx) => (
            <tr key={idx}>
              <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>
                {getAccountCode(row.Account)}
              </td>
              <td style={{ border: '1px solid #000', padding: '6px 8px' }}>
                {employeeLineLabel(employeeAccounts, row) || getAccountName(row.Account)}
              </td>
              <td style={{ border: '1px solid #000', padding: '6px 8px' }}>
                {getStoreLabel(row.store)}
              </td>
              <td style={{ border: '1px solid #000', padding: '6px 8px' }}>
                {row.Narration || ''}
              </td>
              <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right' }}>
                {formatAmount(row.Credit || row.Debit)}
              </td>
            </tr>
          ))}
          {items.length > 0 && (
            <tr>
              <td colSpan="4" style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>TOTAL AMOUNT</td>
              <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>{formatAmount(totalAmount)}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Amount in words */}
      <div style={{ marginBottom: '40px', fontSize: '12px' }}>
        <strong>AMOUNT IN WORDS:</strong> <span style={{ textDecoration: 'underline', marginLeft: '8px' }}>{amountToWords(totalAmount)}</span>
      </div>

      {/* Signature Lines */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '60px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid #000', marginBottom: '4px' }}></div>
          <span style={{ fontSize: '12px' }}>Prepared By</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid #000', marginBottom: '4px' }}></div>
          <span style={{ fontSize: '12px' }}>Approved By</span>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '10px', color: '#555' }}>
        Voucher: {voucherNumber}
      </div>
    </div>
  );
};

export default PaymentVoucherPrintable;
