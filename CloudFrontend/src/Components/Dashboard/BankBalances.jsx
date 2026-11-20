import React, { useEffect, useState } from 'react';
import { getDataFundtion } from '../../Api/CRUDFunctions';

// Dashboard widget: "Bank Balances"
// Pulls every bank account between Admin.BankAccountFrom and Admin.BankAccountTo
// from the chart of accounts, then loads each account's general-ledger balance
// (current FY opening + movements => balance as of today).
const ADMIN_ID = '687e14a624a274d5e844be49';

const DashboardBankBalances = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('');
  const [banks, setBanks] = useState([]); // [{ id, code, name, balance }]

  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        // Current financial year (July – June) → yesterday, so the ledger call
        // includes opening entries and gives the balance of each account as of
        // one day before today.
        const today = new Date();
        const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
        const fyYear = yesterday.getMonth() + 1 >= 7 ? yesterday.getFullYear() : yesterday.getFullYear() - 1;
        const startDate = `${fyYear}-07-01`;
        const endDate = formatDate(yesterday);

        const [adminRes, accountsRes] = await Promise.all([
          getDataFundtion(`/Administrative/get/${ADMIN_ID}`),
          getDataFundtion('/chartofAccounts'),
        ]);
        console.log(adminRes)
        const admin = adminRes?.data || adminRes || {};
        const allAccounts = accountsRes?.data || accountsRes || [];

        // Build the code prefixes for the whole bank range (e.g. 10100 … 10199)
        const prefixes = [];
        for (let i = Number(admin.BankAccountFrom); i <= Number(admin.BankAccountTo); i++) {
          prefixes.push(String(i).padStart(5, '0'));
        }
console.log(prefixes)
        // Stage-4 accounts whose code starts with any bank prefix
        const bankAccounts = allAccounts.filter(
          (item) =>
            item.AccountCode &&
            item.AccountCode.length > 5 &&
            prefixes.some((prefix) => item.AccountCode.startsWith(prefix))
        );

        const bankIds = bankAccounts.map((item) => item._id || item.id).filter(Boolean);
        if (bankIds.length === 0) {
          if (mounted) {
            setBanks([]);
            setPeriod(`${startDate} → ${endDate}`);
            setIsLoading(false);
          }
          return;
        }

        // One ledger call for all bank accounts (same pattern as Trial Balance)
        const ledger = await getDataFundtion(
          `GernalLager?startDate=${startDate}&endDate=${endDate}&Account=${bankIds.join(',')}&Store=`
        );
        const rows = Array.isArray(ledger) ? ledger : ledger?.data || [];

        // Sum debit/credit per account; balance = Debit − Credit
        const totals = {};
        rows.forEach((row) => {
          const accId = row.Account;
          if (!accId || !bankIds.includes(accId)) return;
          if (!totals[accId]) totals[accId] = { debit: 0, credit: 0 };
          totals[accId].debit += Number(row.Debit) || 0;
          totals[accId].credit += Number(row.Credit) || 0;
        });

        const list = bankAccounts
          .map((acc) => {
            const accId = acc._id || acc.id;
            const t = totals[accId] || { debit: 0, credit: 0 };
            return {
              id: accId,
              code: acc.AccountCode,
              name: acc.AccountName || 'Bank Account',
              balance: Number((t.debit - t.credit).toFixed(2)),
            };
          })
          // Hide accounts whose balance is exactly zero
          .filter((b) => Number(b.balance) !== 0)
          .sort((a, b) => parseFloat(a.code) - parseFloat(b.code));

        if (mounted) {
          setBanks(list);
          setPeriod(`${startDate} → ${endDate}`);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Bank Balances failed', err);
        if (mounted) {
          setError('Failed to load bank balances');
          setIsLoading(false);
        }
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  const total = banks.reduce((sum, b) => sum + (Number(b.balance) || 0), 0);
  const fmt = (n) =>
    Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="pd-dashboard-card flex h-full flex-col">
      {/* Compact header */}
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 text-sm shadow">
          🏦
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-tight text-on-surface">Bank Balances</h3>
          <p className="truncate text-[11px] leading-tight text-on-surface-variant">
            {period || 'Loading…'}
          </p>
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
          <p className="text-xs text-on-surface-variant">Loading bank balances…</p>
        </div>
      ) : error ? (
        <div className="rounded-lg bg-error-container px-3 py-2.5 text-center text-xs font-medium text-on-error-container">
          {error}
        </div>
      ) : banks.length === 0 ? (
        <div className="rounded-lg bg-surface-container-low px-3 py-4 text-center text-xs text-on-surface-variant">
          No bank accounts found
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          {/* Compact 2-column bank list so all data fits */}
          <div className="grid flex-1 grid-cols-1 gap-1.5 sm:grid-cols-2">
            {banks.map((bank) => (
              <div
                key={bank.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border-card bg-surface-container-low px-2.5 py-1.5 transition hover:border-teal-500/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-on-surface">{bank.name}</p>
                  <p className="text-[10px] text-on-surface-variant">{bank.code}</p>
                </div>
                <p
                  className={`shrink-0 font-mono text-xs font-semibold ${
                    bank.balance < 0 ? 'text-error' : 'text-tertiary'
                  }`}
                >
                  {fmt(bank.balance)}
                </p>
              </div>
            ))}
          </div>

          {/* Total pinned at the bottom */}
          <div className="mt-2 flex items-center justify-between rounded-lg bg-surface-container px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-on-surface-variant">
              Total Balance
            </p>
            <p
              className={`font-mono text-sm font-bold ${total < 0 ? 'text-error' : 'text-tertiary'}`}
            >
              {fmt(total)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardBankBalances;
