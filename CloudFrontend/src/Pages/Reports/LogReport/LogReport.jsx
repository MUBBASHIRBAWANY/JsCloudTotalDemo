import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import AsyncSelect from 'react-select/async';
import { toast } from 'react-toastify';
import ReactDOM from 'react-dom/client';
import { getDataFundtion } from '../../../Api/CRUDFunctions';
import LogReportPopup from './LogReportPopup';
import ReportPageLayout from '../../../Components/Global/ReportPageLayout.jsx';
import AppSelect from '../../../Components/Global/AppSelect.jsx';

// ─── Constants ──────────────────────────────────────────────────────────────
const DEFAULT_DATE_RANGE = {
  start: format(subDays(new Date(), 10), 'yyyy-MM-dd'),
  end: format(new Date(), 'yyyy-MM-dd'),
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const TABLE_COLUMNS = [
  { key: null, label: '#' },
  { key: 'RefNumber', label: 'Voucher #' },
  { key: 'createdBy', label: 'Created By' },
  { key: 'page', label: 'Page' },
  { key: 'type', label: 'Type' },
  { key: 'createdAt', label: 'Date' },
];

const SORT_CONFIG_DEFAULT = { key: 'createdAt', direction: 'desc' };

// ─── Utility Functions ──────────────────────────────────────────────────────
const typeChipColor = (type = '') => {
  const normalizedType = type.toLowerCase();
  if (['create', 'add'].some(t => normalizedType.includes(t))) {
    return { background: '#EAF3DE', color: '#3B6D11' };
  }
  if (['update', 'edit'].some(t => normalizedType.includes(t))) {
    return { background: '#E6F1FB', color: '#185FA5' };
  }
  if (['delete', 'remove'].some(t => normalizedType.includes(t))) {
    return { background: '#FCEBEB', color: '#A32D2D' };
  }
  return { background: '#f3f4f6', color: '#4b5563' };
};

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
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

const useLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLogs = useCallback(async (startDate, endDate) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getDataFundtion(
        `/LogReport?startDate=${startDate}&endDate=${endDate}`, 
        {}
      );
      
      const data = response?.data || [];
      setLogs(data);
      toast.success(`Loaded ${data.length} log records`);
      return data;
    } catch (error) {
      console.error('Error fetching logs:', error);
      setError(error);
      toast.error('Failed to load logs. Please try again.');
      setLogs([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { logs, loading, error, fetchLogs };
};

// ─── Components ─────────────────────────────────────────────────────────────
const SortIcon = ({ column, sortConfig }) => {
  const isActive = sortConfig.key === column;
  const opacity = isActive ? 1 : 0.3;
  const symbol = isActive ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕';
  
  return (
    <span style={{ fontSize: 11, opacity, marginLeft: 4 }}>
      {symbol}
    </span>
  );
};

const EmptyState = ({ message }) => (
  <div style={styles.emptyState}>
    <svg 
      width="48" 
      height="48" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      style={{ margin: '0 auto 1rem', opacity: 0.4 }}
    >
      <path 
        d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
    <p style={{ fontSize: 14, color: '#9ca3af' }}>{message}</p>
  </div>
);

const LoadingState = () => (
  <div style={styles.loadingState}>
    <div style={styles.spinner} />
    <p style={{ fontSize: 14, color: '#6b7280' }}>Loading logs...</p>
  </div>
);

// ─── Main Component ─────────────────────────────────────────────────────────
const LogReport = () => {
  // State
  const [startDate, setStartDate] = useState(DEFAULT_DATE_RANGE.start);
  const [endDate, setEndDate] = useState(DEFAULT_DATE_RANGE.end);
  const [searchText, setSearchText] = useState('');
  const [selectedCreatedBy, setSelectedCreatedBy] = useState([]);
  const [sortConfig, setSortConfig] = useState(SORT_CONFIG_DEFAULT);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [quickSelect, setQuickSelect] = useState('Custom');
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('')
    const [selectedMonth, setSelectedMonth] = useState('');

  const quickSelectOptions = [
      { label: "Custom", value: "Custom" },
      { label: "Year to Date", value: "YearToDate" },
      { label: "Month to Date", value: "MonthToDate" }
  ];

    const currentYear = new Date().getFullYear();

    const monthOptions = [
        { label: "January", value: "01" },
        { label: "February", value: "02" },
        { label: "March", value: "03" },
        { label: "April", value: "04" },
        { label: "May", value: "05" },
        { label: "June", value: "06" },
        { label: "July", value: "07" },
        { label: "August", value: "08" },
        { label: "September", value: "09" },
        { label: "October", value: "10" },
        { label: "November", value: "11" },
        { label: "December", value: "12" }
    ];

  const handleQuickSelect = (value) => {
      setQuickSelect(value)
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      if (value === "MonthToDate") {
            const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
            setSelectedMonth(currentMonth);
            const firstDay = `${currentYear}-${currentMonth}-01`;
            setStartDate(firstDay);
            setEndDate(todayStr)
      } else if (value === "YearToDate") {
          const [start, end] = years.at(-1).label.split(" to ");
          setSelectedYear(years.at(-1).value)
          setStartDate(start)
          setEndDate(end)
      }
  }

  const handleYearChange = (year) => {
      setSelectedYear(year.value)
      const [start, end] = year.label.split(" to ");
      if (quickSelect === "YearToDate") {
          setStartDate(start)
          setEndDate(end)
      }
  }

    const handleMonthChange = (month) => {
        setSelectedMonth(month.value);
        const firstDay = `${currentYear}-${month.value}-01`;
        const lastDayDate = new Date(currentYear, parseInt(month.value), 0);
        const lastDay = `${currentYear}-${month.value}-${String(lastDayDate.getDate()).padStart(2, '0')}`;
        setStartDate(firstDay);
        setEndDate(lastDay);
    }

  // Custom hooks
  const { usersMap, userOptions, getUserName } = useUsers();
  const { logs, loading, error, fetchLogs } = useLogs();

  // Initial data fetch
  useEffect(() => {
    if (isFirstLoad) {
      handleLoadLogs();
      setIsFirstLoad(false);
    }
  }, [isFirstLoad]);

  useEffect(() => {
    const fetchYears = async () => {
      const yearRes = await getDataFundtion("/Openinginventory/getAllYear")
      const yearList = yearRes.map((item) => ({
          label: `${item.DateStart} to ${item.DateEnd}`,
          value: item.DateStart.split('-')[0]
      }));
      setYears(yearList)
    };
    fetchYears();
  }, []);

  // ─── Handlers ──────────────────────────────────────────────────────────
  const handleLoadLogs = useCallback(async () => {
    await fetchLogs(startDate, endDate);
  }, [fetchLogs, startDate, endDate]);

  const handleReset = useCallback(() => {
    setStartDate(DEFAULT_DATE_RANGE.start);
    setEndDate(DEFAULT_DATE_RANGE.end);
    setSearchText('');
    setSelectedCreatedBy([]);
    setSortConfig(SORT_CONFIG_DEFAULT);
    setPageSize(PAGE_SIZE_OPTIONS[0]);
    toast.info('Filters have been reset');
  }, []);

  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  // ─── Data Processing ──────────────────────────────────────────────────
  const combinedUserOptions = useMemo(() => {
    const logUsers = Array.from(
      new Set(logs?.map(log => log.createdBy).filter(Boolean))
    ).map(name => ({ label: name, value: name }));
    
    const combined = [...userOptions];
    logUsers.forEach(logUser => {
      if (!combined.some(option => option.value === logUser.value)) {
        combined.push(logUser);
      }
    });
    
    return combined;
  }, [logs, userOptions]);

  const loadCreatedByOptions = useCallback((inputValue, callback) => {
    const filtered = inputValue
      ? combinedUserOptions.filter(option =>
          option.label.toLowerCase().includes(inputValue.toLowerCase())
        )
      : combinedUserOptions;
    
    callback(filtered.slice(0, 50));
  }, [combinedUserOptions]);

  const filteredAndSortedLogs = useMemo(() => {
    let result = [...logs];

    // Filter by selected users
    if (selectedCreatedBy.length > 0) {
      const selectedNames = selectedCreatedBy.map(option => option.value);
      result = result.filter(log => selectedNames.includes(log.createdBy));
    }

    // Search filter
    if (searchText.trim()) {
      const query = searchText.toLowerCase();
      result = result.filter(log =>
        (log.RefNumber || '').toLowerCase().includes(query) ||
        (log.userId || '').toLowerCase().includes(query) ||
        (log.Page || '').toLowerCase().includes(query) ||
        (log.changes?.payload || '').toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      const { key, direction } = sortConfig;
      
      let aValue = key === 'TotalDebit'  ? (a.changes?.TotalDebit || 0)
                 : key === 'TotalCredit' ? (a.changes?.TotalCredit || 0)
                 : (a[key] || '');
                 
      let bValue = key === 'TotalDebit'  ? (b.changes?.TotalDebit || 0)
                 : key === 'TotalCredit' ? (b.changes?.TotalCredit || 0)
                 : (b[key] || '');

      // Case-insensitive string comparison
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [logs, selectedCreatedBy, searchText, sortConfig]);

  const paginatedLogs = useMemo(() => 
    filteredAndSortedLogs.slice(0, pageSize),
    [filteredAndSortedLogs, pageSize]
  );

  // ─── Popup Handler ────────────────────────────────────────────────────
  const openPopupTab = useCallback(() => {
    const popup = window.open('', 'LogReport', 'width=1280,height=860,left=80,top=40');
    
    if (!popup) {
      toast.error('Popup blocked. Please allow popups for this site.');
      return;
    }

    // Write HTML structure to popup
    popup.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Log Report</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link 
            href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" 
            rel="stylesheet" 
          />
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; 
              background: #f8fafc; 
            }
          </style>
        </head>
        <body>
          <div id="popup-root"></div>
        </body>
      </html>
    `);
    popup.document.close();

    const filterData = { startDate, endDate, selectedCreatedBy };

    // Mount React component in popup
    const mountInterval = setInterval(() => {
      const mountNode = popup.document.getElementById('popup-root');
      if (mountNode) {
        clearInterval(mountInterval);
        const root = ReactDOM.createRoot(mountNode);
        root.render(<LogReportPopup filterData={filterData} />);
      }
    }, 100);
  }, [startDate, endDate, selectedCreatedBy]);

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <ReportPageLayout
      title="Activity Log Report"
      subtitle="Filter and preview system logs, then open the full report"
    >
    <div style={styles.page}>
      <div style={styles.headerBadge}>
        <span style={styles.badgeDot} />
        {loading ? 'Fetching...' : `${logs.length} total records`}
      </div>

      {/* Filters Card */}
      <div style={styles.card}>
        <div style={styles.cardLabel}>Filters</div>
        
        <div style={styles.filterGrid}>
          {/* Quick Select */}
          <div style={styles.fieldWrap}>
            <label style={styles.label}>Quick Select</label>
            <AppSelect
                options={quickSelectOptions}
                value={quickSelectOptions.find(opt => opt.value === quickSelect)}
                onChange={(e) => handleQuickSelect(e.value)}
                className="basic-single"
                classNamePrefix="pd-select"
                isSearchable
                placeholder="Select..."
            />
          </div>

          {quickSelect === "YearToDate" && (
            <div style={styles.fieldWrap}>
              <label style={styles.label}>Select Year</label>
              <AppSelect
                  options={years}
                  value={years.find(y => y.value === selectedYear)}
                  onChange={(e) => handleYearChange(e)}
                  className="basic-single"
                  classNamePrefix="pd-select"
                  isSearchable
                  placeholder="Select Year..."
              />
            </div>
          )}
                    {quickSelect === "MonthToDate" && (
                        <div>
                            <label className="block text-sm font-medium">Select Month</label>
                            <AppSelect
                                options={monthOptions}
                                value={monthOptions.find(m => m.value === selectedMonth)}
                                onChange={(e) => handleMonthChange(e)}
                                className="basic-single"
                                classNamePrefix="pd-select"
                                isSearchable
                                placeholder="Select Month..."
                            />
                        </div>
                    )}

          {/* Start Date */}
          <div style={styles.fieldWrap}>
            <label style={styles.label}>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              
              style={{ ...styles.input, ...(quickSelect !== "Custom" ? { background: '#f3f4f6', cursor: 'not-allowed' } : {}) }}
            />
          </div>

          {/* End Date */}
          <div style={styles.fieldWrap}>
            <label style={styles.label}>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              
              style={{ ...styles.input, ...(quickSelect !== "Custom" ? { background: '#f3f4f6', cursor: 'not-allowed' } : {}) }}
            />
          </div>

          {/* Created By */}
          <div style={styles.fieldWrap}>
            <label style={styles.label}>Created By</label>
            <AsyncSelect
              isMulti
              defaultOptions={combinedUserOptions}
              loadOptions={loadCreatedByOptions}
              value={selectedCreatedBy}
              onChange={setSelectedCreatedBy}
              placeholder="All users..."
              noOptionsMessage={() => "No users found"}
              loadingMessage={() => "Loading users..."}
              styles={selectStyles}
              isClearable
            />
          </div>

          {/* Search */}
          <div style={styles.fieldWrap}>
            <label style={styles.label}>Search</label>
            <div style={styles.searchContainer}>
              <svg 
                style={styles.searchIcon} 
                width="14" 
                height="14" 
                viewBox="0 0 14 14" 
                fill="none"
              >
                <path 
                  d="M6.333 11.333A5 5 0 106.333 1.333a5 5 0 000 10zM12.667 12.667l-2.534-2.534" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
              <input
                type="text"
                placeholder="Voucher #, user, type..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={styles.searchInput}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.btnRow}>
          <button
            onClick={handleLoadLogs}
            disabled={loading}
            style={{
              ...styles.btn,
              ...styles.btnPrimary,
              ...(loading ? styles.btnDisabled : {}),
            }}
          >
            {loading ? 'Loading...' : 'Load Logs'}
          </button>

          <button
            onClick={openPopupTab}
            disabled={loading || filteredAndSortedLogs.length === 0}
            style={{
              ...styles.btn,
              ...styles.btnSuccess,
              ...(loading || filteredAndSortedLogs.length === 0 ? styles.btnDisabled : {}),
            }}
          >
            Open Full Report ↗
          </button>

          <button 
            onClick={handleReset} 
            style={{ ...styles.btn, ...styles.btnGray }}
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Preview Table */}
      <div style={styles.card}>
        <div style={styles.previewHeader}>
          <div style={styles.cardLabel}>Preview</div>
          <div style={styles.previewMeta}>
            <span style={{ fontWeight: 600, color: '#374151' }}>
              {filteredAndSortedLogs.length}
            </span>
            {' '}record{filteredAndSortedLogs.length !== 1 ? 's' : ''}
            {filteredAndSortedLogs.length > pageSize && (
              <span style={styles.previewMore}>
                {' · '}showing first {pageSize}
              </span>
            )}
          </div>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            style={styles.pageSizeSelect}
          >
            {PAGE_SIZE_OPTIONS.map(size => (
              <option key={size} value={size}>Show {size}</option>
            ))}
          </select>
        </div>

        <div style={styles.tableOuter}>
          {loading ? (
            <LoadingState />
          ) : paginatedLogs.length === 0 ? (
            <EmptyState message="No records found. Adjust filters and click Load Logs." />
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  {TABLE_COLUMNS.map(({ key, label }) => (
                    <th
                      key={label}
                      style={{
                        ...styles.th,
                        ...(key ? { cursor: 'pointer' } : {}),
                      }}
                      onClick={() => key && handleSort(key)}
                    >
                      {label}
                      {key && <SortIcon column={key} sortConfig={sortConfig} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.map((row, index) => (
                  <tr 
                    key={row._id || index} 
                    style={index % 2 === 0 ? styles.trEven : styles.trOdd}
                  >
                    <td style={styles.tdMuted}>{index + 1}</td>
                    <td style={styles.td}>
                      <code style={styles.voucherChip}>
                        {row.RefNumber || '—'}
                      </code>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.userCell}>
                        <div style={styles.userAvatar}>
                          {(getUserName(row.userId) || '?').slice(0, 2).toUpperCase()}
                        </div>
                        {getUserName(row.userId)}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{ 
                        ...styles.typeChip, 
                        ...typeChipColor(row.type) 
                      }}>
                        {row?.Page || '—'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ 
                        ...styles.typeChip, 
                        ...typeChipColor(row.type) 
                      }}>
                        {row?.action || '—'}
                      </span>
                    </td>
                    <td style={styles.tdMuted}>
                      {formatDate(row.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {filteredAndSortedLogs.length > pageSize && (
          <div style={styles.showAllHint}>
            Showing {pageSize} of {filteredAndSortedLogs.length} — 
            open the full report to see all records
          </div>
        )}
      </div>
    </div>
    </ReportPageLayout>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = {
  page: {
    padding: '2rem 1.5rem',
    background: '#f8fafc',
    minHeight: '100vh',
    fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
  },
  pageHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    gap: 12,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#111827',
    letterSpacing: '-0.4px',
    margin: 0,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  headerBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    color: '#374151',
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 20,
    padding: '6px 16px',
    fontWeight: 500,
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#639922',
    display: 'inline-block',
  },
  
  // Cards
  card: {
    background: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    padding: '1.5rem',
    marginBottom: '1.25rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.7px',
    marginBottom: '1rem',
  },
  
  // Filters
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  fieldWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    padding: '8px 12px',
    border: '1.5px solid #d1d5db',
    borderRadius: 8,
    fontSize: 13,
    outline: 'none',
    color: '#111827',
    background: '#fff',
    transition: 'border-color 0.2s ease',
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
    padding: '8px 12px 8px 36px',
    border: '1.5px solid #d1d5db',
    borderRadius: 8,
    fontSize: 13,
    outline: 'none',
    color: '#111827',
    background: '#fff',
    width: '100%',
    transition: 'border-color 0.2s ease',
  },
  
  // Buttons
  btnRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  btn: {
    padding: '9px 24px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s ease',
    letterSpacing: '0.2px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  },
  btnPrimary: {
    background: '#185FA5',
    color: '#fff',
  },
  btnSuccess: {
    background: '#3B6D11',
    color: '#fff',
  },
  btnGray: {
    background: '#f3f4f6',
    color: '#374151',
    border: '1.5px solid #d1d5db',
  },
  btnDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
  },
  
  // Table Header
  previewHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: '1rem',
    flexWrap: 'wrap',
  },
  previewMeta: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
  },
  previewMore: {
    color: '#9ca3af',
  },
  pageSizeSelect: {
    marginLeft: 'auto',
    padding: '6px 12px',
    border: '1.5px solid #e5e7eb',
    borderRadius: 8,
    fontSize: 13,
    color: '#374151',
    background: '#fff',
    cursor: 'pointer',
    outline: 'none',
  },
  
  // Table
  tableOuter: {
    overflowX: 'auto',
    borderRadius: 8,
    border: '1px solid #f3f4f6',
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
    background: '#f9fafb',
    borderBottom: '2px solid #e5e7eb',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  },
  td: {
    padding: '12px 16px',
    color: '#111827',
    verticalAlign: 'middle',
    borderBottom: '1px solid #f3f4f6',
  },
  tdMuted: {
    padding: '12px 16px',
    color: '#9ca3af',
    fontSize: 12,
    verticalAlign: 'middle',
    borderBottom: '1px solid #f3f4f6',
    whiteSpace: 'nowrap',
  },
  trEven: {},
  trOdd: {
    background: '#fafafa',
  },
  
  // Table Elements
  voucherChip: {
    fontFamily: "'SF Mono', 'Courier New', monospace",
    fontSize: 12,
    color: '#4b5563',
    background: '#f3f4f6',
    padding: '3px 10px',
    borderRadius: 6,
    border: '1px solid #e5e7eb',
    fontWeight: 500,
  },
  typeChip: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
  },
  userCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 700,
    backgroundColor: '#E6F1FB',
    color: '#185FA5',
    flexShrink: 0,
    border: '2px solid #DBEAFE',
  },
  
  // States
  loadingState: {
    textAlign: 'center',
    padding: '3rem 2rem',
  },
  spinner: {
    width: 36,
    height: 36,
    border: '3px solid #e5e7eb',
    borderTopColor: '#185FA5',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto 1rem',
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem 2rem',
  },
  showAllHint: {
    textAlign: 'center',
    fontSize: 13,
    color: '#9ca3af',
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid #f3f4f6',
  },
};

// ─── AsyncSelect Styles ──────────────────────────────────────────────────────
const selectStyles = {
  control: (base, state) => ({
    ...base,
    borderColor: state.isFocused ? '#185FA5' : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(24, 95, 165, 0.1)' : 'none',
    borderRadius: 8,
    minHeight: 40,
    fontSize: 13,
    '&:hover': {
      borderColor: '#185FA5',
    },
  }),
  multiValue: (base) => ({
    ...base,
    background: '#E6F1FB',
    borderRadius: 6,
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: '#185FA5',
    fontSize: 12,
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: '#185FA5',
    cursor: 'pointer',
    ':hover': {
      background: '#B5D4F4',
      color: '#0C447C',
    },
  }),
  menu: (base) => ({
    ...base,
    borderRadius: 8,
    fontSize: 13,
    zIndex: 100,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
  }),
  placeholder: (base) => ({
    ...base,
    color: '#9ca3af',
    fontSize: 13,
  }),
  noOptionsMessage: (base) => ({
    ...base,
    fontSize: 13,
    color: '#6b7280',
  }),
};

export default LogReport;