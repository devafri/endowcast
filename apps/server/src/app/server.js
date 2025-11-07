const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Load environment variables - .env for local dev
require('dotenv').config();

const authRoutes = require('../features/auth/routes/auth');
const userRoutes = require('../features/users/routes/users');
const simulationRoutes = require('../features/simulations/routes/simulations');
const contactRoutes = require('../features/notifications/routes/contact');
const paymentRoutes = require('../features/billing/routes/payments');
const webhookRoutes = require('../features/billing/routes/webhooks');
const subscriptionRoutes = require('../features/billing/routes/subscription');
const invoiceRoutes = require('../features/billing/routes/invoices');
const organizationRoutes = require('../features/organizations/routes/organization');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Railway's load balancer
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration (allow prod and common local dev origins)
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  'https://endowcast.com',
  'https://www.endowcast.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests or same-origin
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`CORS blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parsing middleware
// For Stripe webhooks we need the raw body to verify signatures
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use('/api/billing/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/simulations', simulationRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/billing', paymentRoutes); // Mount payment routes at /api/billing
app.use('/api/payments', paymentRoutes); // Keep legacy path for compatibility
app.use('/api/invoices', invoiceRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/billing/webhooks', webhookRoutes); // Add this for the correct path

// 404 handler for any remaining routes
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: err.message 
    });
  }
  
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ 
      error: 'Invalid token' 
    });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

app.listen(PORT, () => {
  console.log(`🚀 EndowCast API server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
});

// Add process event handlers for debugging
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT received, shutting down gracefully');
  process.exit(0);
});
