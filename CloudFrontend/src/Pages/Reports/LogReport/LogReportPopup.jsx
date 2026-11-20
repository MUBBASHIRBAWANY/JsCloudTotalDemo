import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { getDataFundtion } from '../../../Api/CRUDFunctions';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import ReportPopupHeader from '../../../Components/Global/ReportPopupHeader.jsx';
import { exportProfessionalExcel } from '../../../utils/exportProfessionalExcel';


// ─── Constants ──────────────────────────────────────────────────────────────
const COMPANY_INFO = {
  name: 'Pearl Dynamic (pvt) ltd(Private) Limited',
  address: '123 Business Avenue, City',
  phone: '+92-XXX-XXXXXXX',
  website: 'jaffersons.com',
  developer: 'JS International',
  contact: '0301-8251291',
};

const LOG_TYPES = {
  CREATE: ['create', 'add'],
  UPDATE: ['update', 'edit'],
  DELETE: ['delete', 'remove'],
  POST: ['post', 'post'],
  REJECT: ['reject', 'reject'],
};

const THEME = {
  primary: '#185FA5',
  create: { bg: '#EAF3DE', color: '#3B6D11', dot: '#639922' },
  post: { bg: '#EAF3DE', color: '#3B6D11', dot: '#639922' },
  update: { bg: '#E6F1FB', color: '#185FA5', dot: '#378ADD' },
  delete: { bg: '#FCEBEB', color: '#A32D2D', dot: '#E24B4A' },
  reject: { bg: '#FCEBEB', color: '#A32D2D', dot: '#E24B4A' },
  default: { bg: '#f3f4f6', color: '#4b5563', dot: '#9ca3af' },
};

// ─── Utility Functions ─────────────────────────────────────────────────────
const typeColor = (type = '') => {
  const normalizedType = type.toLowerCase();
  if (LOG_TYPES.CREATE.some(t => normalizedType.includes(t))) return THEME.create;
  if (LOG_TYPES.UPDATE.some(t => normalizedType.includes(t))) return THEME.update;
  if (LOG_TYPES.DELETE.some(t => normalizedType.includes(t))) return THEME.delete;
  if (LOG_TYPES.POST.some(t => normalizedType.includes(t))) return THEME.post;
  if (LOG_TYPES.REJECT.some(t => normalizedType.includes(t))) return THEME.reject;
  return THEME.default;
};

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
const createUserMap = (users) => {
  const map = {};
  users?.forEach(user => {
    map[user._id] = user.firstname;
  });
  return map;
};

const normalizeUserOptions = (users) => {
  return users?.map(user => ({
    label: `${user.firstname || ''} ${user.lastname || ''}`.trim(),
    value: user._id,
    name: user.firstname,
  })) || [];
};

