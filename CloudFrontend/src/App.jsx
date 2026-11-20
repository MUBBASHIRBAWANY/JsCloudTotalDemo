import React, { useEffect } from 'react'
import SIdebar from './Components/Sidebar/SIdebar.jsx'
import { Route, Routes } from 'react-router-dom'
import OpensideBar from './Components/Sidebar/OpensideBar.jsx'
import Header from './Components/Headers/Header.jsx'
import { useSelector } from 'react-redux'
import routes from './utils/routes.jsx'
import Login from './Components/Users/Login/Login.jsx'
import { LOGGED_OUT_KEY } from './utils/authSession.js'

// Catches render errors so the whole app doesn't go blank — shows a friendly
// reload screen instead.
class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full items-center justify-center p-8">
          <div className="pd-card max-w-md p-6 text-center">
            <h2 className="mb-2 text-lg font-semibold pd-text-body">Something went wrong</h2>
            <p className="mb-4 text-sm pd-text-muted">This page could not be loaded. Please try again.</p>
            <button
              type="button"
              className="pd-btn-save"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const App = () => {
  const login = useSelector((state) => state.LoginerReducer.state)
  const SidebarOpen = useSelector((state) => state.isSideBar.state)

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Enter') {
        const formElements = Array.from(document.querySelectorAll('input, select, textarea, button, [tabindex]:not([tabindex="-1"])'))
          .filter(el => !el.disabled && el.tabIndex >= 0 && el.offsetParent !== null)

        const index = formElements.indexOf(document.activeElement)

        if (index > -1 && index < formElements.length - 1) {
          event.preventDefault()
          formElements[index + 1].focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === LOGGED_OUT_KEY && event.newValue) {
        window.location.replace('/')
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return (
    <div>
      {!login ? <Login /> : (
        <div className="flex h-screen overflow-hidden bg-background">
          <div
            className={`fixed inset-y-0 left-0 z-50 lg:static lg:z-auto ${SidebarOpen ? 'block' : 'hidden'} lg:block`}
          >
            <SIdebar />
          </div>

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto bg-background">
              <RouteErrorBoundary>
                <Routes>
                  {routes.map((item) => (
                    <Route key={item.path} path={item.path} element={item.component} />
                  ))}
                </Routes>
              </RouteErrorBoundary>
            </main>
          </div>

          <OpensideBar />
        </div>
      )}
    </div>
  )
}

export default App