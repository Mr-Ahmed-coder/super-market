# Supermarket Management Backend

Phase 1 backend built with Node.js, Express.js, MongoDB, and Mongoose.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Set your MongoDB Atlas URI in the environment:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
```

## Auth Endpoints

### Register

`POST /api/auth/register`

```json
{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "password123",
  "role": "admin"
}
```

### Login

`POST /api/auth/login`

```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

### Current User

`GET /api/users/me`

Send the JWT as:

```http
Authorization: Bearer <token>
```

## Roles

- `admin`
- `manager`
- `cashier`
- `stock_keeper`
- `accountant`

## Rules Implemented

- Users are soft-deleted with `isDeleted`.
- Login is blocked for inactive, locked, or deleted users.
- Passwords are hashed before saving.
- JWT payload stores the user id and role.
- Protected routes use JWT authentication.
- Role-based middleware restricts privileged actions.
