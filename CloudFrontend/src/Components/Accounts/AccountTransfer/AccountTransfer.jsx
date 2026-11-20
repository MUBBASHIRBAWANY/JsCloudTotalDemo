import React, { useState, useEffect } from 'react'
import { ToastContainer, toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import AppSelect from '../../Global/AppSelect.jsx'
import { getDataFundtion, createDataFunction } from '../../../Api/CRUDFunctions'

const AccountTransfer = () => {
  const navigate = useNavigate()
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)

  const [accountFrom, setAccountFrom] = useState(null)
  const [accountTo, setAccountTo] = useState(null)
  const [transferType, setTransferType] = useState(null)
  const [selectedEntity, setSelectedEntity] = useState(null)

  const [allAccounts, setAllAccounts] = useState([])
  const [clients, setClients] = useState([])
  const [transporters, setTransporters] = useState([])
  const [loading, setLoading] = useState(false)

  const transferTypeOptions = [
    { label: 'Client', value: 'client' },
    { label: 'Transporter', value: 'transporter' }
  ]

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [accountsData, clientsData, transportersData] = await Promise.all([
        getDataFundtion('/ChartofAccounts/Stage4'),
        getDataFundtion('/customer'),
        getDataFundtion('/Transport')
      ])
      setAllAccounts(accountsData.data || [])
      setClients(clientsData.data || [])
      setTransporters(transportersData.data || [])
    } catch (error) {
      toast.error('Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const getAccountOptions = () => {
    return allAccounts.map((item) => ({
      label: `${item.AccountName} - ${item.AccountCode}`,
      value: item._id
    }))
  }

  const getClientOptions = () => {
    return clients.map((item) => ({
      label: `${item.ClientName || item.Name || ''} - ${item.ClientCode || item.Code || ''}`,
      value: item._id
    }))
  }

  const getTransporterOptions = () => {
    return transporters.map((item) => ({
      label: `${item.TransporterName || item.Name || ''} - ${item.TransporterCode || item.Code || ''}`,
      value: item._id
    }))
  }

  const getEntityOptions = () => {
    if (transferType === 'client') return getClientOptions()
    if (transferType === 'transporter') return getTransporterOptions()
    return []
  }

  const handleTransferTypeChange = (selected) => {
    setTransferType(selected?.value || null)
    setSelectedEntity(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!accountFrom) {
      toast.error('Please select Account From')
      return
    }
    if (!accountTo) {
      toast.error('Please select Account To')
      return
    }
    if (accountFrom === accountTo) {
      toast.error('Account From and Account To cannot be same')
      return
    }
    if (transferType && !selectedEntity) {
      toast.error(`Please select ${transferType === 'client' ? 'Client' : 'Transporter'}`)
      return
    }

    const payload = {
      AccountFrom: accountFrom,
      AccountTo: accountTo
    }

    if (transferType === 'client' && selectedEntity) {
      payload.Client = selectedEntity
    } else if (transferType === 'transporter' && selectedEntity) {
      payload.Transporter = selectedEntity
    }

    setLoading(true)
    try {
      console.log(payload)
      await createDataFunction('/AccountTransfer', payload)
      toast.success('Account transferred successfully')
      setAccountFrom(null)
      setAccountTo(null)
      setTransferType(null)
      setSelectedEntity(null)
    } catch (error) {
      toast.error('Failed to transfer account')
    } finally {
      setLoading(false)
    }
  }

  const accountOptions = getAccountOptions()
  const entityOptions = getEntityOptions()

  return (
    <div>
      <h1 className="pd-page-title text-center mb-6">Account Transfer</h1>
      <ToastContainer />

      <div className="w-full">
        <form
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pd-card p-6 mb-6"
          onSubmit={handleSubmit}
        >
          {/* 1. Account From */}
          <div>
            <label className="block pd-text-body font-semibold mb-2">
              Account From <span className="text-red-500">*</span>
            </label>
            <AppSelect
              options={accountOptions.filter((opt) => opt.value !== accountTo)}
              value={accountOptions.find((opt) => opt.value === accountFrom)}
              onChange={(selected) => setAccountFrom(selected?.value || null)}
              placeholder="Select Account From"
              isLoading={loading}
            />
          </div>

          {/* 2. Account To */}
          <div>
            <label className="block pd-text-body font-semibold mb-2">
              Account To <span className="text-red-500">*</span>
            </label>
            <AppSelect
              options={accountOptions.filter((opt) => opt.value !== accountFrom)}
              value={accountOptions.find((opt) => opt.value === accountTo)}
              onChange={(selected) => setAccountTo(selected?.value || null)}
              placeholder="Select Account To"
              isLoading={loading}
            />
          </div>

          {/* 3. Transfer Client or Transporter (Optional) */}
          <div>
            <label className="block pd-text-body font-semibold mb-2">
              Transfer Type <span className="text-gray-400 text-sm font-normal">(Optional)</span>
            </label>
            <AppSelect
              options={transferTypeOptions}
              value={transferTypeOptions.find((opt) => opt.value === transferType)}
              onChange={handleTransferTypeChange}
              placeholder="Select Type"
              isClearable
            />
          </div>

          {/* 4. Select Client or Transporter */}
          <div>
            <label className="block pd-text-body font-semibold mb-2">
              {transferType === 'client' && 'Select Client'}
              {transferType === 'transporter' && 'Select Transporter'}
              {!transferType && 'Select Entity'}
              {transferType && <span className="text-red-500"> *</span>}
            </label>
            <AppSelect
              options={entityOptions}
              value={entityOptions.find((opt) => opt.value === selectedEntity)}
              onChange={(selected) => setSelectedEntity(selected?.value || null)}
              placeholder={
                transferType === 'client' ? 'Select Client' :
                transferType === 'transporter' ? 'Select Transporter' :
                'Select Client/Transporter'
              }
              isDisabled={!transferType}
              isLoading={loading}
            />
          </div>

          {/* 5. Transfer Button */}
          <div className="col-span-1 md:col-span-2 lg:col-span-4 flex justify-end">
            <button
              type="submit"
              className="pd-btn-save"
              disabled={loading}
            >
              {loading ? 'Transferring...' : 'Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AccountTransfer
