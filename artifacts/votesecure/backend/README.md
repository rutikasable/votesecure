# VoteSecure Backend API

Secure RESTful API backend for VoteSecure online voting platform built with Node.js, Express, MySQL, JWT, and bcrypt.

## Folder Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── db.js          # MySQL connection pool & automatic table initialization
│   │   └── seed.js        # Database seeder for demo elections, candidates, & accounts
│   ├── controllers/
│   │   ├── authController.js       # Register, login, profile authentication
│   │   ├── electionController.js   # Election CRUD & status computation
│   │   ├── candidateController.js  # Candidate management
│   │   ├── voteController.js       # Double-vote prevention, cryptographic receipts, tally
│   │   └── voterController.js      # Voter directory & admin statistics
│   ├── middleware/
│   │   ├── auth.js         # JWT verification & role authorization (voter/admin)
│   │   └── errorHandler.js # Global error handler & 404 handler
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── electionRoutes.js
│   │   ├── candidateRoutes.js
│   │   ├── voteRoutes.js
│   │   └── voterRoutes.js
│   └── server.js           # Main Express server entry point
├── .env                    # Environment variables (MySQL credentials, JWT secret)
├── .env.example
├── .gitignore
├── package.json
└── package-lock.json
```

## Quick Start

### 1. Configure Environment
Update [backend/.env](file:///c:/Users/dell/Desktop/VoteSecure/artifacts/votesecure/backend/.env) with your MySQL credentials:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=votesecure_db
JWT_SECRET=your_jwt_secret_key_here
CLIENT_URL=http://localhost:5173
```

### 2. Seed Sample Data (Optional)
```powershell
npm run seed
```
Default accounts created by seeder:
- **Admin**: `admin@votesecure.org` / `admin123`
- **Voter**: `avery@example.org` / `voter123`

### 3. Start the Server
```powershell
# Development mode with auto-reload (nodemon)
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new voter account
- `POST /api/auth/login` — Sign in (voter or admin)
- `GET /api/auth/me` — Get current user profile and voting records (Bearer token required)

### Elections (`/api/elections`)
- `GET /api/elections` — List all elections with stats & participation status
- `GET /api/elections/:id` — Get election details and candidate list
- `POST /api/elections` — Create election (*Admin only*)
- `PUT /api/elections/:id` — Update election (*Admin only*)
- `DELETE /api/elections/:id` — Delete election (*Admin only*)

### Candidates (`/api/candidates`)
- `GET /api/candidates` — List all candidates
- `GET /api/candidates/election/:electionId` — Get candidates for a specific election
- `POST /api/candidates` — Add candidate (*Admin only*)
- `PUT /api/candidates/:id` — Update candidate (*Admin only*)
- `DELETE /api/candidates/:id` — Delete candidate (*Admin only*)

### Voting & Results (`/api/votes`)
- `POST /api/votes/cast` — Cast a ballot (Authenticated, prevents double voting, issues cryptographic receipt)
- `GET /api/votes/results/:electionId` — Get real-time vote counts and candidate percentages
- `GET /api/votes/my-votes` — View voter's past voting activity & receipts
- `GET /api/votes/verify/:receiptCode` — Public receipt code verification

### Voters & Stewardship (`/api/voters`)
- `GET /api/voters` — List registered voters and participation status (*Admin only*)
- `GET /api/voters/stats` — Dashboard summary metrics (*Admin only*)
- `GET /api/voters/activities` — Recent civic activity feed
