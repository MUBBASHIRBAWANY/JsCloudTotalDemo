# Pearl SND — Frontend (MasterFrontENd)

Web frontend of the **Pearl SND** distributor management system.

> ℹ️ **Note:** This folder is an **older / secondary copy** of the frontend. The
> **active** frontend lives in the `PearlSNDClinet` folder — prefer using that one.
> This copy is kept for reference / rollback and is not the one receiving new updates.

---

## Tech Stack

- **React 19** + **Vite** (fast build & hot reload)
- **Redux Toolkit / Redux** (state management)
- **React Router** (routing)
- **Tailwind CSS** + **Material UI (MUI)** (UI)
- **react-hook-form**, **react-select**, **react-toastify**
- **AG Grid / MUI DataGrid** (data tables)
- **jsPDF**, **XLSX**, **docx**, **exceljs** (exports)

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

Start the API first (see `../Backend/README.md`). The default API address is
`http://localhost:3005/` — change it in `src/Api/ApiInstance.jsx` if needed.

### 3. Start the development server

```bash
npm run dev
```

Open the URL shown in the terminal (usually **http://localhost:5173/**).

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
- **Sale Order / Sales Invoice** — order booking, invoicing, print & export
- **Order DC** — delivery challans, stock allocation
- **DSR** — daily sales report & settlement
- **Load Form** — load form list & view
- **Purchase Order / Purchase Invoice** — purchases, DC received, returns
- **Transfer In / Out** — stock transfers
- **Reports** — stock, inventory valuation, stock flow, sales/purchase dump,
  invoice aging, print invoice
- **Users & Roles** — user management, roles & rights
- **Accounts** — chart of accounts, vouchers, cheques, opening balances

---

## API Configuration

All API calls go through **`src/Api/ApiInstance.jsx`**:

```js
export const api = axios.create({
  baseURL: 'http://localhost:3005/',   // ← backend address
  headers: { 'Content-Type': 'application/json' },
});
```

---

## Deployment (Vercel)

- Build command: `npm run vercel-build` (or `npm run build`)
- Output directory: `dist`
- `vite.config.js` uses `base: './'` for portable asset paths

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
├── Redux/                  # Redux reducers & store
└── utils/
    └── routes.jsx          # All app routes
```
