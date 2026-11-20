import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { open } from '../../Redux/Reducers/sidebarReducer'
import ThemeToggle from '../Global/ThemeToggle.jsx'

const Header = () => {
  const dispatch = useDispatch()
  const LoginerVendor = useSelector((state) => state.LoginerReducer.userDetail)

  const toggleSidebar = () => {
    dispatch(open())
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--pd-border-card)] bg-surface-container-lowest px-4 md:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="rounded-md p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 lg:hidden"
          aria-label="Open menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>

        <div className="hidden sm:block">
          <p className="text-xs font-mono uppercase tracking-widest text-on-surface-variant">Workspace</p>
          <h1 className="text-base font-semibold text-on-surface leading-tight">
            Pearl <span className="font-normal text-primary">Dynamic</span>
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />

        <button
          className="relative rounded-md p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
          aria-label="Notifications"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-secondary" />
        </button>

        <div className="flex items-center gap-2.5 rounded-md border border-[var(--pd-border-card)] bg-surface-container-low px-2.5 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary">
            {LoginerVendor?.firstname?.charAt(0) || 'U'}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium leading-tight text-on-surface">{LoginerVendor?.firstname || 'User'}</p>
            <p className="text-xs text-on-surface-variant">{LoginerVendor?.lastname || 'Distributor'}</p>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header