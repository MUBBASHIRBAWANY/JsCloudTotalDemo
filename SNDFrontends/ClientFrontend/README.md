# Pearl SND — Frontend (Active)

Web frontend of the **Pearl SND** distributor management system. This is the **active /
latest** frontend — it connects to the backend API (`Backend` folder) and provides the
complete dashboard, order booking, invoicing, DSR, stock & reports, and accounts screens.

---

## Tech Stack

- **React 19** + **Vite** (fast build & hot reload)
- **Redux Toolkit / Redux** (state management)
- **React Router** (routing)
- **Tailwind CSS** + **Material UI (MUI)** (UI)
- **react-hook-form**, **react-select**, **react-toastify** (forms, dropdowns, notifications)
- **AG Grid / MUI DataGrid** (data tables)
- **jsPDF**, **XLSX**, **docx** (PDF / Excel / Word exports)

---

## Requirements

- [Node.js](https://nodejs.org/) (v18 or newer)
- npm (comes with Node.js)
- The **Backend** API running (see `Backend/README.md`)

---

## Setup & Run

### 1. Install dependencies

```bash
npm install
```

### 2. Make sure the Backend is running

Start the API first (see `../Backend/README.md`) so the frontend has data to show.
The default API address is `http://localhost:3005/`.

> If your API runs somewhere else, change it in `src/Api/ApiInstance.jsx`.

### 3. Start the development server

```bash
npm run dev
```

Then open the URL shown in the terminal (usually **http://localhost:5173/**).

---

## Available Scripts

| Command                | Description                                    |
|------------------------|------------------------------------------------|
| `npm run dev`          | Start Vite dev server with hot reload          |
| `npm run build`        | Build the app for production (`dist/`)         |
| `npm run preview`      | Preview the production build locally           |
| `npm run lint`         | Run ESLint                                     |
| `npm start`            | Serve the production build (`vite preview`)    |

---

## Main Features / Modules

- **Dashboard** — sales analytics, invoices aging, pending cheques, booker sales
- **Sale Order** — add / edit / list / view sale orders
- **Sales Invoice** — create, bulk add, list, view, print & export invoices
- **Order DC** — delivery challans, stock allocation from orders
- **DSR** — daily sales report: load form selection, RTG, cash/cheque entry, settle
- **Load Form** — load form list & view
- **Purchase Order / Purchase Invoice** — purchases, DC received, returns
- **Transfer In / Out** — stock transfers between locations and stores
- **Reports** — all stock, inventory valuation, stock flow, sales/purchase dump,
  invoice aging, print invoice, general ledger
- **Users & Roles** — user management, roles & rights
- **Accounts** — chart of accounts, vouchers (cash/bank/journal), cheques,
  opening balances
- **Administrative** — year-end procedure

---

## API Configuration

All API calls go through **`src/Api/ApiInstance.jsx`**:

```js
export const api = axios.create({
  baseURL: 'http://localhost:3005/',   // ← backend address
  headers: { 'Content-Type': 'application/json' },
});
```

Change `baseURL` if your backend is hosted elsewhere (e.g. a production URL).

---

## Deployment (Vercel)

The project is ready for [Vercel](https://vercel.com/):

- Build command: `npm run vercel-build` (or `npm run build`)
- Output directory: `dist`
- `vite.config.js` uses `base: './'` so asset paths work on any host/sub-path

> The frontend alone is static — it still needs a reachable backend API for data.

---

## Project Structure

```
src/
├── main.jsx                # App entry point
├── App.jsx                 # Root component
├── Api/
│   ├── ApiInstance.jsx     # Axios instance (backend URL)
│   └── CurdFunctions.jsx   # get / create / update / delete helpers
├── Components/             # Reusable feature components
├── Pages/                  # Route-level pages
├── Redux/
│   ├── Reducers/           # Redux slices / reducers
│   └── Store/store.js      # Redux store
└── utils/
    └── routes.jsx          # All app routes
```
