# Backend CBT - Express.js API

Backend application untuk sistem CBT (Computer-Based Test) yang dibangun dengan Express.js dan PostgreSQL (Supabase).

## 📁 Struktur Project

```
back_end_cbt/
├── src/
│   ├── config/          # File konfigurasi (database, dll)
│   ├── controllers/     # Controller untuk route (business logic)
│   ├── models/          # Model data
│   ├── routes/          # Route API
│   ├── middleware/      # Custom middleware
│   ├── services/        # Business logic services
│   └── utils/           # Utility functions
├── public/              # File statis
├── tests/               # File testing
├── server.js            # Entry point aplikasi
├── .env                 # Environment variables
└── package.json         # Dependencies dan scripts
```

## 🚀 Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Konfigurasi Environment Variables

File `.env` sudah dibuat dengan konfigurasi Supabase. Pastikan untuk mengganti `JWT_SECRET`:

```env
DATABASE_URL=postgresql://postgres:12345678@db.xlfnbivjavdysywkooyx.supabase.co:5432/postgres
PORT=3000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key_here_please_change_this
JWT_EXPIRES_IN=7d
API_BASE_URL=/api
```

### 3. Jalankan Server

**Development Mode** (with auto-reload):
```bash
npm run dev
```

**Production Mode**:
```bash
npm start
```

Server akan berjalan di `http://localhost:3000`

## 📚 Available Scripts

- `npm start` - Jalankan production server
- `npm run dev` - Jalankan development server dengan nodemon (auto-reload)
- `npm test` - Jalankan tests

## 🔌 API Endpoints

### Health Check
- `GET /health` - Cek status server

**Response:**
```json
{
  "status": "OK",
  "message": "Server is running"
}
```

## 💾 Database Configuration

Project ini menggunakan **Supabase PostgreSQL** dengan library `postgres` (bukan pg). 

### Contoh Penggunaan Database:

```javascript
import sql from './config/database.js';

// Query sederhana
const users = await sql`SELECT * FROM users`;

// Query dengan parameter (SQL injection safe)
const user = await sql`SELECT * FROM users WHERE id = ${userId}`;

// Insert
const [newUser] = await sql`
  INSERT INTO users (name, email)
  VALUES (${name}, ${email})
  RETURNING *
`;

// Update
await sql`
  UPDATE users 
  SET name = ${name} 
  WHERE id = ${id}
`;

// Delete
await sql`DELETE FROM users WHERE id = ${id}`;
```

Lihat `src/services/userService.js` untuk contoh lengkap operasi CRUD.

## 🔐 Authentication

Project ini sudah include middleware untuk JWT authentication:

```javascript
import { protect } from './middleware/authMiddleware.js';

// Gunakan middleware protect untuk route yang memerlukan autentikasi
router.get('/protected', protect, (req, res) => {
  // req.user akan berisi data user dari JWT token
  res.json({ user: req.user });
});
```

## 📝 Struktur ES6 Modules

Project ini menggunakan **ES6 Modules** (`import/export`), bukan CommonJS (`require/module.exports`).

**Import:**
```javascript
import express from 'express';
import sql from './config/database.js';
```

**Export:**
```javascript
export default myFunction;
export { namedExport1, namedExport2 };
```

> **⚠️ PENTING:** Saat import file lokal, selalu gunakan ekstensi `.js`:
> ```javascript
> import userService from './services/userService.js'; // ✅ Benar
> import userService from './services/userService';    // ❌ Salah
> ```

## 🛠️ Technology Stack

- **Runtime:** Node.js
- **Framework:** Express.js v5
- **Database:** PostgreSQL (Supabase)
- **Database Client:** postgres (bukan pg)
- **Authentication:** JWT (jsonwebtoken)
- **Environment:** dotenv
- **CORS:** cors

## 📦 Dependencies

```json
{
  "cors": "^2.8.5",
  "dotenv": "^17.2.3",
  "express": "^5.2.1",
  "jsonwebtoken": "^9.0.2",
  "postgres": "^3.4.7"
}
```

## 🧪 Testing

Server sudah ditest dan berjalan dengan baik:
- ✅ Server starts successfully on port 3000
- ✅ Health check endpoint returns 200 OK
- ✅ Database connection configured
- ✅ CORS enabled
- ✅ JSON parsing enabled

## 📖 Next Steps

1. Buat table di Supabase sesuai kebutuhan
2. Buat routes untuk endpoint API Anda
3. Buat controllers untuk handle business logic
4. Buat services untuk database operations
5. Tambahkan validation middleware
6. Implementasi authentication endpoints

## 📄 License

ISC
