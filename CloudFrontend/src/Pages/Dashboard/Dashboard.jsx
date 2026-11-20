import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchUserRights } from '../../Redux/Reducers/UseRights'
import { toast, ToastContainer } from 'react-toastify'
import { createDataFunction, getDataFundtion } from '../../Api/CRUDFunctions'

import InvestmentReport from '../../Components/Dashboard/InvestmentReport'
import BankBalances from '../../Components/Dashboard/BankBalances'
import { useThemeMode } from '../../theme/ThemeModeContext.jsx'

const Dashboard = () => {
  const dispatch = useDispatch()
  const loginuser = useSelector((state) => state.LoginerReducer.userDetail)
  const { isDark } = useThemeMode()
  const [fillingStore, setFillingStore] = useState(false)
  const isBoss = loginuser?.isBoss === true || loginuser?.isBoss === "true"

  const fillVoucherStore = async () => {
    if (!isBoss) {
      toast.error("Only boss can fill voucher stores")
      return
    }
    const confirmed = window.confirm(
      "Fill store on each client line from that client's sales invoice and distributor invoice?"
    )
    if (!confirmed) return

    setFillingStore(true)
    try {
      const res = await createDataFunction("/Voucher/FillClientStore", {})
      toast.success(res?.message || "Voucher stores updated")
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not update voucher stores")
    } finally {
      setFillingStore(false)
    }
  }

  const getData = async () => {
    try {
      if (!loginuser?.selectRole) return
      const role = await getDataFundtion(`userRole/role/${loginuser.selectRole}`)
      const rights = role?.data?.Roles
      dispatch(fetchUserRights(Array.isArray(rights) ? rights : []))
    } catch {
      toast.error("Something went wrong")
    }
  }

  useEffect(() => {
    getData()
  }, [])

  const today = new Date().toLocaleDateString('en-PK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="pd-page">
      {isBoss ? (
        <>
          {/* Header */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="pd-page-title">Dashboard</h1>
              <p className="-mt-3 text-sm text-on-surface-variant">
                Welcome back, {loginuser.firstname || 'Admin'} — here's your financial overview
              </p>
            </div>
           
          </div>

          {/* Widgets */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="pd-dashboard-card h-full lg:col-span-1">
              <InvestmentReport />
            </div>
            <div className="h-full lg:col-span-2">
              <BankBalances />
            </div>
          </div>
        </>
      ) : (
        <div className="pd-dashboard-card mx-auto max-w-lg p-8 text-center">
          <h1 className="pd-page-title">Dashboard</h1>
          <p className="text-on-surface-variant">
            You don't have access to the executive dashboard.
          </p>
        </div>
      )}
      <ToastContainer theme={isDark ? 'dark' : 'light'} />
    </div>
  )
}

export default Dashboard