# Supermarket Management Frontend

Phase 1 Step 2 frontend built with Vite, React, React Router DOM, and Axios.

## Setup

```bash
npm install
copy .env.example .env
npm run dev
```

The frontend calls the backend through:

```env
VITE_API_URL=https://your-render-backend.onrender.com/api
```

## Routes

- `/login` - login page
- `/dashboard` - protected dashboard
- `/users` - admin menu page
- `/settings` - admin menu page
- `/reports` - manager/accountant menu page
- `/inventory` - manager/stock keeper menu page
- `/pos` - cashier menu page
- `/sales` - cashier menu page
- `/products` - stock keeper menu page
- `/stock-alerts` - stock keeper menu page
- `/expenses` - accountant menu page
- `/payments` - accountant menu page

## Auth Rules

- JWT token is stored in `localStorage`.
- User details are stored in `localStorage`.
- Protected routes redirect unauthenticated users to `/login`.
- Logout clears local storage and redirects to `/login`.
- Sidebar items are based on the logged-in user's role.
