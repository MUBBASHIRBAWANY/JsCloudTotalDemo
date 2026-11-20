import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { getDataFundtion } from '../../Api/CurdFunctions';
import { fetchproductValue, fetchTotalSales } from '../../Redux/Reducers/FinacailPosition';
import { useDispatch } from 'react-redux';
import { fetchOrderBooker } from '../../Redux/Reducers/OrderBookerReducer';

const OrderBookerSalePieChart = () => {
  const [data, setData] = useState([]);
  const dispatch = useDispatch();
  const [chartData, setChartData] = useState([]);
  const [orderBookers, setOrderBookers] = useState([]);
  const [totalSalesValue, setTotalSalesValue] = useState(0);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [activeIndex, setActiveIndex] = useState(null);

  const getData = async () => {
    const getingData = await getDataFundtion("/InventoryReport/OrderBookerSale");

    dispatch(fetchTotalSales(getingData));
    const Booker = await getDataFundtion("/OrderBooker");
    dispatch(fetchOrderBooker(Booker.data));
    setOrderBookers(Booker.data);

    setData(getingData);
  };

  useEffect(() => {
    getData();
  }, []);

  // Process data for the chart
  useEffect(() => {
    if (data.length > 0 && orderBookers.length > 0) {
      const bookers = [...new Set(data.map(item => item.OrderBooker))];

      // Calculate total sales for each order booker
      const salesByBooker = bookers.map(booker => {
        const bookerSales = data.filter(item => item.OrderBooker === booker);
        const totalSales = bookerSales.reduce((sum, item) => sum + item.TotalAmount, 0);
        const invoiceCount = bookerSales.length;
        const bookerName = orderBookers.find((Bo) => Bo._id === booker)?.OrderBookerName || `Booker ${booker.slice(-4)}`;

        return {
          bookerId: booker,
          bookerName,
          totalSales,
          invoiceCount
        };
      });

      const sortedOrderBooker = salesByBooker.sort((a, b) => b.totalSales - a.totalSales).slice(0, 10);
      setChartData(sortedOrderBooker);

      // Calculate totals
      const sales = sortedOrderBooker.reduce((sum, item) => sum + item.totalSales, 0);
      const invoices = sortedOrderBooker.reduce((sum, item) => sum + item.invoiceCount, 0);

      setTotalSalesValue(sales);
      setTotalInvoices(invoices);
    }
  }, [data, orderBookers]);

  // Colors for different segments
  const COLORS = [
    '#8884d8', '#82ca9d', '#ff7c7c', '#ffc658', '#8dd1e1',
    '#a4de6c', '#d0ed57', '#ffc0cb', '#00ced1', '#ffa07a',
    '#9370db', '#3cb371', '#ff6347', '#ffd700', '#40e0d0',
    '#8884d8', '#82ca9d', '#ff7c7c', '#ffc658', '#8dd1e1',
    '#a4de6c', '#d0ed59', '#ffc0cb', '#00ced1', '#ffa07a',
    '#9370db', '#3cb371', '#ff6347', '#ffd700', '#40e0d0',
    '#8884d8', '#82ca9d', '#ff7c7c', '#ffc658', '#8dd1e1',
    '#a4de6c', '#d0ed59', '#ffc0cb', '#00ced1', '#ffa07a',
    '#9370db', '#3cb371', '#ff6347', '#ffd700', '#40e0d0'
  ];

  const today = new Date();
  const monthName = today.toLocaleString('default', { month: 'long' });
  const year = today.getFullYear();

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.totalSales / totalSalesValue) * 100).toFixed(1);

      return (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.97)',

          border: '1px solid #e0e0e0',
          borderRadius: '10px',
          boxShadow: '0 6px 20px rgba(0,0,0,0.15)'
        }}>
          <p style={{
            fontWeight: 'bold',
            color: '#2c3e50',
            fontSize: '10px',
            borderBottom: '1px solid #eee',
          }}>
            {data.bookerName}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#7b8794' }}>Sales Amount:</span>
              <span style={{ fontWeight: 'bold', color: '#8884d8' }}>{data.totalSales.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#7b8794' }}>Invoices:</span>
              <span style={{ fontWeight: 'bold', color: '#82ca9d' }}>{data.invoiceCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#7b8794' }}>Percentage:</span>
              <span style={{ fontWeight: 'bold', color: '#ff7c7c' }}>{percentage}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#7b8794' }}>Avg. Sale/Invoice:</span>
              <span style={{ fontWeight: 'bold', color: '#ffc658' }}>
                {Math.round(data.totalSales / data.invoiceCount).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom label renderer
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent > 0.05) { // Only show label if segment is large enough
      return (
        <text
          x={x}
          y={y}
          fill="white"
          textAnchor={x > cx ? 'start' : 'end'}
          dominantBaseline="central"
          fontSize="10"
          fontWeight="bold"
          stroke="rgba(0,0,0,0.3)"
          strokeWidth={1}
        >
          {`${(percent * 100).toFixed(0)}%`}
        </text>
      );
    }
    return null;
  };

  // Handle mouse events for interactive highlighting
  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  // Calculate performance metrics
  const topPerformer = chartData.length > 0 ? chartData[0] : null;
  const averageSalePerBooker = chartData.length > 0 ? totalSalesValue / chartData.length : 0;

  return (
    <div className="pd-dashboard-card pb-4">



      <div style={{
        marginTop: "0px",     // ⬅ remove top margin
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "15px"
      }}>

        {/* Pie Chart */}
        <div style={{ width: "260px", height: "260px" }}>   {/* smaller size */}
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              {/* ✅ Define gradients here */}
              <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8884d8" stopOpacity={1} />
                  <stop offset="100%" stopColor="#82ca9d" stopOpacity={1} />
                </linearGradient>
                <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff7c7c" stopOpacity={1} />
                  <stop offset="100%" stopColor="#ffc658" stopOpacity={1} />
                </linearGradient>
                {/* You can add as many gradients as needed */}
              </defs>

              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={activeIndex !== null ? 110 : 100}
                innerRadius={60}
                dataKey="totalSales"
                nameKey="bookerName"
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
                animationDuration={500}
                startAngle={90}
                endAngle={-270}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={`url(#grad${(index % 2) + 1})`} // ✅ apply gradient instead of flat color
                    stroke="#fff"
                    opacity={activeIndex === null || activeIndex === index ? 1 : 0.7}
                  />
                ))}
              </Pie>

              <Tooltip content={<CustomTooltip />} />
            </PieChart>

          </ResponsiveContainer>
        </div>

        {/* Legend below chart */}
        <div style={{
          width: "100%",
          maxWidth: "300px",
          marginTop: "10px"
        }}>
          <h4 style={{ color: '#2d3748', margin: '0 0 8px 0', fontSize: '12px' }}>
            Performance Summary month of {monthName}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: "4px" }}>
            {chartData.map((item, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                borderRadius: '4px',
                backgroundColor: activeIndex === index ? '#f1f5f9' : 'transparent'
              }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '2px',
                  backgroundColor: COLORS[index % COLORS.length],
                  marginRight: "6px"
                }}></div>
                
                <span style={{ fontSize: '10px', flex: 1 }}>{item.bookerName}</span>
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>
                  {((item.totalSales / totalSalesValue) * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>



    </div>
  );
};

export default OrderBookerSalePieChart; 