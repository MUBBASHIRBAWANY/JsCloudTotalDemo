import React, { useMemo } from 'react';

const PendingChequesCard = ({ data, loading, error, distributorName }) => {
  // Sort by date (newest first), take last 10
  const cheques = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return [...data]
      .sort((a, b) => new Date(b.ChqDate || 0) - new Date(a.ChqDate || 0))
      .slice(0, 10);
  }, [data]);

  const totalPending = useMemo(() =>
    cheques.reduce((s, c) => s + Number(c.Amount || 0), 0),
    [cheques]
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return { bg: '#fffbeb', text: '#d97706', label: 'Pending' };
      case 'Cleared':
        return { bg: '#ecfdf5', text: '#059669', label: 'Cleared' };
      case 'Bounce':
        return { bg: '#fef2f2', text: '#dc2626', label: 'Bounced' };
      default:
        return { bg: '#f1f5f9', text: '#64748b', label: status || 'Unknown' };
    }
  };

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
            borderTopColor: '#8b5cf6', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 12px'
          }} />
          <p style={{ color: '#64748b', fontSize: '14px' }}>Loading cheques...</p>
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
        marginBottom: '20px'
      }}>
        <div>
          <h2 style={{
            margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M12 8v8M8 12h8" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Pending Cheques
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
            {distributorName || 'All'} — Last 10 pending cheques
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '10px', marginBottom: '16px'
      }}>
        <div style={{
          background: 'white', borderRadius: '10px', padding: '12px',
          border: '1px solid #f1f5f9', textAlign: 'center'
        }}>
          <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 500, marginBottom: '4px' }}>
            Total Pending
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#8b5cf6' }}>
            {cheques.length}
          </div>
        </div>
        <div style={{
          background: 'white', borderRadius: '10px', padding: '12px',
          border: '1px solid #f1f5f9', textAlign: 'center'
        }}>
          <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 500, marginBottom: '4px' }}>
            Total Amount
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b' }}>
            {totalPending.toLocaleString()}
          </div>
        </div>
        <div style={{
          background: 'white', borderRadius: '10px', padding: '12px',
          border: '1px solid #f1f5f9', textAlign: 'center'
        }}>
          <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 500, marginBottom: '4px' }}>
            Avg Cheque
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>
            {cheques.length > 0 ? Math.round(totalPending / cheques.length).toLocaleString() : 0}
          </div>
        </div>
      </div>

      {cheques.length === 0 ? (
        <div style={{
          background: 'white', borderRadius: '10px', padding: '24px',
          border: '1px solid #f1f5f9', textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
          <p style={{ color: '#64748b', fontSize: '14px' }}>No pending cheques found</p>
          <p style={{ color: '#94a3b8', fontSize: '12px' }}>All payments are cleared</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', background: 'white' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '11px' }}>#</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '11px' }}>Cheque No.</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '11px' }}>Customer</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b', fontWeight: 600, fontSize: '11px' }}>Amount</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b', fontWeight: 600, fontSize: '11px' }}>Cheque Date</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b', fontWeight: 600, fontSize: '11px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {cheques.map((chq, idx) => {
                const badge = getStatusBadge(chq.Status);
                return (
                  <tr key={chq._id || idx} style={{
                    borderBottom: '1px solid #f1f5f9',
                    transition: 'background 0.15s'
                  }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <td style={{ padding: '10px 12px', color: '#94a3b8', fontSize: '11px' }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b', fontFamily: 'monospace' }}>
                      {chq.ChqNumber || 'N/A'}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#334155' }}>
                      {chq.Customer || chq.customerName || 'N/A'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                      {Number(chq.Amount || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>
                      {chq.ChqDate || chq.entryDate || 'N/A'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{
                        background: badge.bg,
                        color: badge.text,
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}>
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer note */}
      <div style={{
        marginTop: '12px', padding: '8px 12px',
        background: '#f1f5f9', borderRadius: '8px',
        fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px'
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        Showing last {cheques.length} pending cheque{cheques.length !== 1 ? 's' : ''}. Total {Array.isArray(data) ? data.length : 0} pending all time.
      </div>
    </div>
  );
};

export default PendingChequesCard;
