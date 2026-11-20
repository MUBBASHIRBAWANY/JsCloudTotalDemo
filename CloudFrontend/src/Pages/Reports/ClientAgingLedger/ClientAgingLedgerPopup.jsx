import React, { useEffect, useMemo, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getDataFundtion } from '../../../Api/CRUDFunctions';
import ReportPopupHeader from '../../../Components/Global/ReportPopupHeader.jsx';
import { exportProfessionalExcel } from '../../../utils/exportProfessionalExcel';

const DEFAULT_AGING_START = '2020-07-01';

const sundryClientKey = (client) => {
  if (client === undefined || client === null || client === '') return '';
  if (typeof client === 'object') return String(client._id || '');
  return String(client);
};

// Exact client net from Sundry Debtor Balance: every voucher line for that
// client, no department cut. net = Opening + OpeningDebit + totalDebit
// - totalCredit - OpeningCredit.
const buildSundryNetByClient = (debtorRows) => {
  const rows = Array.isArray(debtorRows) ? debtorRows : (debtorRows?.data || []);
  const processed = rows.map((item) => ({
    ...item,
    Client: item?.Client,
    Debit: Number(item?.Debit) || 0,
    Credit: Number(item?.Credit) || 0,
  }));

  const groups = {};
  processed.forEach((item) => {
    const clientId = sundryClientKey(item.Client);
    if (!clientId) return;
    if (!groups[clientId]) {
      groups[clientId] = {
        Opening: 0,
        OpeningDebit: 0,
        OpeningCredit: 0,
        totalDebit: 0,
        totalCredit: 0,
      };
    }
    const debit = Number((item.Debit || '0').toString().replace(/,/g, ''));
    const credit = Number((item.Credit || '0').toString().replace(/,/g, ''));
    const group = groups[clientId];
    if (item.Type === 'VoucherBefore') {
      group.OpeningDebit += debit;
      group.OpeningCredit += credit;
    } else {
      group.totalDebit += debit;
      group.totalCredit += credit;
    }
  });

  const byClient = {};
  Object.entries(groups).forEach(([clientId, group]) => {
    byClient[clientId] =
      group.Opening +
      group.OpeningDebit +
      group.totalDebit -
      group.totalCredit -
      group.OpeningCredit;
  });
  return byClient;
};

const buildCodeToClientId = (customers, byClient) => {
  const codeToId = {};
  const list = Array.isArray(customers) ? customers : (customers?.data || []);
  list.forEach((client) => {
    const id = String(client?._id || '');
    if (!id || !Object.prototype.hasOwnProperty.call(byClient, id)) return;
    [client.code, client.OldCode, client.SalesFlowRef, client.DistrbutorSystemCode]
      .map((code) => String(code || '').trim())
      .filter(Boolean)
      .forEach((code) => {
        if (!codeToId[code]) codeToId[code] = id;
      });
  });
  return codeToId;
};

const ledgerForClient = (clientId, clientCode, byClient, codeToId) => {
  const id = String(clientId || '');
  if (id && Object.prototype.hasOwnProperty.call(byClient, id)) return byClient[id];
  const code = String(clientCode || '').trim();
  const mappedId = code ? codeToId[code] : '';
  if (mappedId && Object.prototype.hasOwnProperty.call(byClient, mappedId)) return byClient[mappedId];
  return 0;
};

// Same amount as Knockoff Remaining (RemainKnokoff) and the Knockoff screen:
// open credit still available to knock off = Credit - Remain, per voucher line.
const openKnockoffCredit = (line) => {
  const raw = Number(line?.Credit || 0) - Number(line?.Remain || 0);
  const credit = Number(raw.toFixed(2));
  return credit > 0 ? credit : 0;
};

const voucherClientId = (line) => String(line?.Client?._id || line?.Client || '');

