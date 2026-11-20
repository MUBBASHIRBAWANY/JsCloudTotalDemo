/**
 * ESS Component Tests - Task 17.4
 * Validates Requirements 3.1-3.12
 *
 * NOTE: vi.mock is hoisted above all imports by Vitest, so the factory
 * cannot reference outer-scope variables. We define the mock inline and
 * import the resulting mock object to configure per-test return values.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'

// 1. Mock ApiInstance -- factory must be self-contained (no outer variable refs)
vi.mock('../../../Api/ApiInstance.jsx', () => ({
  default: {
    get:  vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put:  vi.fn().mockResolvedValue({ data: {} }),
    interceptors: { request: { use: vi.fn() } },
  },
}))

// 2. Import the mock so tests can configure return values per test
import apiMock from '../../../Api/ApiInstance.jsx'

// 3. Import slices & pages (they receive the mocked api)
import essReducer from '../../../Redux/Reducers/essSlice.js'
import leaveReducer from '../../../Redux/Reducers/leaveSlice.js'
import ESSDashboardPage from '../ESSDashboardPage.jsx'
import ESSLeaveApplicationPage from '../ESSLeaveApplicationPage.jsx'
import ESSContactPage from '../ESSContactPage.jsx'
import ESSAttendancePage from '../ESSAttendancePage.jsx'

// Helper
function renderWithStore(ui, preloadedState = {}) {
  const store = configureStore({
    reducer: { ess: essReducer, leave: leaveReducer },
    preloadedState,
  })
  return { ...render(<Provider store={store}>{ui}</Provider>), store }
}

// Base states
const baseEss = {
  dashboardSummary: null,
  loading: false,
  error: null,
  payslips: [],
  payslipDetail: null,
  attendanceSummary: [],
  loans: [],
  contactInfo: null,
}

const baseLeave = {
  leaveApplications: [],
  loading: false,
  error: null,
  auditLog: [],
  calendar: [],
}

// ===========================================================================
// Tests 1, 2, 6 -- ESS Dashboard
// ===========================================================================
describe('ESS Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMock.get.mockResolvedValue({ data: {} })
  })

  it('Test 1: renders all four summary sections with correct values', async () => {
    // The component's useEffect dispatches fetchEssDashboard on mount.
    // Make the API return the full dataset so the fulfilled action populates
    // the store with the right values.
    const dashboardPayload = {
      attendance: { present: 20, absent: 2, late: 1 },
      leaveBalances: { casual: 5, medical: 3, annual: 10, unpaid: 0, maternity: 0, paternity: 0 },
      activeLoanBalance: 50000,
      lastPayrollNet: 75000,
    }
    apiMock.get.mockResolvedValueOnce({ data: dashboardPayload })

    renderWithStore(<ESSDashboardPage />, { ess: baseEss })

    // Wait for loading to finish (spinner disappears) and data to render
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })

    expect(screen.getByText('Attendance')).toBeInTheDocument()
    expect(screen.getByText('Leave Balances')).toBeInTheDocument()
    expect(screen.getByText('Active Loan Balance')).toBeInTheDocument()
    expect(screen.getByText('Last Payroll Net')).toBeInTheDocument()

    // The values come from the fulfilled API response stored in Redux
    await waitFor(() => {
      // The MUI Typography renders "Rs. " and the number as separate text nodes,
      // so we use a function matcher that checks the full text content of the element
      const loanEl = screen.getByText((content, el) =>
        el?.tagName === 'H5' && el.textContent.replace(/\s+/g, ' ').trim().includes('Rs. 50,000')
      )
      expect(loanEl).toBeInTheDocument()

      const payrollEl = screen.getByText((content, el) =>
        el?.tagName === 'H5' && el.textContent.replace(/\s+/g, ' ').trim().includes('Rs. 75,000')
      )
      expect(payrollEl).toBeInTheDocument()
    })
  })

  it('Test 2: shows Not yet processed when lastPayrollNet is null', async () => {
    apiMock.get.mockResolvedValueOnce({ data: {} })

    renderWithStore(<ESSDashboardPage />, {
      ess: {
        ...baseEss,
        dashboardSummary: { attendance: {}, leaveBalances: {}, activeLoanBalance: 0, lastPayrollNet: null },
      },
    })

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })

    expect(screen.getByText(/Not yet processed/i)).toBeInTheDocument()
  })

  it('Test 6: shows access-denied text when error has status 403', async () => {
    // Reject the API call so the thunk sets the error in state
    apiMock.get.mockRejectedValueOnce({ response: { data: { status: 403, message: 'Forbidden' } } })

    renderWithStore(<ESSDashboardPage />, {
      ess: {
        ...baseEss,
        loading: false,
        error: { status: 403, message: 'Forbidden' },
        dashboardSummary: null,
      },
    })

    // Wait for any async dispatch to settle
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })

    // Component renders: "Access denied. You are not authorized to view this data."
    expect(screen.getByText(/access denied/i)).toBeInTheDocument()
  })
})

// ===========================================================================
// Tests 3, 4 -- ESS Leave Application Page
// ===========================================================================
describe('ESS Leave Application Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMock.get.mockResolvedValue({ data: [] })
    apiMock.post.mockResolvedValue({ data: {} })
  })

  it('Test 3: shows validation error when end date is before start date', async () => {
    renderWithStore(<ESSLeaveApplicationPage />, { leave: baseLeave })

    // Open the MUI Select (only one combobox on this page)
    const combobox = screen.getByRole('combobox')
    fireEvent.mouseDown(combobox)
    const casualOption = await screen.findByText('Casual Leave')
    fireEvent.click(casualOption)

    // Set dates via the name attribute -- end before start
    const startInput = document.querySelector('input[name="startDate"]')
    const endInput   = document.querySelector('input[name="endDate"]')

    fireEvent.change(startInput, { target: { value: '2024-02-10' } })
    fireEvent.change(endInput,   { target: { value: '2024-02-05' } })

    const submitBtn = screen.getByRole('button', { name: /submit application/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/end date must be on or after start date/i)).toBeInTheDocument()
    })
  })

  it('Test 4: shows balance alert after selecting a leave type', async () => {
    renderWithStore(<ESSLeaveApplicationPage />, {
      leave: {
        ...baseLeave,
        leaveApplications: [
          { _id: '1', leaveType: 'casual', type: 'casual', status: 'approved' },
          { _id: '2', leaveType: 'casual', type: 'casual', status: 'approved' },
        ],
      },
    })

    const combobox = screen.getByRole('combobox')
    fireEvent.mouseDown(combobox)
    const casualOption = await screen.findByText('Casual Leave')
    fireEvent.click(casualOption)

    await waitFor(() => {
      expect(screen.getByText(/balance:/i)).toBeInTheDocument()
    })
  })
})

// ===========================================================================
// Test 5 -- ESS Contact Page: retains values on backend failure
// ===========================================================================
describe('ESS Contact Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Test 5: retains form values and shows error on backend failure', async () => {
    // Simulate PUT rejection
    apiMock.put.mockRejectedValueOnce({ response: { data: { message: 'Server error' } } })

    const user = userEvent.setup()
    renderWithStore(<ESSContactPage />, { ess: baseEss })

    // Use the `name` attribute to uniquely find the phone input (not label, to
    // avoid matching "Emergency Contact Phone" which also contains "phone")
    const phoneInput   = document.querySelector('input[name="phone"]')
    const addressInput = document.querySelector('textarea[name="address"]')

    await user.clear(phoneInput)
    await user.type(phoneInput, '03001234567')
    await user.clear(addressInput)
    await user.type(addressInput, '123 Test St')

    const saveBtn = screen.getByRole('button', { name: /save/i })
    await user.click(saveBtn)

    // Either the generic fallback message or the server's message should appear
    await waitFor(() => {
      const errorEl =
        screen.queryByText(/failed to update contact information/i) ||
        screen.queryByText(/server error/i)
      expect(errorEl).toBeInTheDocument()
    })

    // Form must still retain the entered values
    expect(phoneInput.value).toBe('03001234567')
    expect(addressInput.value).toBe('123 Test St')
  })
})

// ===========================================================================
// Test 7 -- ESS Attendance Page: empty-state after load with no records
// ===========================================================================
describe('ESS Attendance Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Test 7: shows empty-state after load when no records exist', async () => {
    // API returns an empty array; essSlice fulfilled sets attendanceSummary = []
    apiMock.get.mockResolvedValueOnce({ data: [] })

    renderWithStore(<ESSAttendancePage />, {
      ess: { ...baseEss, attendanceSummary: [] },
    })

    // Click Load -- dispatches fetchEssAttendance thunk
    const loadBtn = screen.getByRole('button', { name: /load/i })
    fireEvent.click(loadBtn)

    await waitFor(() => {
      expect(screen.getByText(/no attendance records/i)).toBeInTheDocument()
    })
  })
})
