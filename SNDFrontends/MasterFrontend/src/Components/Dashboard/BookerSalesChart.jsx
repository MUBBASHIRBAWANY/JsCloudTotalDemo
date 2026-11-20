import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div style={{
        backgroundColor: 'rgba(255,255,255,0.97)',
        border: '1px solid #e0e0e0', borderRadius: '10px',
        padding: '12px 16px', boxShadow: '0 6px 20px rgba(0,0,0,0.12)'
      }}>
        <p style={{ fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0', fontSize: '13px', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
          {d.bookerName}
        </p>
        <p style={{ color: '#6366f1', margin: '4px 0', fontSize: '12px' }}>
          Sales: <strong>{d.totalSales.toLocaleString()}</strong>
        </p>
        <p style={{ color: '#10b981', margin: '4px 0', fontSize: '12px' }}>
          Received: <strong>{d.totalReceived.toLocaleString()}</strong>
        </p>
        <p style={{ color: '#64748b', margin: '4px 0', fontSize: '12px' }}>
          Invoices: <strong>{d.invoiceCount}</strong>
        </p>
        <p style={{ color: '#f59e0b', margin: '4px 0', fontSize: '12px' }}>
          Remaining: <strong>{d.totalRemaining.toLocaleString()}</strong>
        </p>
      </div>
    );
  }
  return null;
};

