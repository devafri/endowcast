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

// Normalize database URL env vars: strip surrounding quotes and trim whitespace.
// Some CI / deploy systems (or accidental edits) may wrap the URL in quotes which
// can cause Prisma to complain that the URL doesn't start with postgres://.
function normalizeEnvUrl(key) {
	const v = process.env[key];
	if (!v || typeof v !== 'string') return;
	const trimmed = v.trim();
	// Remove surrounding single or double quotes
	const unquoted = trimmed.replace(/^['"]|['"]$/g, '');
	if (unquoted !== v) {
		process.env[key] = unquoted;
		console.log(`[prisma] normalized env ${key}`);
	}
}

['DATABASE_POSTGRES_PRISMA_URL', 'DATABASE_POSTGRES_URL_NON_POOLING', 'DATABASE_POSTGRES_URL', 'DATABASE_URL'].forEach(normalizeEnvUrl);

// Build an effective connection URL, preferring a non-pooling URL when available.
function buildEffectiveDbUrl() {
	let url = process.env.DATABASE_POSTGRES_PRISMA_URL
		|| process.env.DATABASE_POSTGRES_URL_NON_POOLING
		|| process.env.DATABASE_POSTGRES_URL
		|| process.env.DATABASE_URL
		|| '';

	// Fix accidental double prefix like "DATABASE_URL=postgres..." in the value
	if (url.startsWith('DATABASE_URL=')) {
		url = url.replace(/^DATABASE_URL=/, '');
	}

	// If using a Supabase pooler host, ensure pgbouncer=true to disable prepared statements
	const isPooler = /pooler\.supabase\.com/.test(url);
	if (isPooler && !/([?&])pgbouncer=true/.test(url)) {
		url += (url.includes('?') ? '&' : '?') + 'pgbouncer=true';
	}
	return url;
}

const EFFECTIVE_DB_URL = buildEffectiveDbUrl();
process.env.DATABASE_POSTGRES_PRISMA_URL = EFFECTIVE_DB_URL;

// Diagnostic: log which DB URL variant we're using (mask password)
try {
	const url = EFFECTIVE_DB_URL || '<none>';
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

// Always instantiate Prisma with the effective URL so we don't depend on external env timing
const prisma = new PrismaClient({
	datasources: {
		db: {
			url: EFFECTIVE_DB_URL,
		}
	}
});

module.exports = prisma;
