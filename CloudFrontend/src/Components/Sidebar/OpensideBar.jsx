import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { toggle } from '../../Redux/Reducers/sidebarReducer'

const OpensideBar = () => {
  const SidebarOpen =  useSelector((state)=> state.isSideBar.state)
  const dispatch = useDispatch()
  const offsidebar = () => {
    dispatch(toggle())
  };
  return (
    <div>
      
    {/* Overlay for mobile */}
    {SidebarOpen && (
      <div
        onClick={offsidebar}
        className="fixed inset-0 z-40 bg-[var(--pd-on-surface)]/40 backdrop-blur-[2px] lg:hidden"
      ></div>
    )}
    </div>
  )
}

export default OpensideBar