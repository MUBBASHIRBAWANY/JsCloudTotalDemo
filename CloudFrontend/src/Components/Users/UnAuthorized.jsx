import React from 'react'
import { useNavigate } from 'react-router-dom'

const UnAuthorized = () => {
  const navigate = useNavigate()

  return (
    <div className="pd-page flex min-h-[70vh] items-center justify-center">
      <div className="pd-card relative max-w-md w-full p-10 text-center">
        <div className="mb-6 flex justify-center">
          <svg
            className="h-16 w-16 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            <circle cx="12" cy="16" r="1" />
          </svg>
        </div>

        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-on-surface-variant">Error 403</p>
        <h1 className="pd-page-title mb-3 text-center">Access Forbidden</h1>

        <p className="mb-8 leading-relaxed text-on-surface-variant">
          You don&apos;t have permission to access this page.
          Please contact your administrator if you believe this is a mistake.
        </p>

        <div className="mb-6 flex flex-wrap justify-center gap-3">
          <button className="pd-btn-save inline-flex items-center gap-2" onClick={() => navigate(-2)}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Go Back
          </button>

          <button className="pd-btn-outline inline-flex items-center gap-2" onClick={() => navigate('/')}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Dashboard
          </button>
        </div>

        <p className="text-sm text-on-surface-variant">
          Need help?{' '}
          <a href="/contact-support" className="font-medium text-primary hover:underline">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  )
}

export default UnAuthorized