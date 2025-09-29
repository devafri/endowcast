# EndowCast Backend Setup

## Prerequisites

- Node.js 16+ installed
- PostgreSQL database (local or cloud)

## Quick Setup

1. **Install dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your database credentials:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/endowcast_dev"
   JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
   ```

3. **Set up the database:**
   ```bash
   # Generate Prisma client
   npm run generate
   
   # Run database migrations
   npm run migrate
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

The API server will be running on `http://localhost:3001`

## Database Setup Options

### Option 1: Local PostgreSQL
1. Install PostgreSQL locally
2. Create a database: `createdb endowcast_dev`
3. Update DATABASE_URL in .env

### Option 2: Cloud Database (Recommended for production)
- **Neon**: Free tier with PostgreSQL
- **PlanetScale**: MySQL-compatible
- **Supabase**: PostgreSQL with additional features
- **Railway**: PostgreSQL hosting

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login  
- `POST /api/auth/verify-token` - Verify JWT token

### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/usage` - Get usage statistics

### Simulations
- `GET /api/simulations` - List user simulations
- `POST /api/simulations` - Create new simulation
- `GET /api/simulations/:id` - Get simulation details
- `PUT /api/simulations/:id` - Update simulation
- `DELETE /api/simulations/:id` - Delete simulation
- `POST /api/simulations/:id/run` - Save simulation results

## Database Schema

The database includes these main tables:
- **users**: User accounts with subscription info
- **simulations**: Monte Carlo simulation parameters and results
- **portfolios**: Asset allocation configurations
- **sessions**: JWT token management (optional)

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Rate limiting
- Input validation
- CORS protection
- Helmet security headers

## Deployment Considerations

1. **Environment Variables**: Set production values for JWT_SECRET, DATABASE_URL
2. **Database**: Use connection pooling for production
3. **Security**: Enable HTTPS, set secure headers
4. **Monitoring**: Add logging and error tracking
5. **Scaling**: Consider load balancing for multiple instances
