import React, { useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div style={{
        backgroundColor: 'rgba(255,255,255,0.97)',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '10px 14px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <p style={{ fontWeight: 600, color: '#1e293b', margin: '0 0 4px 0', fontSize: '12px' }}>
          {d.name}
        </p>
        <p style={{ color: '#64748b', margin: '2px 0', fontSize: '12px' }}>
          Amount: <strong>{d.value.toLocaleString()}</strong>
        </p>
        <p style={{ color: '#64748b', margin: '2px 0', fontSize: '11px' }}>
          {d.percentage}% of total
        </p>
      </div>
    );
  }
  return null;
};

const DistributorReceivables = ({
  distributorName,
  analyticsData,
  loading,
  error,
  selectedYear
}) => {
  const pieData = useMemo(() => {
    if (!analyticsData) return [];
    const outstanding = analyticsData.outstanding?.totalOutstanding || 0;
    const yearReceived = analyticsData.monthlyData?.reduce((s, m) => s + (m.totalReceived || 0), 0) || 0;

    return [
      { name: 'Collected', value: yearReceived > 0 ? yearReceived : 0, color: '#10b981' },
      { name: 'Outstanding', value: outstanding > 0 ? outstanding : 0, color: '#f59e0b' },
    ].filter(d => d.value > 0);
  }, [analyticsData]);

  const collectionRate = useMemo(() => {
    if (!analyticsData) return 0;
    const yearSales = analyticsData.monthlyData?.reduce((s, m) => s + (m.totalSales || 0), 0) || 0;
    const yearReceived = analyticsData.monthlyData?.reduce((s, m) => s + (m.totalReceived || 0), 0) || 0;
    if (yearSales === 0) return 0;
    return ((yearReceived / yearSales) * 100).toFixed(1);
  }, [analyticsData]);

  if (loading) {
    return (
      <div style={{
        background: '#f8fafc', borderRadius: '16px', padding: '24px',
        minHeight: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px', border: '3px solid #e2e8f0',
            borderTopColor: '#10b981', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 12px'
          }} />
          <p style={{ color: '#64748b', fontSize: '14px' }}>Loading receivables...</p>
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

  const outstanding = analyticsData?.outstanding?.totalOutstanding || 0;
  const totalInvoices = analyticsData?.outstanding?.totalInvoices || 0;

  return (
    <div style={{
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      background: '#f8fafc',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.04)',
      height: '100%',
      minHeight: '340px'
    }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{
          margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M12 8v8M8 12h8" />
          </svg>
          Receivables Overview
        </h2>
        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
          {distributorName || 'Distributor'} - Collection status
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Collection Rate */}
        <div style={{
          background: 'white', borderRadius: '12px', padding: '16px',
          border: '1px solid #f1f5f9', textAlign: 'center'
        }}>
          <div style={{ fontSize: '36px', fontWeight: 800, color: collectionRate >= 70 ? '#10b981' : '#f59e0b' }}>
            {collectionRate}%
          </div>
          <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 500, marginTop: '4px' }}>
            Collection Rate ({selectedYear})
          </div>
          <div style={{
            width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px',
            marginTop: '12px', overflow: 'hidden'
          }}>
            <div style={{
              width: `${Math.min(collectionRate, 100)}%`, height: '100%',
              background: collectionRate >= 70
                ? 'linear-gradient(90deg, #10b981, #34d399)'
                : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
              borderRadius: '3px',
              transition: 'width 0.8s ease'
            }} />
          </div>
        </div>

        {/* Outstanding Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div style={{
            background: 'white', borderRadius: '12px', padding: '14px',
            border: '1px solid #f1f5f9'
          }}>
            <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 500, marginBottom: '4px' }}>
              Total Outstanding
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#f59e0b' }}>
              {outstanding.toLocaleString()}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>
              {totalInvoices} pending invoices
            </div>
          </div>
          <div style={{
            background: 'white', borderRadius: '12px', padding: '14px',
            border: '1px solid #f1f5f9'
          }}>
            <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 500, marginBottom: '4px' }}>
              Avg per Invoice
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#6366f1' }}>
              {totalInvoices > 0 ? (outstanding / totalInvoices).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>
              Average outstanding
            </div>
          </div>
        </div>

        {/* Pie Chart */}
        {pieData.length > 0 && (
          <div style={{
            background: 'white', borderRadius: '12px', padding: '12px',
            border: '1px solid #f1f5f9', height: '180px'
          }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  <linearGradient id="collectedGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="outstandingGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  dataKey="value"
                  nameKey="name"
                  startAngle={90}
                  endAngle={-270}
                  animationDuration={600}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? 'url(#collectedGrad)' : 'url(#outstandingGrad)'}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
          {pieData.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '10px', height: '10px', borderRadius: '3px',
                background: d.color
              }} />
              <span style={{ fontSize: '12px', color: '#475569' }}>
                {d.name}: {d.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DistributorReceivables;
