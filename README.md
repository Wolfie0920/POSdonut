# POS System (React + Vite + Firebase)

A point-of-sale system for a small donut shop: Products (POS) with receipts, Orders, Remit cash, Sales, Expenses,
Inventory, Recipes, Production, Tax & machine ROI, and Payroll (absences and cash advances deducted automatically).
Roles: **Super admin (owner)** and **Admin (employee)**.

## Run locally
1. `npm install`
2. Create a Firebase project and enable **Authentication (Email/Password)** and **Cloud Firestore**.
3. Copy `.env.example` to `.env` and fill in the Firebase web-app config (all six `VITE_FIREBASE_*` values).
4. Paste `firestore.rules` into Firestore → Rules → **Publish**.
5. Add users in Authentication with the email `<username>@pos.app` (the login box takes just the username).
6. In Firestore create collection `users`, a document whose ID is the user's UID, field `role` = `owner` or `admin`.
7. `npm run dev`

## Deploy to Vercel
1. Push this repository to GitHub (never commit `.env`).
2. On vercel.com: **Add New → Project**, import the repo. Framework: Vite (detected automatically). If the repo root is
   a parent folder, set **Root Directory** to the folder that contains `package.json`.
3. Add the six `VITE_FIREBASE_*` values under **Environment Variables**, then **Deploy**.
4. In Firebase → Authentication → Settings → **Authorized domains**, add your Vercel domain (for example `your-app.vercel.app`).
5. `vercel.json` makes page refreshes on routes such as `/sales` work.

## Structure
`src/components` reusable UI · `src/pages` one file per route · `src/context` auth · `src/hooks/useCollection.js` Firestore CRUD ·
`src/orders.js`, `payroll.js`, `remit.js`, `inventory.js` business logic (atomic Firestore transactions) · `public/products` product photos.

## Team workflow
Work on a branch, open a pull request, and write meaningful commit messages (e.g. `feat(payroll): deduct absences automatically`).
