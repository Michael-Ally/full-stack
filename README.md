# Restaurant POS Authentication System

This project is now organized into a clean frontend/backend/database structure.

## Directory layout

```
web-dev-pbl-main/
├── backend/
│   ├── data/
│   │   └── users.json          # Mock database storage for users
│   ├── node_modules/          # Backend dependencies
│   ├── package.json           # Backend package definition
│   ├── package-lock.json      # Backend lockfile
│   └── server.js              # Express backend API server
│
├── frontend/
│   ├── cart.html
│   ├── cashier-orders.html
│   ├── checkout.html
│   ├── customer-order.html
│   ├── customer-tables.html
│   ├── login.html
│   ├── signup.html
│   ├── report.html
│   ├── main-page.html
│   ├── login-signup.css
│   ├── main-page.css
│   ├── script-cart.js
│   ├── │   ├── │   ├── │   ├── │   ├── │   ��│   ├── │   ├── │  ��─ script-login-signup.js
│   ├── script-main.js
│   └── README.md              # This file
│
└── .gitignore
```

## What changed

- Backend is isolated under `backend/`
- Frontend static files are under `frontend/`
----------------------------------------------------s.json`
- Backend API is served by `backend/server.js`
- Frontend calls the backend through `http://localhost:3000/api`

## Run the backend

```bash
cd /Users/macbookpro/Desktop/web-dev-pbl-main/backend
npm innpm innpm innpm i``

The backend serves:

- `POST /api/signup/send-otp`
- `POST /api/signup/verify-otp`
- `POST /api/login/send-otp`
- `POST /api/login/verify-otp`
- `GET /api/health`
- `GET /api/users` (testing only)

## Run the frontend

```bash
cd /Users/macbookprocd /Users/macbookprocd /Userontcd /Users/macbookpp.server 8000
```

Then open:

- `http://localhost:8000/login.html`
- `http:- `http:- `http:- `http:- `http:- `http:- `http:- `http:- `http:- `http:- `http:- `http:- `http:- `http:- `http:- `http:- `http:- `http:- `http:- `http:- gi- `http:- `http:- `http:- `htck- `http:- `http:- `http:- `http:- `http:- `http:alidati- `http:- `ht is used only for UI and API calls

## Note

The current application still uses a mock OTP system. When you add Twilio later, replace the mock OTP generation in `backend/server.js` with real SMS delivery.
# full-stack