// ─── Custom Hooks ───────────────────────────────────────────────────────────
const useUsers = () => {
  const [usersMap, setUsersMap] = useState({});
  const [userOptions, setUserOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getDataFundtion('/users');
      
      if (response?.data) {
        const users = response.data;
        setUsersMap(createUserMap(users));
        setUserOptions(normalizeUserOptions(users));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const getUserName = useCallback((id) => {
    if (!id) return '—';
    return usersMap[id] || id;
  }, [usersMap]);

  return { usersMap, userOptions, loading, getUserName, refreshUsers: fetchUsers };
};

// ─── Custom Hooks ──────────────────────────────────────────────────────────
const useLogData = (startDate, endDate) => {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);
  const [PaymentRecipt, setPaymentRecipt] = useState([]);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await getDataFundtion(`/LogReport?${params}`, {});
      const data = response?.data || [];
      const PaymentReciptRes = await getDataFundtion("/PaymentRecived/getPaymentReciptNumvoucher");
      const receiptData = Array.isArray(PaymentReciptRes) ? PaymentReciptRes : (PaymentReciptRes?.data || []);
      console.log('PaymentRecipt data:', receiptData);
      setPaymentRecipt(receiptData);
      setLogs(data);
      toast.success(`Loaded ${data.length} log records`);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setError(error);
      setLogs([]);
      toast.error('Failed to load logs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, loading, error, refresh: fetchLogs, PaymentRecipt };
};

// ─── Print Template ───────────────────────────────────────────────────────
const generatePrintHTML = (filteredLogs, startDate, endDate, selectedCreatedBy, receiptByVoucher, getUserName) => {
  const currentDateTime = new Date().toLocaleString('en-GB');
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Activity Log Report - ${COMPANY_INFO.name}</title>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
          padding: 32px;
          color: #111827;
          line-height: 1.5;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 3px solid ${THEME.primary};
          padding-bottom: 20px;
          margin-bottom: 28px;
        }
        
        .company-info h1 {
          font-size: 22px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 4px;
        }
        
        .company-info p {
          font-size: 12px;
          color: #6b7280;
        }
        
        .report-info {
          text-align: right;
        }
        
        .report-title {
          font-size: 18px;
          font-weight: 700;
          color: ${THEME.primary};
          margin-bottom: 8px;
        }
        
        .report-meta {
          font-size: 11px;
          color: #6b7280;
          line-height: 1.8;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 28px;
        }
        
        .stat-card {
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
          border-left: 4px solid ${THEME.primary};
        }
        
        .stat-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #6b7280;
          font-weight: 600;
          margin-bottom: 4px;
        }
        
        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #111827;
        }
        
        .filters-info {
          display: flex;
          gap: 24px;
          margin-bottom: 24px;
          padding: 12px 16px;
          background: #f9fafb;
          border-radius: 8px;
          font-size: 12px;
          color: #6b7280;
        }
        
        .filter-item {
          display: flex;
          gap: 4px;
        }
        
        .filter-label {
          font-weight: 600;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        
        thead {
          background: ${THEME.primary};
        }
        
        th {
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          color: #ffffff;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        td {
          padding: 10px 16px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        tr:nth-child(even) {
          background: #f9fafb;
        }
        
        .voucher-code {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          background: #f3f4f6;
          padding: 2px 8px;
          border-radius: 4px;
          border: 1px solid #e5e7eb;
        }
        
        .user-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .user-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #E6F1FB;
          color: ${THEME.primary};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
        }
        
        .type-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
        }
        
        .type-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        
        .index-cell {
          color: #9ca3af;
          font-size: 12px;
        }
        
        .date-cell {
          color: #6b7280;
          font-size: 12px;
        }
        
        .footer {
          margin-top: 32px;
          text-align: center;
          font-size: 10px;
          color: #9ca3af;
          border-top: 1px solid #e5e7eb;
          padding-top: 16px;
        }
        
        @media print {
          body {
            padding: 20px;
          }
          
          @page {
            margin: 20mm;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-info">
          <h1>${COMPANY_INFO.name}</h1>
          <p>${COMPANY_INFO.address} · Phone: ${COMPANY_INFO.phone}</p>
        </div>
        <div class="report-info">
          <div class="report-title">Activity Log</div>
          <div class="report-meta">
            <div>Generated: ${currentDateTime}</div>
            <div>Period: ${startDate || 'All'} to ${endDate || 'All'}</div>
            ${selectedCreatedBy.length > 0 ? 
              `<div>Users: ${selectedCreatedBy.map(u => u.label).join(', ')}</div>` : ''}
          </div>
        </div>
      </div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Records</div>
          <div class="stat-value">${filteredLogs.length}</div>
        </div>
        <div class="stat-card" style="border-left-color: ${THEME.create.color};">
          <div class="stat-label">Creates</div>
          <div class="stat-value">${filteredLogs.filter(l => LOG_TYPES.CREATE.some(t => (l.action || '').toLowerCase().includes(t))).length}</div>
        </div>
        <div class="stat-card" style="border-left-color: ${THEME.update.color};">
          <div class="stat-label">Updates</div>
          <div class="stat-value">${filteredLogs.filter(l => LOG_TYPES.UPDATE.some(t => (l.action || '').toLowerCase().includes(t))).length}</div>
        </div>
        <div class="stat-card" style="border-left-color: ${THEME.delete.color};">
          <div class="stat-label">Deletes</div>
          <div class="stat-value">${filteredLogs.filter(l => LOG_TYPES.DELETE.some(t => (l.action || '').toLowerCase().includes(t))).length}</div>
        </div>
      </div>
      
      <div class="filters-info">
        <div class="filter-item">
          <span class="filter-label">Users:</span>
          <span>${selectedCreatedBy.length > 0 ? selectedCreatedBy.map(u => u.label).join(', ') : 'All Users'}</span>
        </div>
        <div class="filter-item">
          <span class="filter-label">Period:</span>
          <span>${startDate || 'All'} → ${endDate || 'All'}</span>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th style="width: 4%;">#</th>
            <th style="width: 12%;">Voucher Number</th>
            <th style="width: 10%;">Receipt #</th>
            <th style="width: 10%;">Receipt Date</th>
            <th style="width: 12%;">Receipt Entered By</th>
            <th style="width: 12%;">Created By</th>
            <th style="width: 10%;">Page</th>
            <th style="width: 10%;">Type</th>
            <th style="width: 16%;">Created At</th>
          </tr>
        </thead>
        <tbody>
          ${filteredLogs.map((log, index) => {
            const tc = typeColor(log.action);
            const receipt = receiptByVoucher[log.RefNumber];
            // ✅ FIX: receipt.userId pass karo, ReciptNumber nahi
            const receiptEnteredByName = receipt?.userId 
              ? getUserName(receipt.userId) 
              : '—';
            return `
              <tr>
                <td class="index-cell">${index + 1}</td>
                <td>
                  <span class="voucher-code">${log.RefNumber || '—'}</span>
                </td>
                <td>
                  <span class="voucher-code">${receipt?.ReciptNumber || '—'}</span>
                </td>
                <td class="date-cell">${receipt?.ReciptDate || '—'}</td>
                <td>
                  ${receipt ? `
                    <div class="user-info">
                      <div class="user-avatar">${receiptEnteredByName.slice(0, 2).toUpperCase()}</div>
                      ${receiptEnteredByName}
                    </div>
                  ` : '<span style="color:#9ca3af;">—</span>'}
                </td>
                <td>
                  <div class="user-info">
                    <div class="user-avatar">${getUserName((log.userId) || '?').slice(0, 2).toUpperCase()}</div>
                    ${getUserName((log.userId) || '—')}
                  </div>
                </td>
                <td>
                  <span class="type-badge" style="background: ${tc.bg}; color: ${tc.color};">
                    <span class="type-dot" style="background: ${tc.dot};"></span>
                    ${log.Page || '—'}
                  </span>
                </td>
                <td>
                  <span class="type-badge" style="background: ${tc.bg}; color: ${tc.color};">
                    <span class="type-dot" style="background: ${tc.dot};"></span>
                    ${log.action || '—'}
                  </span>
                </td>
                <td class="date-cell">${formatDateTime(log.createdAt)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      
      <div class="footer">
        Developed by ${COMPANY_INFO.developer} · ${COMPANY_INFO.website} · ${COMPANY_INFO.contact}
      </div>
    </body>
    </html>
  `;
};

// ─── Main Component ───────────────────────────────────────────────────────
const LogReportPopup = ({ filterData = {} }) => {
  const {
    startDate = '',
    endDate = '',
    selectedCreatedBy = [],
  } = filterData;

  // Refs
  const reportRef = useRef(null);
  
  // State
  const [search, setSearch] = useState('');
  
  // Custom Hooks
  const { logs, loading, error, refresh, PaymentRecipt } = useLogData(startDate, endDate);
  const { usersMap, userOptions, getUserName } = useUsers();

  // Build PaymentRecipt lookup maps:
  // receiptByVoucher: Voucher(=RefNumber) -> receipt
  // receiptByReceiptNumber: ReciptNumber -> receipt (for reverse search)
  const { receiptByVoucher, receiptByReceiptNumber } = useMemo(() => {
    const byVoucher = {};
    const byReceiptNumber = {};
    const receiptArr = Array.isArray(PaymentRecipt) ? PaymentRecipt : [];
    receiptArr.forEach(rec => {
      if (rec.Voucher) {
        byVoucher[rec.Voucher] = rec;
      }
      if (rec.ReciptNumber) {
        byReceiptNumber[rec.ReciptNumber] = rec;
      }
    });
    return { receiptByVoucher: byVoucher, receiptByReceiptNumber: byReceiptNumber };
  }, [PaymentRecipt]);

const RepitNumber = (Reipt)=> {
  if(!Reipt) return "-"
const filteruserId = logs.find((ref) => ref.RefNumber == Reipt)?.userId || ""
return getUserName(filteruserId)
}


  // ─── Data Filtering ─────────────────────────────────────────────────────
  const filterLogs = useCallback((logs, searchTerm, createdByFilter) => {
    return logs.filter(log => {
      // Filter by created users
      if (createdByFilter.length > 0) {
        const selectedUserIds = createdByFilter.map(o => o.value);
        if (!selectedUserIds.includes(log.createdBy)) return false;
      }
      
      // Search functionality
      if (!searchTerm) return true;
      
      const searchLower = searchTerm.toLowerCase();
      
      // Check if any receipt matches this search term
      const matchedReceipt = receiptByReceiptNumber[searchTerm] || null;
      // If search matches a receipt's ReciptNumber, check if THIS log's RefNumber matches that receipt's Voucher
      if (matchedReceipt && log.RefNumber === matchedReceipt.Voucher) return true;
      
      // Also check if any receipt with this search term has a Voucher matching this log's RefNumber
      const receipt = receiptByVoucher[log.RefNumber];
      return (
        (log.RefNumber || '').toLowerCase().includes(searchLower) ||
        (log.userId || '').toLowerCase().includes(searchLower) ||
        (log.Page || '').toLowerCase().includes(searchLower) ||
        (log.action || '').toLowerCase().includes(searchLower) ||
        (receipt?.ReciptNumber || '').toLowerCase().includes(searchLower) ||
        (receipt?.ReciptDate || '').toLowerCase().includes(searchLower)
      );
    });
  }, [receiptByVoucher, receiptByReceiptNumber]);

  const filteredLogs = filterLogs(logs, search, selectedCreatedBy);

  // ─── Statistics ─────────────────────────────────────────────────────────
  const statistics = {
    total: filteredLogs.length,
    creates: filteredLogs.filter(log => 
      LOG_TYPES.CREATE.some(t => (log.action || '').toLowerCase().includes(t))
    ).length,
    updates: filteredLogs.filter(log => 
      LOG_TYPES.UPDATE.some(t => (log.action || '').toLowerCase().includes(t))
    ).length,
    deletes: filteredLogs.filter(log => 
      LOG_TYPES.DELETE.some(t => (log.action || '').toLowerCase().includes(t))
    ).length,
  };

  // ─── Export Handlers ────────────────────────────────────────────────────
  const handlePrint = useCallback(() => {
    if (filteredLogs.length === 0) {
      toast.warning('No data to print');
      return;
    }
    
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
      toast.error('Please allow pop-ups for printing');
      return;
    }
    
    const htmlContent = generatePrintHTML(filteredLogs, startDate, endDate, selectedCreatedBy, receiptByVoucher, getUserName);
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }, [filteredLogs, startDate, endDate, selectedCreatedBy, receiptByVoucher, getUserName]);

  const exportToExcel = useCallback(async () => {
    if (filteredLogs.length === 0) {
      toast.warning('No data to export');
      return;
    }
    
    try {
      toast.loading('Exporting to Excel...');

      const rows = filteredLogs.map((log, index) => {
        const receipt = receiptByVoucher[log.RefNumber];
        const receiptEnteredByName = receipt?.userId
          ? getUserName(receipt.userId)
          : '—';
        return {
          '#': index + 1,
          'Voucher Number': log.RefNumber || '—',
          'Receipt #': receipt?.ReciptNumber || '—',
          'Receipt Date': receipt?.ReciptDate || '—',
          'Receipt Entered By': receiptEnteredByName,
          'Created By': getUserName(log.userId) || '—',
          'Page': log.Page || '—',
          'Type': log.action || '—',
          'Created At': formatDateTime(log.createdAt),
        };
      });

      await exportProfessionalExcel({
        title: 'Activity Log Report',
        fileName: 'LogReport',
        sheetName: 'Log Report',
        rows,
        columns: [
          { header: '#', key: '#' },
          { header: 'Voucher Number', key: 'Voucher Number', type: 'text' },
          { header: 'Receipt #', key: 'Receipt #', type: 'text' },
          { header: 'Receipt Date', key: 'Receipt Date', type: 'text' },
          { header: 'Receipt Entered By', key: 'Receipt Entered By', type: 'text' },
          { header: 'Created By', key: 'Created By', type: 'text' },
          { header: 'Page', key: 'Page', type: 'text' },
          { header: 'Type', key: 'Type', type: 'text' },
          { header: 'Created At', key: 'Created At', type: 'text' },
        ],
        meta: [
          `Period: ${startDate || 'All'} to ${endDate || 'All'}`,
          selectedCreatedBy.length > 0
            ? `Users: ${selectedCreatedBy.map((u) => u.label).join(', ')}`
            : 'Users: All Users',
          `Creates: ${statistics.creates}`,
          `Updates: ${statistics.updates}`,
          `Deletes: ${statistics.deletes}`,
        ],
        excludeKeys: ['_id', 'id'],
      });

      toast.dismiss();
      toast.success('Excel exported successfully!');
    } catch (error) {
      console.error('Excel export error:', error);
      toast.dismiss();
      toast.error('Failed to export Excel. Please try again.');
    }
  }, [filteredLogs, startDate, endDate, selectedCreatedBy, statistics, receiptByVoucher, getUserName]);

  const exportToPdf = useCallback(() => {
    if (filteredLogs.length === 0) {
      toast.warning('No data to export');
      return;
    }
    
    try {
      toast.loading('Generating PDF...');
      
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      let currentY = margin;

      // Header with company branding
      doc.setFillColor(parseInt(THEME.primary.slice(1, 3), 16), parseInt(THEME.primary.slice(3, 5), 16), parseInt(THEME.primary.slice(5, 7), 16));
      doc.rect(0, 0, pageWidth, 24, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(COMPANY_INFO.name, margin, 10);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Log Report | Generated: ${new Date().toLocaleString('en-GB')}`, margin, 17);
      doc.text(`Period: ${startDate || 'All'} to ${endDate || 'All'}`, pageWidth - margin, 17, { align: 'right' });

      currentY = 32;

      // Statistics cards
      const cardWidth = (pageWidth - margin * 2 - 12) / 4;
      const stats = [
        { label: 'Total Records', value: statistics.total, color: THEME.primary },
        { label: 'Creates', value: statistics.creates, color: THEME.create.color },
        { label: 'Updates', value: statistics.updates, color: THEME.update.color },
        { label: 'Deletes', value: statistics.deletes, color: THEME.delete.color },
      ];

      stats.forEach((stat, index) => {
        const x = margin + index * (cardWidth + 4);
        
        // Card background
        doc.setFillColor(249, 250, 251);
        doc.roundedRect(x, currentY, cardWidth, 16, 2, 2, 'F');
        
        // Card border left
        const colorHex = stat.color.replace('#', '');
        doc.setFillColor(parseInt(colorHex.substr(0, 2), 16), parseInt(colorHex.substr(2, 2), 16), parseInt(colorHex.substr(4, 2), 16));
        doc.rect(x, currentY, 3, 16, 'F');
        
        // Label
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text(stat.label.toUpperCase(), x + 8, currentY + 6);
        
        // Value
        doc.setTextColor(17, 24, 39);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(String(stat.value), x + 8, currentY + 13);
      });

      currentY += 24;

      // Table
      autoTable(doc, {
        startY: currentY,
        head: [['#', 'Voucher Number', 'Receipt #', 'Receipt Date', 'Receipt Entered By', 'Created By', 'Page', 'Type', 'Created At']],
        body: filteredLogs.map((log, index) => {
          const receipt = receiptByVoucher[log.RefNumber];
          // ✅ FIX: receipt.userId pass karo
          const receiptEnteredByName = receipt?.userId 
            ? getUserName(receipt.userId) 
            : '—';
          return [
            index + 1,
            log.RefNumber || '—',
            receipt?.ReciptNumber || '—',
            receipt?.ReciptDate || '—',
            receiptEnteredByName,
            log.userId || '—',
            log.Page || '—',
            log.action || '—',
            formatDateTime(log.createdAt),
          ];
        }),
        headStyles: {
          fillColor: [parseInt(THEME.primary.slice(1, 3), 16), parseInt(THEME.primary.slice(3, 5), 16), parseInt(THEME.primary.slice(5, 7), 16)],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
          cellPadding: 5,
        },
        bodyStyles: {
          textColor: [17, 24, 39],
          fontSize: 9,
          cellPadding: 4,
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251],
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 25 },
          2: { cellWidth: 16 },
          3: { cellWidth: 16 },
          4: { cellWidth: 20 },
          5: { cellWidth: 20 },
          6: { cellWidth: 15 },
          7: { cellWidth: 20 },
          8: { cellWidth: 22 },
        },
        margin: { left: margin, right: margin },
        didDrawPage: (data) => {
          // Footer
          doc.setFontSize(8);
          doc.setTextColor(156, 163, 175);
          doc.text(
            `Page ${data.pageCount} | ${COMPANY_INFO.developer} · ${COMPANY_INFO.website} · ${COMPANY_INFO.contact}`,
            pageWidth / 2,
            pageHeight - 8,
            { align: 'center' }
          );
        },
      });

      const fileName = `LogReport_${COMPANY_INFO.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.pdf`;
      doc.save(fileName);
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF. Please try again.');
    }
  }, [filteredLogs, startDate, endDate, statistics, receiptByVoucher, getUserName]);

  // ─── Render ─────────────────────────────────────────────────────────────
  if (error) {
    return (
    <div>
      <ReportPopupHeader title="Activity Log Report" />
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <h3 style={styles.errorTitle}>Failed to load logs</h3>
        <p style={styles.errorMessage}>There was an error fetching the log data. Please try again.</p>
        <button onClick={refresh} style={styles.retryButton}>
          Retry
        </button>
      </div>
    </div>
    );
  }

  return (
    <div style={styles.page} ref={reportRef}>
      {/* Header Section */}
      <header style={styles.header}>
        <div style={styles.headerAccent} />
        <div style={styles.headerContent}>
          <div style={styles.companyInfo}>
            <h1 style={styles.companyName}>{COMPANY_INFO.name}</h1>
            <p style={styles.companyAddress}>
              {COMPANY_INFO.address} · Phone: {COMPANY_INFO.phone}
            </p>
          </div>
          
          <div style={styles.reportBadgeContainer}>
            <div style={styles.reportBadge}>Activity Log Report</div>
          </div>
          
          <div style={styles.reportDetails}>
            <p style={styles.reportMeta}>
              Generated: {new Date().toLocaleString('en-GB')}
            </p>
            <p style={styles.reportMeta}>
              Period: <strong>{startDate || 'All'}</strong> → <strong>{endDate || 'All'}</strong>
            </p>
            {selectedCreatedBy.length > 0 && (
              <p style={styles.reportMeta}>
                Users: {selectedCreatedBy.map(u => u.label).join(', ')}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Statistics Cards */}
      <div style={styles.statsGrid}>
        {[
          { label: 'Total Records', value: statistics.total, color: THEME.primary },
          { label: 'Creates', value: statistics.creates, color: THEME.create.color },
          { label: 'Updates', value: statistics.updates, color: THEME.update.color },
          { label: 'Deletes', value: statistics.deletes, color: THEME.delete.color },
        ].map((stat) => (
          <div key={stat.label} style={styles.statCard}>
            <div style={styles.statLabel}>{stat.label}</div>
            <div style={{ ...styles.statValue, color: stat.color }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Controls Bar */}
      <div style={styles.controls}>
        <div style={styles.searchContainer}>
          <svg style={styles.searchIcon} width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M7.333 12.667A5.333 5.333 0 1 0 7.333 2a5.333 5.333 0 0 0 0 10.667ZM14 14l-2.867-2.867" 
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search by voucher #, receipt #, user, type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        
        <div style={styles.recordCount}>
          {filteredLogs.length} {filteredLogs.length === 1 ? 'record' : 'records'}
        </div>
        
        <div style={styles.spacer} />
        
        <div style={styles.buttonGroup}>
          <button
            onClick={exportToExcel}
            disabled={filteredLogs.length === 0}
            style={{
              ...styles.button,
              ...styles.excelButton,
              ...(filteredLogs.length === 0 ? styles.buttonDisabled : {}),
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h5.793L12 4.707V12.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 2 12.5v-9Z"/>
              <path d="M5 7h2v1H5V7Zm0 2h6v1H5V9Zm0 2h6v1H5v-1Z"/>
            </svg>
            Export Excel
          </button>
          
          <button
            onClick={exportToPdf}
            disabled={filteredLogs.length === 0}
            style={{
              ...styles.button,
              ...styles.pdfButton,
              ...(filteredLogs.length === 0 ? styles.buttonDisabled : {}),
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 1a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5.414a1 1 0 0 0-.293-.707l-2.828-2.828A1 1 0 0 0 9.172 1.5L4 1Z"/>
              <path d="M5 8h2v1H5V8Zm0 2h6v1H5v-1Zm0 2h4v1H5v-1Z" fill="white"/>
            </svg>
            Export PDF
          </button>
          
          <button
            onClick={handlePrint}
            disabled={filteredLogs.length === 0}
            style={{
              ...styles.button,
              ...styles.printButton,
              ...(filteredLogs.length === 0 ? styles.buttonDisabled : {}),
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 4V1h8v3h1.5A1.5 1.5 0 0 1 15 5.5v4A1.5 1.5 0 0 1 13.5 11H12v3H4v-3H2.5A1.5 1.5 0 0 1 1 9.5v-4A1.5 1.5 0 0 1 2.5 4H4Z"/>
            </svg>
            Print
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div style={styles.tableWrapper}>
        {loading ? (
          <div style={styles.loadingState}>
            <div style={styles.spinner} />
            <p>Loading log entries...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={styles.emptyState}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M9 11l3 3L22 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h3 style={styles.emptyTitle}>No Log Records Found</h3>
            <p style={styles.emptyDescription}>
              No data matches your current filters. Try adjusting your search criteria or date range.
            </p>
            <button onClick={refresh} style={styles.refreshButton}>
              Reset Filters
            </button>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: '5%' }}>#</th>
                <th style={{ ...styles.th, width: '12%' }}>Reference Number</th>
                <th style={{ ...styles.th, width: '10%' }}>Receipt #</th>
                <th style={{ ...styles.th, width: '10%' }}>Receipt Date</th>
                <th style={{ ...styles.th, width: '12%' }}>Receipt Entered By</th>
                <th style={{ ...styles.th, width: '12%' }}>Created By</th>
                <th style={{ ...styles.th, width: '10%' }}>Page</th>
                <th style={{ ...styles.th, width: '10%' }}>Type</th>
                <th style={{ ...styles.th, width: '16%' }}>Created At</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, index) => {
                const colors = typeColor(log.action);
                const receipt = receiptByVoucher[log.RefNumber];
                // ✅ FIX: receipt.userId pass karo, ReciptNumber nahi
                const receiptEnteredByName = receipt?.ReciptNumber
                  ? RepitNumber(receipt?.ReciptNumber) 
                  : '—';
                return (
                  <tr 
                    key={log._id || index} 
                    style={index % 2 === 0 ? styles.trEven : styles.trOdd}
                  >
                    <td style={styles.tdIndex}>{index + 1}</td>
                    <td style={styles.td}>
                      <code style={styles.voucherCode}>
                        {log.RefNumber || '—'}
                      </code>
                    </td>
                    <td style={styles.td}>
                      <code style={{ 
                        ...styles.voucherCode, 
                        backgroundColor: receipt ? '#EAF3DE' : '#f3f4f6', 
                        borderColor: receipt ? '#C0DD97' : '#e5e7eb' 
                      }}>
                        {receipt?.ReciptNumber || '—'}
                      </code>
                    </td>
                    <td style={styles.tdDate}>
                      {receipt?.ReciptDate || '—'}
                    </td>
                    <td style={styles.td}>
                      {receipt ? (
                        <div style={styles.userCell}>
                          <div style={styles.userAvatar}>
                            {receiptEnteredByName.slice(0, 2).toUpperCase()}
                          </div>
                          <span style={styles.userName}>{receiptEnteredByName}</span>
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.userCell}>
                        <div style={styles.userAvatar}>
                          {getUserName((log.userId) || '?').slice(0, 2).toUpperCase()}
                        </div>
                        <span style={styles.userName}>{getUserName(log.userId) || '—'}</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.typeBadge,
                        backgroundColor: colors.bg,
                        color: colors.color,
                      }}>
                        <span style={{ ...styles.typeDot, backgroundColor: colors.dot }} />
                        {log.Page || '—'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.typeBadge,
                        backgroundColor: colors.bg,
                        color: colors.color,
                      }}>
                        <span style={{ ...styles.typeDot, backgroundColor: colors.dot }} />
                        {log.action || '—'}
                      </span>
                    </td>
                    <td style={styles.tdDate}>
                      {formatDateTime(log.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        Developed by {COMPANY_INFO.developer} · {COMPANY_INFO.website} · {COMPANY_INFO.contact}
      </footer>
    </div>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = {
  page: {
    fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    padding: '0 0 3rem',
  },
  
  // Error State
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    padding: '2rem',
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  errorTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '0.5rem',
  },
  errorMessage: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginBottom: '1.5rem',
  },
  retryButton: {
    padding: '0.625rem 1.5rem',
    backgroundColor: THEME.primary,
    color: '#ffffff',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  
  // Header
  header: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: '1.5rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  headerAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: THEME.primary,
  },
  headerContent: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 20,
    padding: '2rem 2.5rem 1.75rem',
  },
  companyInfo: {},
  companyName: {
    fontSize: 20,
    fontWeight: 700,
    color: '#111827',
    margin: 0,
    letterSpacing: '-0.3px',
  },
  companyAddress: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  reportBadgeContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  reportBadge: {
    backgroundColor: THEME.primary,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '2px',
    padding: '8px 24px',
    borderRadius: 6,
    textTransform: 'uppercase',
  },
  reportDetails: {
    textAlign: 'right',
  },
  reportMeta: {
    fontSize: 12,
    color: '#6b7280',
    margin: '3px 0',
    lineHeight: 1.6,
  },
  
  // Statistics
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16,
    padding: '0 2.5rem',
    marginBottom: '1.5rem',
  },
  statCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: '1.25rem 1.5rem',
    transition: 'all 0.2s ease',
    cursor: 'default',
    ':hover': {
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
      transform: 'translateY(-1px)',
    },
  },
  statLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 700,
    lineHeight: 1,
  },
  
  // Controls
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '0 2.5rem',
    marginBottom: '1.25rem',
    flexWrap: 'wrap',
  },
  searchContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    color: '#9ca3af',
    pointerEvents: 'none',
  },
  searchInput: {
    padding: '8px 16px 8px 36px',
    border: '1.5px solid #d1d5db',
    borderRadius: 10,
    fontSize: 13,
    outline: 'none',
    width: 300,
    backgroundColor: '#ffffff',
    transition: 'all 0.15s ease',
  },
  recordCount: {
    fontSize: 13,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '8px 18px',
    borderRadius: 20,
    fontWeight: 500,
    border: '1px solid #e5e7eb',
  },
  spacer: {
    flex: 1,
  },
  buttonGroup: {
    display: 'flex',
    gap: 8,
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 20px',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    border: '1.5px solid transparent',
    transition: 'all 0.15s ease',
    letterSpacing: '0.1px',
  },
  excelButton: {
    backgroundColor: '#EAF3DE',
    color: '#3B6D11',
    borderColor: '#C0DD97',
  },
  pdfButton: {
    backgroundColor: '#FCEBEB',
    color: '#A32D2D',
    borderColor: '#F7C1C1',
  },
  printButton: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
    borderColor: '#d1d5db',
  },
  buttonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  
  // Table
  tableWrapper: {
    margin: '0 2.5rem',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13.5,
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    backgroundColor: '#f9fafb',
    borderBottom: '2px solid #e5e7eb',
  },
  td: {
    padding: '12px 16px',
    color: '#111827',
    borderBottom: '1px solid #f3f4f6',
    verticalAlign: 'middle',
  },
  tdIndex: {
    padding: '12px 16px',
    color: '#9ca3af',
    fontSize: 12,
    borderBottom: '1px solid #f3f4f6',
    verticalAlign: 'middle',
    textAlign: 'center',
  },
  tdDate: {
    padding: '12px 16px',
    color: '#6b7280',
    fontSize: 12,
    borderBottom: '1px solid #f3f4f6',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
  },
  trEven: {},
  trOdd: {
    backgroundColor: '#fafafa',
  },
  voucherCode: {
    fontFamily: "'SF Mono', 'Courier New', monospace",
    fontSize: 12,
    color: '#4b5563',
    backgroundColor: '#f3f4f6',
    padding: '3px 10px',
    borderRadius: 6,
    border: '1px solid #e5e7eb',
    fontWeight: 500,
  },
  userCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  userAvatar: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
    backgroundColor: '#E6F1FB',
    color: THEME.primary,
    flexShrink: 0,
    border: '2px solid #DBEAFE',
  },
  userName: {
    fontSize: 13.5,
    fontWeight: 500,
  },
  typeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
  },
  typeDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    display: 'inline-block',
    flexShrink: 0,
  },
  
  // States
  loadingState: {
    textAlign: 'center',
    padding: '4rem 2rem',
    color: '#6b7280',
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid #e5e7eb',
    borderTopColor: THEME.primary,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto 1rem',
  },
  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem',
    color: '#9ca3af',
  },
  emptyTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#374151',
    marginTop: '1rem',
    marginBottom: '0.5rem',
  },
  emptyDescription: {
    fontSize: '0.875rem',
    marginBottom: '1.5rem',
    maxWidth: '400px',
    margin: '0 auto 1.5rem',
  },
  refreshButton: {
    padding: '0.5rem 1.5rem',
    backgroundColor: '#ffffff',
    color: THEME.primary,
    border: `1.5px solid ${THEME.primary}`,
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  
  // Footer
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: '#9ca3af',
    marginTop: '2.5rem',
    padding: '1.5rem 0 0',
    borderTop: '1px solid #e5e7eb',
  },
};

export default LogReportPopup;