const buildKnockoffMaps = (vouchers, customers, selectedStoreIds) => {
  const codeById = {};
  const customerList = Array.isArray(customers) ? customers : (customers?.data || []);
  customerList.forEach((client) => {
    const id = String(client?._id || '');
    if (!id) return;
    const code = String(client?.code || client?.SalesFlowRef || client?.OldCode || '').trim();
    if (code) codeById[id] = code;
  });

  const byClient = {};
  const byCode = {};
  const voucherList = Array.isArray(vouchers) ? vouchers : (vouchers?.data || []);
  voucherList.forEach((item) => {
    (item?.VoucharData || []).forEach((line) => {
      const clientId = voucherClientId(line);
      if (!clientId) return;
      const storeId = String(line?.store || line?.Store || '');
      if (selectedStoreIds.length && storeId && !selectedStoreIds.includes(storeId)) return;
      const credit = openKnockoffCredit(line);
      if (!credit) return;
      byClient[clientId] = (byClient[clientId] || 0) + credit;
      const code = codeById[clientId];
      if (code) byCode[code] = (byCode[code] || 0) + credit;
    });
  });
  return { byClient, byCode };
};

const knockoffForClient = (clientId, clientCode, maps) => {
  const id = String(clientId || '');
  if (id && maps.byClient[id]) return maps.byClient[id];
  const code = String(clientCode || '').trim();
  if (code && maps.byCode[code]) return maps.byCode[code];
  return 0;
};

// Same status split as Payment Realize Report:
// posted ("true") = Voucher, Reject = Reject, everything else = Pending.
const isPendingRealizeStatus = (status) => {
  if (status === true || status == 'true') return false;
  if (status == 'Reject') return false;
  return true;
};

