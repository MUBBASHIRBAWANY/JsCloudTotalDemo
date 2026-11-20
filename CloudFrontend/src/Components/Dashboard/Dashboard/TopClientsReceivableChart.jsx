import React, { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { getDataFundtion } from "../../Api/CurdFunctions";
import { fetchCustomerRecVable } from "../../Redux/Reducers/FinacailPosition";

const TopClientsReceivableChart = () => {
  const data = useSelector((state) => state.FinacailPosition.CustomerRecVable)
  const OrderBooker = useSelector((state) => state.OrderBooker.OrderBooker)
  const [Client, Setclient] = useState([])
//console.log(Client)
const dispatch = useDispatch()
  const getData = async () => {
    try {
      const ClientS = await getDataFundtion("/Customor")
      const Reamain = await getDataFundtion("saleinvoice/getOnlyRemain")
      dispatch(fetchCustomerRecVable( Reamain.data))
      Setclient(ClientS.data)
    } catch (err) {

    }
  }
  useEffect(() => {
    getData()
  }, [ ])
  const [groupBy, setGroupBy] = useState("Client");

  // Process data
  const chartData = useMemo(() => {
    const grouped = {};
//console.log(data)
    data.forEach((invoice) => {
      const key = invoice[groupBy] || invoice.SalesData[0][groupBy];

      if (!grouped[key]) {
        grouped[key] = {
          id: key,
          name: groupBy === "Client" ? Client.find((C)=> C._id == key)?.CutomerName : OrderBooker.find((Od)=> Od._id == key)?.OrderBookerName ,
          receivable: 0,
          invoices: 0,
        };
      }

      if (invoice.RemainingAmount > 0) {
        grouped[key].receivable += invoice.RemainingAmount;
        grouped[key].invoices += 1;
      }
    });

    return Object.values(grouped)
      .sort((a, b) => b.receivable - a.receivable)
      .slice(0, 10);
  }, [data, groupBy, OrderBooker]);

  // Bar colors
  const colors = [
    "#8884d8",
    "#82ca9d",
    "#ff7c7c",
    "#ffc658",
    "#8dd1e1",
    "#ff8042",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#0088FE",
  ];

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="pd-chart-tooltip">
          <p className="mb-1 font-bold text-on-surface">{d.name}</p>
          <p className="text-primary">Receivable: {d.receivable.toLocaleString()}</p>
          <p className="text-sm text-on-surface-variant">Invoices: {d.invoices}</p>
        </div>
      );
    }
    return null;
  };

  return (
<div className="pd-dashboard-card max-w-4xl">
  <div className="mb-3 flex items-center justify-between">
    <h1 className="text-lg font-semibold text-on-surface">
      Top 10 Receivable by {groupBy}
    </h1>

    <select
      value={groupBy}
      onChange={(e) => setGroupBy(e.target.value)}
      className="rounded-md border border-outline-variant bg-surface-container-lowest p-1.5 text-sm text-on-surface"
    >
      <option value="Client">Client</option>
      <option value="OrderBooker">OrderBooker</option>
    </select>
  </div>

  <div className="pd-card h-[280px] p-2">
<ResponsiveContainer width="100%" height="100%">
  <BarChart
    data={chartData}
    margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
  >
    <defs>
      {/* ✅ Define multiple gradients */}
      <linearGradient id="grad0" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#8884d8" stopOpacity={1}/>
        <stop offset="100%" stopColor="#82ca9d" stopOpacity={1}/>
      </linearGradient>
      <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ff7c7c" stopOpacity={1}/>
        <stop offset="100%" stopColor="#ffc658" stopOpacity={1}/>
      </linearGradient>
      <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#8dd1e1" stopOpacity={1}/>
        <stop offset="100%" stopColor="#ff8042" stopOpacity={1}/>
      </linearGradient>
      <linearGradient id="grad3" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#00C49F" stopOpacity={1}/>
        <stop offset="100%" stopColor="#FFBB28" stopOpacity={1}/>
      </linearGradient>
      {/* ➕ add more if needed */}
    </defs>

    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
    <YAxis tickFormatter={(v) => `${v.toLocaleString()}`} tick={{ fontSize: 10 }} />
    <Tooltip content={<CustomTooltip />} />

    <Bar dataKey="receivable" barSize={20}>
      {chartData.map((entry, i) => (
        <Cell 
          key={`cell-${i}`} 
          fill={`url(#grad${i % 4})`} // ✅ rotate between gradients
        />
      ))}
    </Bar>
  </BarChart>
</ResponsiveContainer>

  </div>
</div>


  );
};

export default TopClientsReceivableChart;
