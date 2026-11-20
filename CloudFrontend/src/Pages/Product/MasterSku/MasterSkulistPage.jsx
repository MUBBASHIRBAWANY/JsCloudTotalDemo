import React from 'react'
import MasterSkulist from '../../../Components/Product/MasterSku/MasterSkulist'
import { Link } from 'react-router-dom'

const MasterSkulistPage = () => {
  return (
    <>
      <div>
        <Link to='/masterskuadd'>
          <button className='pd-btn-save me-2 mb-2 focus:outline-none w-[5%] mx-5 my-5'>
            Add
          </button>
        </Link>
        <Link to='/BulkMasterPage'>
          <button className='pd-btn-save me-2 mb-2 focus:outline-none w-[8%] mx-5 my-5'>
            Add in Bulk
          </button>
        </Link>
      </div>
      <MasterSkulist />

    </>
  )
}

export default MasterSkulistPage