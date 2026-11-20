import React from 'react'
import DitributorRcAdd from '../Distrbutor/DitributorRc/DitributorRcAdd'

const ProtactedRoute = (name, file) => {
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
  return (
    
   <DitributorRcAdd /> 
  )
}

export default ProtactedRoute
