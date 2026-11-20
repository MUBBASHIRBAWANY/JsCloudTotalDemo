import React from 'react'
import ReactDOM from 'react-dom/client'
import PriceListList from '../../../Components/Distrbutor/PriceList/PriceListList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'
import PushToSND from '../../../Components/Global/PushToSND'
import ActiveSpecialTOReportPopup from './ActiveSpecialTOReportPopup'

const ReportIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 2h6l2 2v10H4z" />
    <path d="M10 2v2h2" />
    <line x1="6.5" y1="8" x2="9.5" y2="8" />
    <line x1="6.5" y1="10.5" x2="9.5" y2="10.5" />
  </svg>
)

const PricelistPage = () => {
  const openActiveSpecialTORepor = () => {
    const popup = window.open('', '', 'width=1300,height=850,left=50,top=50')
    if (!popup) return alert('Popup blocked')

    popup.document.title = 'Active SpecialTO Report'
    popup.document.body.innerHTML = `<div id="popup-root"></div>`

    let attempts = 0
    const interval = setInterval(() => {
      const mountNode = popup.document.getElementById('popup-root')
      if (mountNode) {
        clearInterval(interval)
        const root = ReactDOM.createRoot(mountNode)
        root.render(<ActiveSpecialTOReportPopup />)
        return
      }
      attempts += 1
      if (attempts > 100) {
        clearInterval(interval)
      }
    }, 100)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Price</h2>
        <div className="flex items-center gap-3">
        <AppButton to="/PriceListAdd" variant="outline" icon={<PlusIcon />}>Add</AppButton>
        <AppButton onClick={openActiveSpecialTORepor} variant="outline" icon={<ReportIcon />}>SpecialTO Report</AppButton>
        {/* <PushToSND type="price-list" label="Push to SND" /> */}
        {/* <AppButton to="/PriceListUploadPage" icon={<PlusIcon />}>Bulk Add</AppButton> */}
        </div>
      </div>
      <PriceListList />
    </div>
  )
}

export default PricelistPage

// import React from 'react'
// import PriceListList from '../../../Components/Distrbutor/PriceList/PriceListList'
// import { Link } from 'react-router-dom'

// const PricelistPage = () => {
//   return (

//     <>
//       <div className="my-5 mx-2 flex gap-4">
//         <Link to='/PriceListAdd'>
//           <button className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-6 py-2 focus:outline-none">
//             Add
//           </button>
//         </Link>
//           <Link to='/PriceListUploadPage'>
//           <button className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-6 py-2 focus:outline-none">
//             Bulk Add
//           </button>
//         </Link>
//       </div>
//       <PriceListList />
//     </>
//   )
// }

// export default PricelistPage