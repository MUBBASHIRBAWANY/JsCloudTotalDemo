import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

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
        <p style={{ fontWeight: 700, color: '#1e293b', margin: '0 0 6px 0', fontSize: '13px' }}>
          {d.fullMonth}
        </p>
        <p style={{ color: '#6366f1', margin: '2px 0', fontSize: '12px' }}>
          Sales: <strong>{d.totalSales.toLocaleString()}</strong>
        </p>
        <p style={{ color: '#10b981', margin: '2px 0', fontSize: '12px' }}>
          Received: <strong>{d.totalReceived.toLocaleString()}</strong>
        </p>
        <p style={{ color: '#f59e0b', margin: '2px 0', fontSize: '12px' }}>
          Remaining: <strong>{d.totalRemaining.toLocaleString()}</strong>
        </p>
        <p style={{ color: '#64748b', margin: '2px 0', fontSize: '11px' }}>
          Invoices: {d.invoiceCount}
        </p>
      </div>
    );
  }
  return null;
};

const DistributorSalesChart = ({
  distributorName,
  analyticsData,
  loading,
  error,
  selectedYear,
  onYearChange
}) => {
  const [activeBar, setActiveBar] = useState(null);

  const chartData = useMemo(() => {
    if (!analyticsData?.monthlyData) return [];
    return months.map((name, idx) => {
      const monthNum = idx + 1;
      const monthData = analyticsData.monthlyData.find(d => d.month === monthNum);
      return {
        month: name,
        fullMonth: `${name} ${selectedYear}`,
        totalSales: monthData?.totalSales || 0,
        totalReceived: monthData?.totalReceived || 0,
        totalRemaining: monthData?.totalRemaining || 0,
        invoiceCount: monthData?.invoiceCount || 0,
      };
    });
  }, [analyticsData, selectedYear]);

  const gradientColors = [
    '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd',
    '#818cf8', '#6366f1', '#4f46e5', '#4338ca',
    '#3730a3', '#312e81', '#6366f1', '#8b5cf6'
  ];

  if (loading) {
    return (
      <div style={{
        background: '#f8fafc', borderRadius: '16px', padding: '24px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.04)', minHeight: '340px',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px', border: '3px solid #e2e8f0',
            borderTopColor: '#6366f1', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 12px'
          }} />
          <p style={{ color: '#64748b', fontSize: '14px' }}>Loading distributor data...</p>
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

  const totalYearSales = chartData.reduce((s, d) => s + d.totalSales, 0);
  const totalYearReceived = chartData.reduce((s, d) => s + d.totalReceived, 0);

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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
              <path d="M3 3v18h18" /><path d="M7 16l4-8 4 4 4-6" />
            </svg>
            {distributorName || 'Distributor'} - Monthly Sales
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
            Year-to-date performance overview
          </p>
        </div>
        <select
          value={selectedYear}
          onChange={(e) => onYearChange?.(Number(e.target.value))}
          style={{
            padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0',
            fontSize: '13px', background: 'white', cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          {[2024, 2025, 2026, 2027].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Summary KPI Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px', marginBottom: '20px'
      }}>
        {[
          { label: 'Total Sales', value: totalYearSales, color: '#6366f1', icon: '📊' },
          { label: 'Total Received', value: totalYearReceived, color: '#10b981', icon: '💰' },
          { label: 'Outstanding', value: analyticsData?.outstanding?.totalOutstanding || 0, color: '#f59e0b', icon: '📋' },
          { label: 'This Month', value: analyticsData?.currentMonth?.totalSales || 0, color: '#8b5cf6', icon: '📈' },
        ].map((kpi, i) => (
          <div key={i} style={{
            background: 'white', borderRadius: '12px', padding: '14px 16px',
            border: '1px solid #f1f5f9', transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'default'
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <span style={{ fontSize: '16px' }}>{kpi.icon}</span>
              <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 500 }}>{kpi.label}</span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: kpi.color }}>
              {kpi.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{
        background: 'white', borderRadius: '12px', padding: '16px',
        border: '1px solid #f1f5f9', height: '280px'
      }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
            <defs>
              {gradientColors.map((color, i) => (
                <linearGradient key={i} id={`salesGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.5} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
            <Bar
              dataKey="totalSales"
              barSize={24}
              radius={[4, 4, 0, 0]}
              onMouseEnter={(_, index) => setActiveBar(index)}
              onMouseLeave={() => setActiveBar(null)}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#salesGrad${index % 12})`}
                  opacity={activeBar === null || activeBar === index ? 1 : 0.6}
                  style={{ transition: 'opacity 0.2s' }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DistributorSalesChart;