const BookerSalesChart = ({ data, loading, error, distributorName }) => {
  const [activeBar, setActiveBar] = useState(null);
  const [viewMode, setViewMode] = useState('sales'); // 'sales' | 'count' | 'received'
  const [monthFilter, setMonthFilter] = useState('all');

  const orderBookers = data?.orderBookers || [];
  const bookerSalesData = data?.bookerSales || [];

  // Merge booker names with sales data
  const chartData = useMemo(() => {
    if (!bookerSalesData.length) return [];

    return bookerSalesData.map(item => {
      const booker = orderBookers.find(b => b._id === item.OrderBooker);
      const bookerName = booker?.OrderBookerName || `Booker ${item.OrderBooker?.slice(-4) || 'Unknown'}`;
      return {
        bookerId: item.OrderBooker,
        bookerName,
        totalSales: item.TotalAmount || 0,
        totalReceived: item.TotalReceived || 0,
        totalRemaining: item.TotalRemaining || 0,
        invoiceCount: item.invoiceCount || 0,
      };
    }).slice(0, 10);
  }, [bookerSalesData, orderBookers]);

  // Filter by month if needed
  const displayData = useMemo(() => {
    if (monthFilter === 'all' || monthFilter === '') return chartData;
    return chartData;
  }, [chartData, monthFilter]);

  const totalSales = useMemo(() =>
    displayData.reduce((s, d) => s + d.totalSales, 0),
    [displayData]
  );

  const keyMap = {
    sales: 'totalSales',
    count: 'invoiceCount',
    received: 'totalReceived',
  };

  const dataKey = keyMap[viewMode] || 'totalSales';

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
            borderTopColor: '#10b981', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 12px'
          }} />
          <p style={{ color: '#64748b', fontSize: '14px' }}>Loading booker sales...</p>
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
        marginBottom: '20px', flexWrap: 'wrap', gap: '12px'
      }}>
        <div>
          <h2 style={{
            margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
              <path d="M3 3v18h18" />
              <path d="M7 16l4-8 4 4 4-6" />
            </svg>
            Monthly Sales by Order Booker
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
            {distributorName || 'All Distributors'} — Top 10 bookers
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { key: 'sales', label: 'Sales', icon: '📊' },
            { key: 'received', label: 'Received', icon: '💰' },
            { key: 'count', label: 'Invoices', icon: '📄' },
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => setViewMode(opt.key)}
              style={{
                padding: '5px 12px', borderRadius: '8px', border: '1px solid #e2e8f0',
                fontSize: '11px', fontWeight: 500, cursor: 'pointer',
                background: viewMode === opt.key ? '#10b981' : 'white',
                color: viewMode === opt.key ? 'white' : '#64748b',
                transition: 'all 0.2s'
              }}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Summary */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '10px', marginBottom: '16px'
      }}>
        <div style={{
          background: 'white', borderRadius: '10px', padding: '12px 14px',
          border: '1px solid #f1f5f9'
        }}>
          <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 500, marginBottom: '2px' }}>Total Sales</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#6366f1' }}>
            {totalSales.toLocaleString()}
          </div>
        </div>
        <div style={{
          background: 'white', borderRadius: '10px', padding: '12px 14px',
          border: '1px solid #f1f5f9'
        }}>
          <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 500, marginBottom: '2px' }}>Total Bookers</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>
            {displayData.length}
          </div>
        </div>
        <div style={{
          background: 'white', borderRadius: '10px', padding: '12px 14px',
          border: '1px solid #f1f5f9'
        }}>
          <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 500, marginBottom: '2px' }}>Avg per Booker</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#f59e0b' }}>
            {displayData.length > 0 ? Math.round(totalSales / displayData.length).toLocaleString() : 0}
          </div>
        </div>
      </div>

      {/* Chart */}
      {displayData.length === 0 ? (
        <div style={{
          background: 'white', borderRadius: '10px', padding: '32px',
          border: '1px solid #f1f5f9', textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
          <p style={{ color: '#64748b', fontSize: '14px' }}>No sales data available</p>
        </div>
      ) : (
        <div style={{
          background: 'white', borderRadius: '12px', padding: '16px',
          border: '1px solid #f1f5f9', height: '280px'
        }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayData} margin={{ top: 8, right: 12, left: 0, bottom: 40 }} layout="vertical">
              <defs>
                <linearGradient id="salesGradB" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0.4} />
                </linearGradient>
                <linearGradient id="receivedGradB" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#818cf8" stopOpacity={0.4} />
                </linearGradient>
                <linearGradient id="countGradB" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
              />
              <YAxis
                type="category"
                dataKey="bookerName"
                tick={{ fontSize: 10, fill: '#475569' }}
                axisLine={false}
                tickLine={false}
                width={110}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
              <Bar
                dataKey={dataKey}
                barSize={18}
                radius={[0, 4, 4, 0]}
                onMouseEnter={(_, index) => setActiveBar(index)}
                onMouseLeave={() => setActiveBar(null)}
              >
                {displayData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={`url(${viewMode === 'sales' ? '#salesGradB' : viewMode === 'received' ? '#receivedGradB' : '#countGradB'})`}
                    opacity={activeBar === null || activeBar === index ? 1 : 0.6}
                    style={{ transition: 'opacity 0.2s' }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend & Booker List */}
      <div style={{
        marginTop: '12px', padding: '12px 16px',
        background: 'white', borderRadius: '10px',
        border: '1px solid #f1f5f9'
      }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
          Booker Performance Summary
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {displayData.map((item, idx) => {
            const pct = totalSales > 0 ? ((item.totalSales / totalSales) * 100).toFixed(1) : 0;
            return (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '4px 8px', borderRadius: '6px',
                transition: 'background 0.15s'
              }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: idx === 0 ? '#10b981' : idx <= 2 ? '#6366f1' : '#94a3b8'
                }} />
                <span style={{ fontSize: '12px', color: '#334155', flex: 1, fontWeight: idx === 0 ? 600 : 400 }}>
                  {item.bookerName}
                </span>
                <div style={{ width: '60px', height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(pct, 100)}%`, height: '100%',
                    background: idx === 0 ? '#10b981' : idx <= 2 ? '#6366f1' : '#94a3b8',
                    borderRadius: '2px', transition: 'width 0.5s ease'
                  }} />
                </div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, minWidth: '40px', textAlign: 'right' }}>
                  {pct}%
                </span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#0f172a', minWidth: '70px', textAlign: 'right' }}>
                  {item.totalSales.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BookerSalesChart;
