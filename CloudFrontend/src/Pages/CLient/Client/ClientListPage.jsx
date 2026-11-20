import React, { useRef, useState } from 'react'
import { toast } from 'react-toastify'
import ClientList from '../../../Components/Client/Client/ClientList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'
import { createDataFunction } from '../../../Api/CRUDFunctions'

const DownloadIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2v8" />
    <path d="M5 7l3 3 3-3" />
    <path d="M3 13h10" />
  </svg>
)

const ClientListPage = () => {
  const excelRef = useRef(null)
  const [syncing, setSyncing] = useState(false)

  const setStoreFromFirstInvoice = async () => {
    if (syncing) return
    const confirmed = window.confirm('Har customer ki pehli sales invoice ka store us customer par save ho jayega. Continue?')
    if (!confirmed) return
    setSyncing(true)
    try {
      const result = await createDataFunction('/customer/syncStoreFromFirstInvoice', {})
      const updated = result?.updated ?? 0
      const skipped = result?.skipped ?? 0
      toast.success(`Store set on ${updated} customers. ${skipped} had no matching invoice.`)
    } catch (error) {
      console.error(error)
      toast.error('Customer store could not be set')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Clients</h2>
        <div className="flex items-center gap-3">
          <AppButton variant="outline" onClick={setStoreFromFirstInvoice}>
            {syncing ? 'Setting Store...' : 'Set Store'}
          </AppButton>
          <AppButton variant="outline" icon={<DownloadIcon />} onClick={() => excelRef.current?.()}>
            Download Excel
          </AppButton>
          <AppButton to="/Clientadd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
          <AppButton to="/ClientBulkAdd" icon={<PlusIcon />}>
            Add in Bulk
          </AppButton>
          <AppButton to="/BulkClientUpdate" icon={<PlusIcon />}>
            Update in Bulk
          </AppButton>
        </div>
      </div>
      <ClientList excelRef={excelRef} />
    </div>
  )
}

export default ClientListPage