// Receipt amount on Payment Realize Report: credit, or debit when credit is 0.
const pendingReceiptAmount = (item) => {
  const debit = item?.Debit ? parseFloat(item.Debit) : 0;
  const credit = item?.Credit ? parseFloat(item.Credit) : 0;
  const amount = credit > 0 ? credit : debit;
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

const buildDistributorIndex = (customers) => {
  const byId = {};
  const codeToId = {};
  const list = Array.isArray(customers) ? customers : (customers?.data || []);
  list.forEach((client) => {
    const id = String(client?._id || '');
    if (!id) return;
    byId[id] = client;
    [client.code, client.OldCode, client.SalesFlowRef, client.DistrbutorSystemCode]
      .map((code) => String(code || '').trim())
      .filter(Boolean)
      .forEach((code) => {
        if (!codeToId[code]) codeToId[code] = id;
      });
  });
  return { byId, codeToId };
};

const resolvePaymentClientId = (raw, index) => {
  if (raw && typeof raw === 'object') {
    const id = String(raw._id || '');
    if (id) return index.byId[id] ? id : (index.codeToId[id] || id);
  }
  const key = String(raw || '').trim();
  if (!key) return '';
  if (index.byId[key]) return key;
  if (index.codeToId[key]) return index.codeToId[key];
  return key;
};

const distributorCode = (client) =>
  String(client?.code || client?.SalesFlowRef || client?.OldCode || client?.DistrbutorSystemCode || '').trim();

const distributorName = (client) =>
  String(client?.DistrbutorName || client?.CutomerName || '').trim();

// Pending receipts between the report dates. Same rows Payment Realize Report
// shows when Type is Pending. Department filter matches Knockoff: a chosen
// store list drops other stores, and a blank store stays in.
const buildPendingPaymentByClient = (payments, distributorIndex, selectedStoreIds, applyStoreFilter) => {
  const byClient = {};
  const list = Array.isArray(payments) ? payments : (payments?.data || []);
  list.forEach((item) => {
    if (item?.Type && item.Type !== 'Voucher') return;
    if (!isPendingRealizeStatus(item?.status)) return;
    const clientId = resolvePaymentClientId(item?.Client, distributorIndex);
    if (!clientId) return;
    const storeId = String(item?.Store || item?.store || '');
    if (applyStoreFilter && selectedStoreIds.length && storeId && !selectedStoreIds.includes(storeId)) return;
    const amount = pendingReceiptAmount(item);
    if (!amount) return;
    byClient[clientId] = (byClient[clientId] || 0) + amount;
  });
  return byClient;
};

// Ledger >= 0: (Aging + Pending Payment) + Knockoff - Ledger.
// Ledger < 0, whether Aging + Pending Payment is zero or not:
// (Aging + Pending Payment) + Knockoff + Ledger.
// Knockoff stays a plus so a credit balance is not left as the whole difference.
const clientAgingDifference = (aging, pendingPayment, knockoff, ledger) => {
  const receivable = Number(aging || 0) + Number(pendingPayment || 0);
  if (ledger < 0) return receivable + knockoff + ledger;
  return receivable + knockoff - ledger;
};

const DIFFERENCE_NOTE =
  'Difference = (Aging + Pending Payment) + Knockoff − Ledger Balance. If Ledger Balance is negative, whether Aging + Pending Payment is zero or not, Difference = (Aging + Pending Payment) + Knockoff + Ledger Balance.';

const ClientAgingLedgerPopup = ({ filterData = {} }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [onlyDifference, setOnlyDifference] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'difference', direction: 'descending' });
  const reportRef = useRef(null);
  const agingStart = DEFAULT_AGING_START;

  const formatCurrency = (amount) => {
    const n = Number(amount || 0);
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).replace(',', '');
  };

  const getData = async () => {
    setIsLoading(true);
    try {
      const storeParam = Array.isArray(filterData.Store) && filterData.Store.length
        ? filterData.Store.join(',')
        : '';
      const selectedStoreIds = (filterData.Store || []).map((id) => String(id));
      const [agingRes, debtorResult, knockoffResult, distributorResult, pendingResult] = await Promise.all([
        getDataFundtion(
          `/SaleInvoice/getClientAgingLedger?startDate=${agingStart}&endDate=${filterData.endDate}&store=${storeParam}`
        ),
        getDataFundtion(
          `GernalLager/DebtorBalance/?startDate=${filterData.startDate}&endDate=${filterData.endDate}`
        ).then(
          (res) => ({ ok: true, res }),
          (err) => {
            console.error('Error fetching Sundry Debtor Balance list:', err);
            return { ok: false, res: [] };
          }
        ),
        getDataFundtion('/Voucher/getAllCredit').then(
          (res) => ({ ok: true, res }),
          (err) => {
            console.error('Error fetching Knockoff Remaining:', err);
            return { ok: false, res: [] };
          }
        ),
        getDataFundtion('/Distrbutor').then(
          (res) => ({ ok: true, res }),
          (err) => {
            console.error('Error fetching distributor codes for knockoff:', err);
            return { ok: false, res: [] };
          }
        ),
        getDataFundtion(
          `PaymentRecived/PaymentReciptReport?startDate=${filterData.startDate}&endDate=${filterData.endDate}&Account=&Store=`
        ).then(
          (res) => ({ ok: true, res }),
          (err) => {
            console.error('Error fetching Payment Realize Report:', err);
            return { ok: false, res: [] };
          }
        ),
      ]);

      const list = Array.isArray(agingRes?.data) ? agingRes.data : (Array.isArray(agingRes) ? agingRes : []);
      const selectedIds = (filterData.Customer || []).map((c) => String(c.value || c));
      const filtered = selectedIds.length
        ? list.filter((row) => selectedIds.includes(String(row.clientId)))
        : list;

      const debtorRowsRaw = Array.isArray(debtorResult.res)
        ? debtorResult.res
        : (debtorResult.res?.data || []);
      const byClient = debtorResult.ok ? buildSundryNetByClient(debtorRowsRaw) : {};
      const codeToId = buildCodeToClientId(distributorResult.res, byClient);
      const knockoffMaps = knockoffResult.ok
        ? buildKnockoffMaps(knockoffResult.res, distributorResult.res, selectedStoreIds)
        : { byClient: {}, byCode: {} };
      const distributorIndex = buildDistributorIndex(distributorResult.res);
      const pendingByClient = pendingResult.ok
        ? buildPendingPaymentByClient(
            pendingResult.res,
            distributorIndex,
            selectedStoreIds,
            Boolean(filterData.storeSelected)
          )
        : {};
      const takePending = (clientId, clientCode) => {
        const id = String(clientId || '');
        if (id && pendingByClient[id]) {
          const amount = pendingByClient[id];
          pendingByClient[id] = 0;
          return amount;
        }
        const code = String(clientCode || '').trim();
        const mapped = code ? distributorIndex.codeToId[code] : '';
        if (mapped && pendingByClient[mapped]) {
          const amount = pendingByClient[mapped];
          pendingByClient[mapped] = 0;
          return amount;
        }
        return 0;
      };

      // One row per customer (Sundry Debtor Balance is client-wise). Store-wise
      // aging rows are summed so the same client does not appear twice.
      // Knockoff is not taken from the aging API. It is the open credit on
      // Knockoff vouchers (Credit - Remain), same figure as Knockoff Remaining.
      // Pending Payment is unrealized receipts from Payment Realize Report
      // between Date From and Date To, added to Aging inside the same formula.
      const mergedByClient = {};
      filtered.forEach((item) => {
        const clientId = String(item.clientId || '');
        if (!clientId) return;
        if (!mergedByClient[clientId]) {
          mergedByClient[clientId] = {
            ...item,
            clientId,
            aging: 0,
            storeNames: [],
          };
        }
        const row = mergedByClient[clientId];
        row.aging += Number(item.aging || 0);
        const storeName = String(item.storeName || '').trim();
        if (storeName && !row.storeNames.includes(storeName)) {
          row.storeNames.push(storeName);
        }
        if (!row.clientName && item.clientName) row.clientName = item.clientName;
        if (!row.clientCode && item.clientCode) row.clientCode = item.clientCode;
      });

      const selectedIdSet = new Set(selectedIds);
      const built = Object.values(mergedByClient).map((item) => {
        const ledger = debtorResult.ok
          ? ledgerForClient(item.clientId, item.clientCode, byClient, codeToId)
          : Number(item.ledger || 0);
        const aging = Number(item.aging || 0);
        const knockoff = knockoffForClient(item.clientId, item.clientCode, knockoffMaps);
        const pendingPayment = takePending(item.clientId, item.clientCode);
        return {
          ...item,
          storeName: item.storeNames.join(', '),
          ledger,
          aging,
          knockoff,
          pendingPayment,
          difference: clientAgingDifference(aging, pendingPayment, knockoff, ledger),
        };
      });

      // A client can have a pending receipt and no invoice-aging row.
      Object.entries(pendingByClient).forEach(([clientId, amount]) => {
        if (!amount) return;
        if (selectedIdSet.size && !selectedIdSet.has(clientId)) return;
        const client = distributorIndex.byId[clientId];
        const clientCode = distributorCode(client);
        const ledger = debtorResult.ok
          ? ledgerForClient(clientId, clientCode, byClient, codeToId)
          : 0;
        const knockoff = knockoffForClient(clientId, clientCode, knockoffMaps);
        const aging = 0;
        built.push({
          clientId,
          clientCode,
          clientName: distributorName(client),
          storeName: '',
          ledger,
          aging,
          knockoff,
          pendingPayment: amount,
          difference: clientAgingDifference(aging, amount, knockoff, ledger),
        });
      });

      setRows(built.map((item, index) => ({ ...item, id: index + 1 })));
    } catch (err) {
      console.error('Error fetching client aging ledger:', err);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, [filterData]);

  const filteredAndSortedRows = useMemo(() => {
    let filtered = rows;
    if (onlyDifference) {
      filtered = filtered.filter((row) => Math.abs(Number(row.difference || 0)) > 1);
    }
    if (filter) {
      const term = filter.toLowerCase();
      filtered = filtered.filter((row) =>
        Object.values(row).some((value) =>
          value && String(value).toLowerCase().includes(term)
        )
      );
    }
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        const av = a[sortConfig.key];
        const bv = b[sortConfig.key];
        if (av < bv) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (av > bv) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [rows, filter, sortConfig, onlyDifference]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortMark = (key) => {
    if (sortConfig.key !== key) return '';
    return sortConfig.direction === 'ascending' ? ' ↑' : ' ↓';
  };

  const totals = useMemo(() => ({
    aging: filteredAndSortedRows.reduce((s, r) => s + Number(r.aging || 0), 0),
    pendingPayment: filteredAndSortedRows.reduce((s, r) => s + Number(r.pendingPayment || 0), 0),
    ledger: filteredAndSortedRows.reduce((s, r) => s + Number(r.ledger || 0), 0),
    knockoff: filteredAndSortedRows.reduce((s, r) => s + Number(r.knockoff || 0), 0),
    difference: filteredAndSortedRows.reduce((s, r) => s + Number(r.difference || 0), 0),
  }), [filteredAndSortedRows]);

  const exportToExcel = async () => {
    const exportRows = filteredAndSortedRows.map((row) => ({
      'S.No': row.id,
      'Client Code': row.clientCode || '',
      'Client Name': row.clientName || '',
      'Department (Store)': row.storeName || '',
      'Aging': Number(Number(row.aging || 0).toFixed(2)),
      'Pending Payment': Number(Number(row.pendingPayment || 0).toFixed(2)),
      'Ledger Balance': Number(Number(row.ledger || 0).toFixed(2)),
      'Knockoff': Number(Number(row.knockoff || 0).toFixed(2)),
      'Difference': Number(Number(row.difference || 0).toFixed(2)),
    }));

    await exportProfessionalExcel({
      title: 'Client Aging Ledger',
      fileName: 'Client_Aging_Ledger',
      sheetName: 'Client Aging Ledger',
      rows: exportRows,
      meta: [
        filterData.startDate && filterData.endDate
          ? `Period: ${formatDate(filterData.startDate)} to ${formatDate(filterData.endDate)}`
          : '',
        `Invoice aging: ${formatDate(agingStart)} to ${formatDate(filterData.endDate)}`,
        'Ledger Balance is the client Net Balance from Sundry Debtor Balance (same dates, all departments)',
        'Pending Payment is unrealized receipts from Payment Realize Report (status Pending) between Date From and Date To',
        'Knockoff is open credit from Knockoff Remaining (Credit - Remain on Knockoff vouchers)',
        'Difference = (Aging + Pending Payment) + Knockoff - Ledger Balance. If Ledger Balance is negative, whether Aging + Pending Payment is zero or not, Difference = (Aging + Pending Payment) + Knockoff + Ledger Balance',
      ].filter(Boolean),
      excludeKeys: ['_id', 'id'],
      totals: {
        'Client Name': 'GRAND TOTAL',
        'Department (Store)': '',
        Aging: Number(totals.aging.toFixed(2)),
        'Pending Payment': Number(totals.pendingPayment.toFixed(2)),
        'Ledger Balance': Number(totals.ledger.toFixed(2)),
        Knockoff: Number(totals.knockoff.toFixed(2)),
        Difference: Number(totals.difference.toFixed(2)),
      },
    });
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFontSize(14);
    doc.text('Client Aging Ledger', 148, 12, { align: 'center' });
    doc.setFontSize(9);
    doc.text(
      `Period: ${formatDate(filterData.startDate)} to ${formatDate(filterData.endDate)} | Aging: ${formatDate(agingStart)} to ${formatDate(filterData.endDate)}`,
      148,
      18,
      { align: 'center' }
    );
    doc.text('Pending Payment = unrealized receipts (Date From to Date To) | Knockoff from Knockoff Remaining', 148, 23, { align: 'center' });

    autoTable(doc, {
      startY: 28,
      head: [['#', 'Client Code', 'Client Name', 'Department (Store)', 'Aging', 'Pending Payment', 'Ledger Balance', 'Knockoff', 'Difference']],
      body: [
        ...filteredAndSortedRows.map((row) => [
          row.id,
          row.clientCode || '',
          row.clientName || '',
          row.storeName || 'N/A',
          formatCurrency(row.aging),
          formatCurrency(row.pendingPayment),
          formatCurrency(row.ledger),
          formatCurrency(row.knockoff),
          formatCurrency(row.difference),
        ]),
        [
          '',
          '',
          'TOTAL',
          '',
          formatCurrency(totals.aging),
          formatCurrency(totals.pendingPayment),
          formatCurrency(totals.ledger),
          formatCurrency(totals.knockoff),
          formatCurrency(totals.difference),
        ]
      ],
      styles: { fontSize: 8, cellPadding: 1.8 },
      headStyles: { fillColor: [44, 62, 80], textColor: 255 },
      columnStyles: {
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' },
        8: { halign: 'right' },
      }
    });

    doc.save(`Client_Aging_Ledger_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handlePrint = () => {
    const printContent = reportRef.current?.innerHTML;
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Client Aging Ledger</title>
          <style>
            body { font-family: Segoe UI, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 6px; }
            th { background: #f8f9fa; }
            .numeric { text-align: right; }
            .report-actions, .search-box, .filter-toggle { display: none; }
            .diff-nonzero { background: #fff4e5; }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 400);
  };

  return (
    <div className="sales-report-container" ref={reportRef}>
      <ReportPopupHeader title="Client Aging Ledger" />

      <div className="sales-report-header">
        <div>
          <h2 className="company-name">Pearl Dynamics</h2>
          <p className="muted">Ledger Balance is the Sundry Debtor Balance net for that client (same dates, all departments). Pending Payment is unrealized receipts from Payment Realize Report between Date From and Date To. Knockoff is open credit from Knockoff Remaining. {DIFFERENCE_NOTE}</p>
        </div>
        <div className="report-info">
          <h1 className="report-title">Client Aging Ledger</h1>
          <p className="muted">Generated: {new Date().toLocaleString()}</p>
          <p className="muted">
            Period: {formatDate(filterData.startDate)} to {formatDate(filterData.endDate)}
          </p>
          <p className="muted">
            Invoice Aging: {formatDate(agingStart)} to {formatDate(filterData.endDate)} (one row per customer)
          </p>
          <p className="muted">
            Pending Payment: {formatDate(filterData.startDate)} to {formatDate(filterData.endDate)} (Payment Realize Report, status Pending)
          </p>
        </div>
      </div>

      <div className="report-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search client..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="search-input"
          />
          <label className="filter-toggle">
            <input
              type="checkbox"
              checked={onlyDifference}
              onChange={(e) => setOnlyDifference(e.target.checked)}
            />
            Only non-zero difference
          </label>
        </div>
        <div className="summary-stats">
          <span>Clients: <strong>{filteredAndSortedRows.length}</strong></span>
          <span>Aging: <strong>{formatCurrency(totals.aging)}</strong></span>
          <span>Pending: <strong>{formatCurrency(totals.pendingPayment)}</strong></span>
          <span>Ledger: <strong>{formatCurrency(totals.ledger)}</strong></span>
          <span>Knockoff: <strong>{formatCurrency(totals.knockoff)}</strong></span>
          <span>Difference: <strong>{formatCurrency(totals.difference)}</strong></span>
        </div>
      </div>

      <div className="table-container">
        {isLoading ? (
          <div className="loader-wrapper">
            <div className="spinner"></div>
            <p>Loading client aging ledger...</p>
          </div>
        ) : (
          <table className="sales-data-table">
            <thead>
              <tr>
                <th onClick={() => requestSort('id')}>#{sortMark('id')}</th>
                <th onClick={() => requestSort('clientCode')}>Client Code{sortMark('clientCode')}</th>
                <th onClick={() => requestSort('clientName')}>Client Name{sortMark('clientName')}</th>
                <th onClick={() => requestSort('storeName')}>Department (Store){sortMark('storeName')}</th>
                <th onClick={() => requestSort('aging')}>Aging{sortMark('aging')}</th>
                <th onClick={() => requestSort('pendingPayment')}>Pending Payment{sortMark('pendingPayment')}</th>
                <th onClick={() => requestSort('ledger')}>Ledger Balance{sortMark('ledger')}</th>
                <th onClick={() => requestSort('knockoff')}>Knockoff{sortMark('knockoff')}</th>
                <th onClick={() => requestSort('difference')}>Difference{sortMark('difference')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedRows.length > 0 ? (
                filteredAndSortedRows.map((row) => (
                  <tr
                    key={`${row.clientId || row.id}::${row.storeId || row.storeName || ''}`}
                    className={Math.abs(Number(row.difference || 0)) > 1 ? 'diff-nonzero' : ''}
                  >
                    <td>{row.id}</td>
                    <td>{row.clientCode}</td>
                    <td>{row.clientName}</td>
                    <td>{row.storeName || 'N/A'}</td>
                    <td className="numeric">{formatCurrency(row.aging)}</td>
                    <td className="numeric">{formatCurrency(row.pendingPayment)}</td>
                    <td className="numeric">{formatCurrency(row.ledger)}</td>
                    <td className="numeric">{formatCurrency(row.knockoff)}</td>
                    <td className="numeric">{formatCurrency(row.difference)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="no-data">No client balances found</td>
                </tr>
              )}
              {filteredAndSortedRows.length > 0 && (
                <tr className="footer-row">
                  <td colSpan="4" className="footer-total">Totals</td>
                  <td className="numeric footer-total">{formatCurrency(totals.aging)}</td>
                  <td className="numeric footer-total">{formatCurrency(totals.pendingPayment)}</td>
                  <td className="numeric footer-total">{formatCurrency(totals.ledger)}</td>
                  <td className="numeric footer-total">{formatCurrency(totals.knockoff)}</td>
                  <td className="numeric footer-total">{formatCurrency(totals.difference)}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="report-actions">
        <button className="btn btn-excel" onClick={exportToExcel} disabled={isLoading || !rows.length}>Excel</button>
        <button className="btn btn-pdf" onClick={exportToPDF} disabled={isLoading || !rows.length}>PDF</button>
        <button className="btn btn-print" onClick={handlePrint} disabled={isLoading || !rows.length}>Print</button>
      </div>

      <style>{`
        .sales-report-container {
          font-family: 'Segoe UI', sans-serif;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          padding: 24px;
          margin: 20px auto;
          max-width: 1560px;
          color: #333;
        }
        .sales-report-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #eaeaea;
        }
        .company-name { margin: 0 0 6px 0; color: #2c3e50; }
        .report-title { margin: 0 0 6px 0; color: #3498db; font-size: 20px; }
        .report-info { text-align: right; }
        .muted { color: #7f8c8d; font-size: 12px; margin: 4px 0; }
        .report-controls {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .search-box { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .search-input {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          min-width: 250px;
        }
        .filter-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #555;
        }
        .summary-stats { display: flex; gap: 16px; font-size: 13px; flex-wrap: wrap; }
        .table-container { overflow-x: auto; border: 1px solid #e0e0e0; border-radius: 6px; }
        .sales-data-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 1080px; }
        .sales-data-table th {
          background: #f8f9fa;
          padding: 10px;
          text-align: left;
          cursor: pointer;
          white-space: nowrap;
        }
        .sales-data-table td { padding: 8px 10px; border-bottom: 1px solid #eaeaea; }
        .numeric { text-align: right; font-variant-numeric: tabular-nums; }
        .footer-total { font-weight: 700; background: #f8f9fa; }
        .diff-nonzero { background: #fff7ed; }
        .no-data { text-align: center; padding: 30px; color: #95a5a6; }
        .report-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          color: #fff;
          cursor: pointer;
          font-weight: 600;
        }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-excel { background: #217346; }
        .btn-pdf { background: #f40f02; }
        .btn-print { background: #555; }
        .loader-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 180px;
          gap: 12px;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 5px solid #ccc;
          border-top: 5px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media print {
          .report-controls, .report-actions { display: none; }
        }
      `}</style>
    </div>
  );
};

export default ClientAgingLedgerPopup;
