import React, { useEffect, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchUserRights } from '../../Redux/Reducers/UseRights'
import { toast, ToastContainer } from 'react-toastify'
import { getDataFundtion } from '../../Api/CurdFunctions'
import InvoiceAgingTable from '../../Components/Dashboard/InvoiceAgingTable'
import PendingChequesCard from '../../Components/Dashboard/PendingChequesCard'
import BookerSalesChart from '../../Components/Dashboard/BookerSalesChart'
import { canSeeAllDistributors, filterDistributorOptions, filterByAssignedDistributors } from '../../Components/Global/distributorAccess'

const Dashboard = () => {
  const dispatch = useDispatch()
  const loginuser = useSelector((state) => state.LoginerReducer.userDetail)
  const [assignedDistributors, setAssignedDistributors] = useState([])
  const [selectedDistributor, setSelectedDistributor] = useState(null)
  const [orderBookers, setOrderBookers] = useState([])
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
    }
  })
  const [presetRange, setPresetRange] = useState('thisMonth')

  // Invoice Aging
  const [agingData, setAgingData] = useState(null)
  const [agingLoading, setAgingLoading] = useState(false)
  const [agingError, setAgingError] = useState(null)

  // Pending Cheques
  const [chqData, setChqData] = useState(null)
  const [chqLoading, setChqLoading] = useState(false)
  const [chqError, setChqError] = useState(null)

  // Booker Sales
  const [bookerSalesData, setBookerSalesData] = useState(null)
  const [bookerLoading, setBookerLoading] = useState(false)
  const [bookerError, setBookerError] = useState(null)

  const isAdmin = loginuser?.email === 'admin@js.com'

  // Load user rights on mount
  const getData = useCallback(async () => {
    try {
      const role = await getDataFundtion(`userRole/role/${loginuser.selectRole}`)
      dispatch(fetchUserRights(role.data.Roles))
    } catch (err) {
      console.log(err)
      toast.error('Something went wrong')
    }
  }, [loginuser, dispatch])

  // Load distributors list
  const loadDistributors = useCallback(async () => {
    try {
      const res = await getDataFundtion('/Distrbutor')
      const filtered = filterDistributorOptions(res, loginuser)
      setAssignedDistributors(filtered)
      if (filtered.length > 0) setSelectedDistributor(filtered[0])
    } catch (err) {
      console.log(err)
    }
  }, [loginuser, isAdmin])

  // Load order bookers
  const loadOrderBookers = useCallback(async () => {
    try {
      const res = await getDataFundtion('/OrderBooker')
      setOrderBookers(filterByAssignedDistributors(res.data || [], loginuser, (item) => item.Distributor || item.Distrbutor))
    } catch (err) {
      console.log(err)
    }
  }, [loginuser])

  // Date range presets
  const applyPreset = useCallback((preset) => {
    const now = new Date()
    let start, end

    switch (preset) {
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = now
        break
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        end = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'last90':
        start = new Date(now.getFullYear(), now.getMonth() - 3, 1)
        end = now
        break
      case 'lastYear':
        start = new Date(now.getFullYear() - 1, now.getMonth(), 1)
        end = now
        break
      default:
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        end = now
    }

    setDateRange({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    })
    setPresetRange(preset)
  }, [])

  // Fetch all data for selected distributor (parallel API calls, independent error handling)
  const fetchAllData = useCallback(async () => {
    if (!selectedDistributor?._id) return

    const distributorId = selectedDistributor._id

    setAgingLoading(true)
    setChqLoading(true)
    setBookerLoading(true)
    setAgingError(null)
    setChqError(null)
    setBookerError(null)

    // Fire all API calls in parallel, handle errors independently
    const agingPromise = getDataFundtion(
      `/SalesInvoice/InvoiceAging?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&Distrbutor=${distributorId}`
    ).then(res => {
      setAgingData(res.data)
      setAgingLoading(false)
    }).catch(err => {
      console.error('Aging error:', err)
      setAgingError('Failed to load aging data')
      setAgingLoading(false)
    })

    const chqPromise = getDataFundtion(`/customerChq/${distributorId}`)
      .then(res => {
      setChqData(res.data?.data || res.data)
      setChqLoading(false)
    }).catch(err => {
      console.error('Cheque error:', err)
      setChqError('Failed to load cheque data')
      setChqLoading(false)
    })

    const bookerPromise = getDataFundtion(
      `/SalesInvoice/OrderBookerSale?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&Distrbutor=${distributorId}`
    ).then(res => {
      setBookerSalesData({
        bookerSales: Array.isArray(res.data) ? res.data : res,
        orderBookers,
      })
      setBookerLoading(false)
    }).catch(err => {
      console.error('Booker error:', err)
      setBookerError('Failed to load booker sales data')
      setBookerLoading(false)
    })

    await Promise.all([agingPromise, chqPromise, bookerPromise])
  }, [selectedDistributor?._id, dateRange, orderBookers])

  // Initial load
  useEffect(() => {
    getData()
    loadDistributors()
    loadOrderBookers()
    applyPreset('thisMonth')
  }, [getData, loadDistributors, loadOrderBookers, applyPreset])

  // Fetch when distributor or date range changes
  useEffect(() => {
    if (selectedDistributor?._id) {
      fetchAllData()
    }
  }, [selectedDistributor?._id, dateRange, fetchAllData])

  const isDistributorUser = loginuser?.Vendor?.length > 0 && !isAdmin
  const seesAllDistributors = canSeeAllDistributors(loginuser)

  return (
    <div style={{
      padding: '24px',
      background: '#f1f5f9',
      minHeight: '100vh',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      <ToastContainer />

      {/* ===== TOP HEADER ===== */}
      <div style={{
        background: 'white', borderRadius: '16px', padding: '20px 24px',
        marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18" /><path d="M7 16l4-8 4 4 4-6" />
            </svg>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
              Dashboard
            </h1>
            <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '13px' }}>
              {isAdmin || seesAllDistributors ? 'All Distributors' : `TSO - ${loginuser?.firstname || 'User'}`}
            </p>
          </div>
        </div>

        {/* Distributor Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <select
            value={selectedDistributor?._id || ''}
            onChange={(e) => {
              const dist = assignedDistributors.find(d => d._id === e.target.value)
              setSelectedDistributor(dist)
            }}
            style={{
              padding: '8px 14px', borderRadius: '10px', border: '1px solid #e2e8f0',
              fontSize: '13px', background: '#f8fafc', cursor: 'pointer',
              minWidth: '200px', fontWeight: 500, color: '#1e293b',
              outline: 'none'
            }}
          >
            {assignedDistributors.length === 0 && (
              <option value="">No distributors available</option>
            )}
            {assignedDistributors.map(d => (
              <option key={d._id} value={d._id}>
                {d.DistrbutorName} ({d.DistrbutorSystemCode || d.ShortCode || ''})
              </option>
            ))}
          </select>

          {selectedDistributor && (
            <span style={{
              fontSize: '12px', color: '#64748b',
              background: '#f1f5f9', padding: '4px 10px',
              borderRadius: '20px', fontWeight: 500
            }}>
              Code: {selectedDistributor.DistrbutorSystemCode || selectedDistributor.ShortCode || 'N/A'}
            </span>
          )}
        </div>
      </div>

      {/* ===== DATE RANGE PRESETS ===== */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Period:</span>
        {[
          { key: 'thisMonth', label: 'This Month' },
          { key: 'lastMonth', label: 'Last Month' },
          { key: 'last90', label: 'Last 90 Days' },
          { key: 'lastYear', label: 'Last Year' },
        ].map(opt => (
          <button
            key={opt.key}
            onClick={() => applyPreset(opt.key)}
            style={{
              padding: '5px 14px', borderRadius: '20px', border: '1px solid #e2e8f0',
              fontSize: '12px', fontWeight: 500, cursor: 'pointer',
              background: presetRange === opt.key ? '#6366f1' : 'white',
              color: presetRange === opt.key ? 'white' : '#64748b',
              transition: 'all 0.2s'
            }}
          >
            {opt.label}
          </button>
        ))}
        <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '4px' }}>
          {dateRange.startDate} to {dateRange.endDate}
        </span>
      </div>

      {/* ===== DISTRIBUTOR BANNER ===== */}
      {selectedDistributor && (
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '16px', padding: '20px 24px', marginBottom: '20px',
          color: 'white', boxShadow: '0 8px 24px rgba(102,126,234,0.3)'
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '13px', opacity: 0.8, marginBottom: '4px' }}>
                {isDistributorUser ? 'Your Assigned Distributor' : 'Selected Distributor'}
              </div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
                {selectedDistributor.DistrbutorName}
              </h1>
            </div>
            <div style={{ display: 'flex', gap: '24px', textAlign: 'right' }}>
              <div>
                <div style={{ fontSize: '13px', opacity: 0.8 }}>Code</div>
                <div style={{ fontSize: '18px', fontWeight: 600 }}>
                  {selectedDistributor.DistrbutorSystemCode || selectedDistributor.ShortCode || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MAIN CONTENT = THREE SECTIONS ===== */}
      {selectedDistributor ? (
        <>
          {/* Row 1: Invoice Aging + Pending Cheques */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px',
            marginBottom: '20px'
          }}>
            <div>
              <InvoiceAgingTable
                data={agingData}
                loading={agingLoading}
                error={agingError}
                distributorName={selectedDistributor.DistrbutorName}
              />
            </div>
            <div>
              <PendingChequesCard
                data={chqData}
                loading={chqLoading}
                error={chqError}
                distributorName={selectedDistributor.DistrbutorName}
              />
            </div>
          </div>

          {/* Row 2: Booker Sales */}
          <BookerSalesChart
            data={bookerSalesData}
            loading={bookerLoading}
            error={bookerError}
            distributorName={selectedDistributor.DistrbutorName}
          />


        </>
      ) : (
        <div style={{
          background: 'white', borderRadius: '16px', padding: '48px',
          textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <h2 style={{ color: '#0f172a', margin: '0 0 8px 0' }}>Select a Distributor</h2>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            Please select a distributor from the dropdown above to view analytics
          </p>
        </div>
      )}
    </div>
  )
}

export default Dashboard
