import React from 'react'
import { Link } from 'react-router-dom'
import DistrbutorList from '../../Components/Distrbutor/DistrbutorList'

const DistrbutorListPage = () => {
  return (
    <>
        {/* Buttons */}
        <div className="my-5 mx-2 flex gap-4">
          <Link to='/DistrbutorAdd'>
            <button className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-6 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800">
              Add
            </button>
          </Link>
        </div>
        <DistrbutorList />
    </>
  )
}

export default DistrbutorListPage