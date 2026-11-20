# Pearl SND — Backend API

Backend (REST API) of the **Pearl SND** distributor management system. It provides all the
data services (login, products, orders, invoices, stock, reports, vouchers, etc.) used by
the frontend applications.

---

## Tech Stack

- **Node.js** + **Express** (REST API)
- **MongoDB** + **Mongoose** (database)
- **JSON Web Token** (authentication)
- **Cloudinary + Multer** (file/image uploads, optional)
- **Nodemon** (auto-restart during development)

---

## Requirements

- [Node.js](https://nodejs.org/) (v18 or newer)
- A running **MongoDB** database (local or cloud, e.g. MongoDB Atlas)
- npm (comes with Node.js)

---

## Setup & Run

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file inside the **Backend** folder (it is already git-ignored):

```env
PORT=3005
URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>
```

| Variable | Description |
|----------|-------------|
| `PORT`   | Port on which the API server runs (default used: `3005`) |
| `URL`    | MongoDB connection string |

> ⚠️ Never commit the `.env` file. It contains your database credentials.

### 3. Start the server

```bash
npm start
```

The server runs with `nodemon` and will restart automatically when you change code.
Once started you will see:

```
DataBase Conected
Server Runing at 3005
```

API base URL: **http://localhost:3005/** — the frontends are already configured to use it.

---

## Available Scripts

| Command      | Description                                  |
|--------------|----------------------------------------------|
| `npm start`  | Start the API server with nodemon (dev mode) |
| `npm test`   | Placeholder (no tests configured yet)        |

---

## Project Structure

```
Backend/
├── index.js               # Server entry point (Express app + listen)
├── App.js                 # Route mounting / app wiring
├── db/
│   └── db.js              # MongoDB connection
├── Controllar/            # Business logic for each module (API handlers)
├── Modal/                 # Mongoose models (schemas) for each collection
├── Routes/                # Express route definitions per module
├── Midelware/
│   └── CheckRights.js     # Authorization middleware
└── .env                   # Environment config (NOT committed)
```

### Main modules (Routes)

- **Users & Roles** — login, user management, user roles & rights
- **Distributors** — distributor / vendor records
- **Products** — product, brand, category, master SKU, price lists
- **Customers** — clients, channels, zones, regions, territories
- **Sale Order / Sales Invoice** — order booking, invoicing, DSR settlement
- **Purchase Order / Purchase Invoice** — purchase orders & DCs
- **Load Form / DSR** — daily sales reports & load form settlement
- **Transfer In / Out** — stock transfers between locations/stores
- **Stock & Reports** — total products, stock reports, stock flow, aging
- **Accounts** — vouchers (cash, bank, journal), cheques, opening balances
- **Attendance** — order booker attendance

---

## Common API Endpoints

| Method | Endpoint              | Description                     |
|--------|-----------------------|---------------------------------|
| POST   | `/user/login`         | Login                           |
| GET    | `/product`            | All products                    |
| POST   | `/SalesInvoice`       | Create sales invoice + load form|
| POST   | `/SalesInvoice/SattelDsr` | Settle a DSR                  |
| GET    | `/SalesInvoice/StockReport` | Stock flow report data     |
| GET    | `/TotalProduct/:id`   | Stock for a distributor         |

Full list is in `Routes/` — each file maps its module's endpoints.

---

## Notes for Developers

- The frontends call this API at `http://localhost:3005/` (see `src/Api/ApiInstance.jsx`
  in the frontend projects).
- If you change the API port, update the frontend `ApiInstance.jsx` as well.
- For deployment, host this API on any Node-capable platform (VPS, Railway, Render,
  Vercel serverless, etc.) and make sure `URL` points to your production database.
