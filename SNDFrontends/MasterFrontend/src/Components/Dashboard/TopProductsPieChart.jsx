import React, { useState, useMemo, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getDataFundtion } from '../../Api/CurdFunctions';
import { useDispatch } from 'react-redux';
import { fetchproductValue } from '../../Redux/Reducers/FinacailPosition';

const TopProductsPieChart = () => {
  const [data, setData] = useState([])
  const [product, setProducts] = useState([])
  const dispatch = useDispatch()
  const getData = async () => {
    try {
      const getingData = await getDataFundtion("/TotalProduct")
      const Products = await getDataFundtion("/product")
      setProducts(Products.data)
  dispatch(fetchproductValue(getingData.data))      
      setData(getingData)
    } catch (err) {
      console.log(err)
    }
  }
  useEffect(() => {
    getData()
  }, [])

  // Process data for the chart - get top 10 products by TotalQuantity
  const chartData = useMemo(() => {
    // Filter out products with 0 quantity and sort by TotalQuantity
    const filteredData = data.data
      ?.filter(item => item?.TotalQuantity > 0)
      ?.sort((a, b) => b?.TotalQuantity - a.TotalQuantity)
      // Get top 10

    // Generate product names since we only have IDs
    const productNames = {};
    filteredData?.forEach((item, index) => {
      if (!productNames[item.ProductName]) {
        productNames[item.ProductName] = item.ProductName;
      }
    });

    // Format data for chart
    return filteredData?.map(item => ({
      name: product.find((P) => P._id == item.ProductName)?.ProductName,
      value: item.TotalQuantity,
      amount: item.Amount,

      productId: item.ProductName
    }));
  }, [data]);

  // Colors for the chart
  const colors = [
    '#8884d8', '#82ca9d', '#ff7c7c', '#ffc658', '#8dd1e1',
    '#ff8042', '#00C49F', '#FFBB28', '#FF8042', '#0088FE'
  ];

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '5px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
        }}>
          <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>{data.name}</p>
          <p style={{ color: '#8884d8', margin: '3px 0' }}>
            Quantity: {data.value.toLocaleString()}
          </p>
          <p style={{ color: '#82ca9d', margin: '3px 0' }}>
            Amount: {data.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
          <p style={{ color: '#999', margin: '3px 0', fontSize: '12px' }}>
            ID: {data.productId}
          </p>
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

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div style={{
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
      maxWidth: '1000px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#f5f7fb',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
    }}>
      <h1 style={{
        textAlign: 'center',
        color: '#2c3e50',
        marginBottom: '10px',
        fontSize: '20px',
        fontWeight: '600'
      }}>
        Top 10 Products by Quantity Sold
      </h1>

      <div style={{
        backgroundColor: 'white',
        padding: '10px',
        borderRadius: '10px',
        marginBottom: '10px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ height: '350px' }}>
          <ResponsiveContainer width="100%" height="80%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
              >
                {chartData?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                layout="vertical"
                verticalAlign="middle"
                align="right"
                formatter={(value, entry, index) => (
                  <span style={{ color: '#333', fontSize: '12px' }}>
                    {value}-{chartData[index]?.value.toLocaleString()}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>


    </div>
  );
};

export default TopProductsPieChart;