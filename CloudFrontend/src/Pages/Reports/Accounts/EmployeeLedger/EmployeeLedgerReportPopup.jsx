import React, { useEffect, useMemo, useState } from 'react';
import { getDataFundtion } from '../../../../Api/CRUDFunctions';
import ReportPopupHeader from '../../../../Components/Global/ReportPopupHeader.jsx';
import { exportProfessionalExcel } from '../../../../utils/exportProfessionalExcel';

const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatMoney = (amount) => {
  const value = Number(amount);
  if (!Number.isFinite(value) || value === 0) return "-";
  const formatted = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return value < 0 ? `(${formatted})` : formatted;
};

const TYPE_COLORS = {
  EBF: { bg: "#ecfdf5", border: "#10b981", text: "#047857" },
  Loan: { bg: "#eff6ff", border: "#3b82f6", text: "#1d4ed8" },
  BadDebt: { bg: "#fff7ed", border: "#f97316", text: "#c2410c" },
};

const EmployeeLedgerReportPopup = ({ data }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [sections, setSections] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [activeType, setActiveType] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const now = new Date();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          type: data.type || "All",
          startDate: data.startDate,
          endDate: data.endDate,
        });
        if (data.employeeId) params.set("employeeId", data.employeeId);

        const res = await getDataFundtion(`/GernalLager/EmployeeLedgerReport?${params.toString()}`);
        const nextSections = res?.sections || [];
        setSections(nextSections);
        setSummary(res?.summary || null);
        if (data.type && data.type !== "All") setActiveType(data.type);
      } catch (err) {
        console.error(err);
        setError("Failed to load employee ledger report");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [data]);

  const visibleSections = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return (sections || [])
      .filter((section) => activeType === "All" || section.type === activeType)
      .map((section) => ({
        ...section,
        ledgers: (section.ledgers || []).filter((ledger) => {
          if (!term) return true;
          const hay = `${ledger.employeeName || ""} ${ledger.accountCode || ""} ${ledger.empId || ""}`.toLowerCase();
          return hay.includes(term);
        }),
      }))
      .filter((section) => (section.ledgers || []).length > 0 || !term);
  }, [sections, activeType, searchTerm]);

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const rows = [];
      visibleSections.forEach((section) => {
        (section.ledgers || []).forEach((ledger) => {
          rows.push({
            Type: section.label || section.type,
            Employee: ledger.employeeName || "",
            Code: ledger.accountCode || "",
            Date: "OPENING",
            Voucher: "",
            Narration: "Opening Balance",
            Ref: "",
            Debit: Number(ledger.openingDebit) || 0,
            Credit: Number(ledger.openingCredit) || 0,
            Balance: Number(ledger.openingBalance) || 0,
          });
          (ledger.transactions || []).forEach((row) => {
            rows.push({
              Type: section.label || section.type,
              Employee: ledger.employeeName || "",
              Code: ledger.accountCode || "",
              Date: row.date || "",
              Voucher: row.voucherNumber || "",
              Narration: row.narration || "",
              Ref: row.ref || row.slip || "",
              Debit: Number(row.debit) || 0,
              Credit: Number(row.credit) || 0,
              Balance: Number(row.balance) || 0,
            });
          });
          rows.push({
            Type: section.label || section.type,
            Employee: ledger.employeeName || "",
            Code: ledger.accountCode || "",
            Date: "",
            Voucher: "",
            Narration: "CLOSING",
            Ref: "",
            Debit: Number(ledger.totalDebit) || 0,
            Credit: Number(ledger.totalCredit) || 0,
            Balance: Number(ledger.closingBalance) || 0,
          });
        });
      });

      await exportProfessionalExcel({
        title: "Employee Ledger Report",
        fileName: "Employee_Ledger_Report",
        sheetName: "Employee Ledger",
        rows,
        meta: [
          `Period: ${formatDate(data.startDate)} to ${formatDate(data.endDate)}`,
          `Type: ${data.type || "All"}`,
          `Employee: ${data.employeeLabel || "All"}`,
        ],
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loader}>
          <div style={styles.spinner} />
          <p>Loading employee ledger...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorBox}>{error}</div>
      </div>
    );
  }

  const typeTabs = [
    { label: "All", value: "All" },
    ...sections.map((s) => ({ label: s.label || s.type, value: s.type })),
  ];

  return (
    <div style={styles.container}>
      <ReportPopupHeader title="Employee Ledger Report" />

      <div style={styles.toolbar}>
        <div style={styles.tabs}>
          {typeTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveType(tab.value)}
              style={{
                ...styles.tab,
                ...(activeType === tab.value ? styles.tabActive : {}),
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div style={styles.toolbarRight}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search employee..."
            style={styles.searchInput}
          />
          <button type="button" onClick={() => window.print()} style={styles.secondaryBtn}>
            Print
          </button>
          <button
            type="button"
            onClick={exportToExcel}
            disabled={isExporting}
            style={styles.primaryBtn}
          >
            {isExporting ? "Exporting..." : "Export Excel"}
          </button>
        </div>
      </div>

      <div id="ledger-content" style={styles.ledgerContent}>
        <div style={styles.ledgerHeader}>
          <div style={styles.headerTop}>
            <div>
              <span style={styles.dateTime}>
                Date & Time: {formatDate(now)} {now.toLocaleTimeString()}
              </span>
              <h2 style={styles.companyName}>PDL</h2>
              <div style={styles.printedBy}>Printed By: {data.PrintedBy || "-"}</div>
            </div>
            <div style={styles.logoPlaceholder}>
              <img
                style={styles.logo}
                src="https://res.cloudinary.com/dmi26itgk/image/upload/v1746526783/ocfvq7hxb3lqrobtlrkp.png"
                alt="logo"
              />
            </div>
          </div>

          <h3 style={styles.ledgerTitle}>
            EMPLOYEE LEDGER — FROM {formatDate(data.startDate)} TO {formatDate(data.endDate)}
          </h3>

          <div style={styles.accountInfo}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>TYPE:</span>
              <span style={styles.infoValue}>{data.type || "All"}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>EMPLOYEE:</span>
              <span style={styles.infoValue}>{data.employeeLabel || "All Employees"}</span>
            </div>
          </div>
        </div>

        {summary ? (
          <div style={styles.summaryGrid}>
            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Employees</div>
              <div style={styles.summaryValue}>{summary.employees || 0}</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Opening</div>
              <div style={styles.summaryValue}>{formatMoney(summary.totalOpening)}</div>
            </div>
            <div style={{ ...styles.summaryCard, borderColor: "#10b981" }}>
              <div style={styles.summaryLabel}>Debit</div>
              <div style={{ ...styles.summaryValue, color: "#047857" }}>{formatMoney(summary.totalDebit)}</div>
            </div>
            <div style={{ ...styles.summaryCard, borderColor: "#ef4444" }}>
              <div style={styles.summaryLabel}>Credit</div>
              <div style={{ ...styles.summaryValue, color: "#b91c1c" }}>{formatMoney(summary.totalCredit)}</div>
            </div>
            <div style={{ ...styles.summaryCard, borderColor: "#2563eb" }}>
              <div style={styles.summaryLabel}>Closing</div>
              <div style={{ ...styles.summaryValue, color: "#1d4ed8" }}>{formatMoney(summary.totalClosing)}</div>
            </div>
          </div>
        ) : null}

        {visibleSections.length === 0 ? (
          <div style={styles.emptyState}>No ledger data found for selected filters.</div>
        ) : (
          visibleSections.map((section) => {
            const tone = TYPE_COLORS[section.type] || TYPE_COLORS.EBF;
            return (
              <div key={section.type} style={styles.sectionBlock}>
                <div
                  style={{
                    ...styles.sectionBadge,
                    background: tone.bg,
                    borderColor: tone.border,
                    color: tone.text,
                  }}
                >
                  {section.label || section.type}
                  <span style={styles.sectionCount}>{(section.ledgers || []).length} employees</span>
                </div>

                {(section.ledgers || []).map((ledger) => (
                  <div key={`${section.type}-${ledger.accountId}`} style={styles.employeeCard}>
                    <div style={styles.employeeHead}>
                      <div>
                        <div style={styles.employeeName}>{ledger.employeeName || "Employee"}</div>
                        <div style={styles.employeeMeta}>
                          {ledger.accountCode ? `Code: ${ledger.accountCode}` : "No code"}
                          {ledger.empId ? `  |  Emp ID: ${ledger.empId}` : ""}
                        </div>
                      </div>
                      <div style={styles.balancePills}>
                        <div style={styles.pill}>
                          <span>Opening</span>
                          <strong>{formatMoney(ledger.openingBalance)}</strong>
                        </div>
                        <div style={{ ...styles.pill, background: "#eff6ff", borderColor: "#93c5fd" }}>
                          <span>Closing</span>
                          <strong style={{ color: "#1d4ed8" }}>{formatMoney(ledger.closingBalance)}</strong>
                        </div>
                      </div>
                    </div>

                    <div style={styles.tableWrap}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>VOUCH DATE</th>
                            <th style={styles.th}>VOUCHER NO.</th>
                            <th style={styles.th}>DESCRIPTION</th>
                            <th style={styles.th}>REF / SLIP</th>
                            <th style={{ ...styles.th, textAlign: "right" }}>DEBIT</th>
                            <th style={{ ...styles.th, textAlign: "right" }}>CREDIT</th>
                            <th style={{ ...styles.th, textAlign: "right" }}>BALANCE</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ background: "#f8fafc" }}>
                            <td style={styles.td} colSpan={4}>
                              <strong>Opening Balance</strong>
                            </td>
                            <td style={{ ...styles.td, ...styles.amount }}>{formatMoney(ledger.openingDebit)}</td>
                            <td style={{ ...styles.td, ...styles.amount }}>{formatMoney(ledger.openingCredit)}</td>
                            <td style={{ ...styles.td, ...styles.amount, ...styles.balance }}>
                              {formatMoney(ledger.openingBalance)}
                            </td>
                          </tr>

                          {(ledger.transactions || []).length === 0 ? (
                            <tr>
                              <td style={{ ...styles.td, color: "#94a3b8" }} colSpan={7}>
                                No transactions in this period
                              </td>
                            </tr>
                          ) : (
                            (ledger.transactions || []).map((row, idx) => (
                              <tr
                                key={`${ledger.accountId}-${idx}`}
                                style={{ background: idx % 2 === 0 ? "#ffffff" : "#f9fafc" }}
                              >
                                <td style={styles.td}>{formatDate(row.date)}</td>
                                <td style={{ ...styles.td, ...styles.voucher }}>{row.voucherNumber || "-"}</td>
                                <td style={{ ...styles.td, ...styles.desc }}>{row.narration || "-"}</td>
                                <td style={styles.td}>{row.ref || row.slip || "-"}</td>
                                <td style={{ ...styles.td, ...styles.amount, color: "#047857" }}>
                                  {formatMoney(row.debit)}
                                </td>
                                <td style={{ ...styles.td, ...styles.amount, color: "#b91c1c" }}>
                                  {formatMoney(row.credit)}
                                </td>
                                <td style={{ ...styles.td, ...styles.amount, ...styles.balance }}>
                                  {formatMoney(row.balance)}
                                </td>
                              </tr>
                            ))
                          )}

                          <tr style={styles.totalRow}>
                            <td style={styles.td} colSpan={4}>
                              <strong>TOTAL / CLOSING</strong>
                            </td>
                            <td style={{ ...styles.td, ...styles.amount }}>
                              <strong>{formatMoney(ledger.totalDebit)}</strong>
                            </td>
                            <td style={{ ...styles.td, ...styles.amount }}>
                              <strong>{formatMoney(ledger.totalCredit)}</strong>
                            </td>
                            <td style={{ ...styles.td, ...styles.amount, ...styles.balance }}>
                              <strong>{formatMoney(ledger.closingBalance)}</strong>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            );
          })
        )}

        <div style={styles.footer}>
          <div style={styles.footerItem}>
            <div>Prepared By</div>
            <div style={styles.signature} />
          </div>
          <div style={styles.footerItem}>
            <div>Checked By</div>
            <div style={styles.signature} />
          </div>
          <div style={styles.footerItem}>
            <div>Approved By</div>
            <div style={styles.signature} />
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          button, input { display: none !important; }
          #ledger-content { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    maxWidth: "1200px",
    margin: "16px auto",
    boxShadow: "0 5px 25px rgba(0,0,0,0.12)",
    borderRadius: "12px",
    overflow: "hidden",
    background: "#fff",
  },
  loader: {
    minHeight: "280px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    color: "#475569",
  },
  spinner: {
    width: "42px",
    height: "42px",
    border: "4px solid #e2e8f0",
    borderTopColor: "#2563eb",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  errorBox: {
    margin: "40px",
    padding: "20px",
    background: "#fef2f2",
    color: "#b91c1c",
    borderRadius: "8px",
    textAlign: "center",
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
    padding: "12px 18px",
    background: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
  },
  tabs: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  tab: {
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#334155",
    borderRadius: "999px",
    padding: "6px 14px",
    cursor: "pointer",
    fontSize: "13px",
  },
  tabActive: {
    background: "#1e293b",
    borderColor: "#1e293b",
    color: "#fff",
  },
  toolbarRight: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  searchInput: {
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    padding: "8px 12px",
    minWidth: "180px",
    fontSize: "13px",
  },
  primaryBtn: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "8px 14px",
    cursor: "pointer",
    fontSize: "13px",
  },
  secondaryBtn: {
    background: "#fff",
    color: "#334155",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    padding: "8px 14px",
    cursor: "pointer",
    fontSize: "13px",
  },
  ledgerContent: {
    background: "#fff",
  },
  ledgerHeader: {
    background: "linear-gradient(135deg, #0f172a, #1e3a5f)",
    color: "white",
    padding: "24px 28px",
  },
  headerTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "16px",
  },
  dateTime: {
    fontSize: "13px",
    opacity: 0.9,
    display: "block",
    marginBottom: "4px",
  },
  companyName: {
    margin: 0,
    fontSize: "28px",
    fontWeight: 700,
    letterSpacing: "0.5px",
  },
  printedBy: {
    marginTop: "6px",
    fontSize: "13px",
    opacity: 0.9,
  },
  logoPlaceholder: {
    width: "78px",
    height: "78px",
    background: "rgba(255,255,255,0.18)",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    height: "58px",
    background: "white",
    borderRadius: "6px",
    padding: "4px",
  },
  ledgerTitle: {
    margin: "0 0 18px 0",
    fontSize: "18px",
    fontWeight: 600,
    textAlign: "center",
    background: "rgba(255,255,255,0.12)",
    padding: "10px",
    borderRadius: "8px",
  },
  accountInfo: {
    display: "flex",
    flexWrap: "wrap",
    gap: "22px",
    paddingTop: "12px",
    borderTop: "1px solid rgba(255,255,255,0.2)",
  },
  infoItem: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  infoLabel: {
    fontWeight: 700,
    opacity: 0.9,
    fontSize: "13px",
  },
  infoValue: {
    fontWeight: 500,
    fontSize: "14px",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "12px",
    padding: "16px 20px",
    background: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
  },
  summaryCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderLeft: "4px solid #64748b",
    borderRadius: "10px",
    padding: "12px 14px",
  },
  summaryLabel: {
    fontSize: "12px",
    color: "#64748b",
    marginBottom: "4px",
  },
  summaryValue: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#0f172a",
    fontFamily: "'Courier New', monospace",
  },
  emptyState: {
    padding: "40px 20px",
    textAlign: "center",
    color: "#94a3b8",
  },
  sectionBlock: {
    padding: "18px 20px 8px",
  },
  sectionBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
    border: "1px solid",
    borderRadius: "999px",
    padding: "6px 14px",
    fontWeight: 700,
    marginBottom: "14px",
    fontSize: "13px",
  },
  sectionCount: {
    fontWeight: 500,
    opacity: 0.8,
    fontSize: "12px",
  },
  employeeCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    overflow: "hidden",
    marginBottom: "18px",
    background: "#fff",
    boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
  },
  employeeHead: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
    padding: "14px 16px",
    background: "linear-gradient(90deg, #f8fafc, #ffffff)",
    borderBottom: "1px solid #e2e8f0",
  },
  employeeName: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#0f172a",
  },
  employeeMeta: {
    marginTop: "4px",
    fontSize: "12px",
    color: "#64748b",
  },
  balancePills: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  pill: {
    minWidth: "110px",
    background: "#f1f5f9",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    padding: "8px 10px",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    fontSize: "11px",
    color: "#475569",
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "900px",
  },
  th: {
    background: "#1e293b",
    color: "#fff",
    textAlign: "left",
    padding: "11px 12px",
    fontSize: "12px",
    fontWeight: 600,
    letterSpacing: "0.3px",
    borderRight: "1px solid rgba(255,255,255,0.08)",
  },
  td: {
    padding: "10px 12px",
    fontSize: "13px",
    borderBottom: "1px solid #eef2f7",
    color: "#334155",
    verticalAlign: "top",
  },
  amount: {
    textAlign: "right",
    fontFamily: "'Courier New', monospace",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  balance: {
    color: "#0f172a",
  },
  voucher: {
    color: "#1d4ed8",
    fontWeight: 600,
  },
  desc: {
    maxWidth: "280px",
  },
  totalRow: {
    background: "#f1f5f9",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    flexWrap: "wrap",
    padding: "28px 24px",
    background: "#f8fafc",
    borderTop: "1px solid #e2e8f0",
  },
  footerItem: {
    minWidth: "140px",
    textAlign: "center",
    color: "#475569",
    fontSize: "13px",
  },
  signature: {
    marginTop: "28px",
    borderBottom: "1px solid #94a3b8",
    height: "1px",
  },
};

export default EmployeeLedgerReportPopup;
