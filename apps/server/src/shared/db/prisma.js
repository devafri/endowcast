// Ensure prepared statements are disabled when connecting through a pooled proxy
// (Supabase pooler / PgBouncer) to avoid "prepared statement \"s0\" already exists" errors.
// Setting the env var here guarantees it's present before PrismaClient is constructed.
if (!process.env.PRISMA_DISABLE_PREPARED_STATEMENTS) {
	process.env.PRISMA_DISABLE_PREPARED_STATEMENTS = 'true';
}

// Ensure environment variables from .env are loaded when this module is required
try {
	require('dotenv').config();
} catch (e) {
	// ignore if dotenv is not available or already loaded
}

// Prefer a non-pooling direct URL for Prisma if available to avoid pooler/prepared-statement issues.
// For example, Vercel env may provide DATABASE_POSTGRES_URL_NON_POOLING for direct port 5432.
if (!process.env.DATABASE_POSTGRES_PRISMA_URL) {
	if (process.env.DATABASE_POSTGRES_URL_NON_POOLING) {
		process.env.DATABASE_POSTGRES_PRISMA_URL = process.env.DATABASE_POSTGRES_URL_NON_POOLING;
	} else if (process.env.DATABASE_URL) {
		process.env.DATABASE_POSTGRES_PRISMA_URL = process.env.DATABASE_URL;
	}
}

// Diagnostic: log which DB URL variant we're using (mask password)
try {
	const url = process.env.DATABASE_POSTGRES_PRISMA_URL || '<none>';
	const masked = url.replace(/:(?:[^:@]+)@/, ':****@');
	console.log(`[prisma] using DATABASE_POSTGRES_PRISMA_URL=${masked}`);
} catch (e) {
	// ignore
}

// When using a connection pooler like PgBouncer, Prisma's prepared statements can collide.
// Disable Prisma prepared statements by default for pooled connections.
if (!process.env.PRISMA_DISABLE_PREPARED_STATEMENTS) {
	process.env.PRISMA_DISABLE_PREPARED_STATEMENTS = 'true';
}

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = prisma;
