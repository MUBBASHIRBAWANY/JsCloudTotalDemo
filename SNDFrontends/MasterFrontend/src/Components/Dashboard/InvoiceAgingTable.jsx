import React, { useState, useMemo } from 'react';

const ChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const InvoiceAgingTable = ({ data, loading, error, distributorName }) => {
  const [expandedRow, setExpandedRow] = useState(null);
  const [sortBy, setSortBy] = useState('remainingDesc');
  const [searchTerm, setSearchTerm] = useState('');

  // Process aging buckets
  const agingData = useMemo(() => {
    if (!data?.alldata) return [];

    const now = new Date();
    const buckets = {
      '0-30 Days': { min: 0, max: 30, invoices: [], total: 0 },
      '31-60 Days': { min: 31, max: 60, invoices: [], total: 0 },
      '61-90 Days': { min: 61, max: 90, invoices: [], total: 0 },
      '90+ Days': { min: 91, max: Infinity, invoices: [], total: 0 },
    };

    data.alldata.forEach(inv => {
      const invDate = new Date(inv.SalesInvoiceDate);
      const diffDays = Math.floor((now - invDate) / (1000 * 60 * 60 * 24));
      const remaining = Number(inv.Remaining || 0);
      const total = Number(inv.Totalamount || 0);

      for (const [label, bucket] of Object.entries(buckets)) {
        if (diffDays >= bucket.min && diffDays <= bucket.max) {
          bucket.invoices.push({
            ...inv,
            diffDays,
            remaining,
            total,
            collectionRate: total > 0 ? ((total - remaining) / total * 100).toFixed(1) : 0,
          });
          bucket.total += remaining;
          break;
        }
      }
    });

    // Filter by search
    let result = Object.entries(buckets).map(([label, bucket]) => ({
      label,
      total: bucket.total,
      count: bucket.invoices.length,
      invoices: bucket.invoices,
    }));

    if (searchTerm) {
      result = result.map(b => ({
        ...b,
        invoices: b.invoices.filter(inv =>
          inv.DisSalesInvoice?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inv.Client?.toLowerCase().includes(searchTerm.toLowerCase())
        ),
        count: b.invoices.length,
        total: b.invoices.reduce((s, i) => s + i.remaining, 0),
      }));
    }

    // Sort
    if (sortBy === 'totalDesc') {
      result.sort((a, b) => b.total - a.total);
    } else if (sortBy === 'totalAsc') {
      result.sort((a, b) => a.total - b.total);
    } else if (sortBy === 'countDesc') {
      result.sort((a, b) => b.count - a.count);
    } else if (sortBy === 'remainingDesc') {
      result.sort((a, b) => b.total - a.total);
    }

    return result;
  }, [data, sortBy, searchTerm]);

  const totalReceivable = useMemo(() =>
    agingData.reduce((s, b) => s + b.total, 0),
    [agingData]
  );

  if (loading) {
    return (
      <div style={{
        background: '#f8fafc', borderRadius: '16px', padding: '24px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.04)', minHeight: '300px',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px', border: '3px solid #e2e8f0',
            borderTopColor: '#6366f1', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 12px'
          }} />
          <p style={{ color: '#64748b', fontSize: '14px' }}>Loading aging data...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: '#fef2f2', borderRadius: '16px', padding: '24px',
        border: '1px solid #fecaca', textAlign: 'center'
      }}>
        <p style={{ color: '#dc2626', fontSize: '14px' }}>{error}</p>
      </div>
    );
  }

  const getBucketColor = (label) => {
    switch (label) {
      case '0-30 Days': return { bg: '#ecfdf5', text: '#059669', dot: '#10b981' };
      case '31-60 Days': return { bg: '#fffbeb', text: '#d97706', dot: '#f59e0b' };
      case '61-90 Days': return { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444' };
      case '90+ Days': return { bg: '#fef2f2', text: '#991b1b', dot: '#dc2626' };
      default: return { bg: '#f1f5f9', text: '#64748b', dot: '#94a3b8' };
    }
  };

  return (
    <div style={{
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      background: '#f8fafc',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.04)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '20px', flexWrap: 'wrap', gap: '12px'
      }}>
        <div>
          <h2 style={{
            margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M12 8v8M8 12h8" />
            </svg>
            Invoice Aging (Receivables)
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
            {distributorName || 'All Distributors'} — Aging summary
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search invoice/client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0',
              fontSize: '12px', background: 'white', outline: 'none', width: '160px'
            }}
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0',
              fontSize: '12px', background: 'white', cursor: 'pointer'
            }}
          >
            <option value="remainingDesc">Highest Debt</option>
            <option value="totalAsc">Lowest Debt</option>
            <option value="countDesc">Most Invoices</option>
          </select>
        </div>
      </div>

      {/* Total Summary Card */}
      <div style={{
        background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
        borderRadius: '12px', padding: '16px 20px', marginBottom: '16px',
        color: 'white', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', flexWrap: 'wrap', gap: '12px'
      }}>
        <div>
          <div style={{ fontSize: '13px', opacity: 0.9 }}>Total Outstanding Receivables</div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>
            {totalReceivable.toLocaleString()}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '13px', opacity: 0.9 }}>Total Invoices</div>
          <div style={{ fontSize: '20px', fontWeight: 600 }}>
            {(data?.alldata?.length || 0)}
          </div>
        </div>
      </div>

      {/* Aging Buckets */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {agingData.map((bucket, idx) => {
          const colors = getBucketColor(bucket.label);
          const isExpanded = expandedRow === idx;
          const percentage = totalReceivable > 0 ? (bucket.total / totalReceivable * 100) : 0;

          return (
            <div key={idx} style={{
              background: 'white', borderRadius: '10px',
              border: '1px solid #f1f5f9', overflow: 'hidden',
              transition: 'all 0.2s ease'
            }}>
              {/* Bucket Header */}
              <div
                onClick={() => setExpandedRow(isExpanded ? null : idx)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', cursor: 'pointer',
                  background: isExpanded ? '#f8fafc' : 'white',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = '#f8fafc'; }}
                onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = 'white'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '10px', height: '10px', borderRadius: '50%',
                    background: colors.dot
                  }} />
                  <div>
                    <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>
                      {bucket.label}
                    </span>
                    <span style={{
                      fontSize: '11px', color: '#94a3b8', marginLeft: '8px'
                    }}>
                      {bucket.count} invoices
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontWeight: 700, color: colors.text, fontSize: '16px' }}>
                    {bucket.total.toLocaleString()}
                  </span>
                  <span style={{
                    transform: `rotate(${isExpanded ? 180 : 0}deg)`,
                    transition: 'transform 0.2s', color: '#94a3b8'
                  }}>
                    <ChevronDown />
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ height: '3px', background: '#f1f5f9' }}>
                <div style={{
                  width: `${Math.min(percentage, 100)}%`, height: '100%',
                  background: colors.dot, transition: 'width 0.5s ease'
                }} />
              </div>

              {/* Expanded Invoices */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid #f1f5f9' }}>
                  {bucket.invoices.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                      No invoices in this bucket
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Invoice</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Client</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Total</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Received</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Remaining</th>
                            <th style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Days</th>
                            <th style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Collection</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bucket.invoices.map((inv, i) => (
                            <tr key={i} style={{
                              borderBottom: '1px solid #f1f5f9',
                              transition: 'background 0.15s'
                            }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                            >
                              <td style={{ padding: '8px 12px', fontWeight: 500, color: '#6366f1' }}>
                                {inv.DisSalesInvoice || `INV-${inv.SalesInvoice}`}
                              </td>
                              <td style={{ padding: '8px 12px', color: '#334155' }}>{inv.Client || 'N/A'}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500 }}>{inv.total.toLocaleString()}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', color: '#10b981' }}>{Number(inv.Recived || 0).toLocaleString()}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', color: '#f59e0b', fontWeight: 600 }}>
                                {inv.remaining.toLocaleString()}
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                <span style={{
                                  background: inv.diffDays > 90 ? '#fef2f2' : inv.diffDays > 60 ? '#fffbeb' : '#f0fdf4',
                                  color: inv.diffDays > 90 ? '#dc2626' : inv.diffDays > 60 ? '#d97706' : '#059669',
                                  padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 500
                                }}>
                                  {inv.diffDays}d
                                </span>
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                <div style={{
                                  display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center'
                                }}>
                                  <div style={{
                                    width: '40px', height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden'
                                  }}>
                                    <div style={{
                                      width: `${Math.min(Number(inv.collectionRate), 100)}%`, height: '100%',
                                      background: Number(inv.collectionRate) > 70 ? '#10b981' : Number(inv.collectionRate) > 40 ? '#f59e0b' : '#ef4444',
                                      borderRadius: '2px'
                                    }} />
                                  </div>
                                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                                    {inv.collectionRate}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div style={{
        marginTop: '16px', padding: '12px 16px',
        background: '#f1f5f9', borderRadius: '8px',
        display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px'
      }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {agingData.map((bucket, i) => {
            const colors = getBucketColor(bucket.label);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: colors.dot }} />
                <span style={{ fontSize: '11px', color: '#64748b' }}>{bucket.label}</span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: colors.text }}>
                  {((totalReceivable > 0 ? bucket.total / totalReceivable * 100 : 0)).toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
        {data?.chqInv?.length > 0 && (
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Pending cheques: {data.chqInv.length} ({(data.chqInv.reduce((s, c) => s + Number(c.Amount || 0), 0)).toLocaleString()})
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceAgingTable;
