#!/usr/bin/env node
/**
 * Backfill summary percentiles for existing simulations.
 *
 * Usage:
 *   NODE_ENV=production DATABASE_POSTGRES_PRISMA_URL="postgres://..." node scripts/backfill-summaries.js --dry
 *   NODE_ENV=production DATABASE_POSTGRES_PRISMA_URL="postgres://..." node scripts/backfill-summaries.js
 *
 * The script finds simulations where `summary` is missing the new percentile
 * fields (annualizedReturn10/25/75/90, annualizedVolatility10/25/75/90,
 * sharpe10/25/75/90, sortino10/25/75/90) and recomputes them from stored
 * `results` (which contains `portfolioReturns` and `finalValues`/`finals`).
 *
 * It is safe to run multiple times; already-complete records are skipped.
 */

const { PrismaClient } = require('@prisma/client');
// Minimal argv parser to avoid adding extra deps in scripts
const rawArgs = process.argv.slice(2);
const argv = { _: [] };
for (let i = 0; i < rawArgs.length; i++) {
  const a = rawArgs[i];
  if (a === '--dry') { argv.dry = true; continue; }
  if (a.startsWith('--limit=')) { argv.limit = Number(a.split('=')[1]); continue; }
  if (a === '--limit') { argv.limit = Number(rawArgs[++i]); continue; }
  argv._.push(a);
}

// Helpful fallback: if Prisma env var isn't populated, try common alternative env names
// This lets the script work when developers use DATABASE_URL or other names in .env files.
if (!process.env.DATABASE_POSTGRES_PRISMA_URL || process.env.DATABASE_POSTGRES_PRISMA_URL.length === 0) {
  const candidates = ['DATABASE_URL', 'DATABASE_POSTGRES_URL', 'POSTGRES_URL', 'PGDATABASE_URL'];
  for (const c of candidates) {
    if (process.env[c] && process.env[c].length > 0) {
      process.env.DATABASE_POSTGRES_PRISMA_URL = process.env[c];
      console.log(`Using ${c} for Prisma (mapped to DATABASE_POSTGRES_PRISMA_URL)`);
      break;
    }
  }
}

function percentile(arr = [], p) {
  if (!Array.isArray(arr) || arr.length === 0) return NaN;
  const sorted = [...arr].filter(x => isFinite(x)).sort((a,b)=>a-b);
  if (!sorted.length) return NaN;
  const idx = Math.floor((p/100) * (sorted.length - 1));
  return sorted[idx];
}

function annualizedReturn(rets = []) {
  if (!Array.isArray(rets) || rets.length === 0) return NaN;
  let prod = 1;
  for (const r of rets) prod *= (1 + r);
  return Math.pow(prod, 1 / rets.length) - 1;
}

function stdev(rets = []) {
  if (!Array.isArray(rets) || rets.length === 0) return NaN;
  const mean = rets.reduce((a,b)=>a+b,0) / rets.length;
  const variance = rets.reduce((a,b)=>a + Math.pow(b-mean, 2), 0) / Math.max(1, rets.length - 1);
  return Math.sqrt(variance);
}

function sortinoRatio(rets = [], target = 0) {
  if (!Array.isArray(rets) || rets.length === 0) return NaN;
  const mean = rets.reduce((a,b)=>a+b,0) / rets.length;
  const downside = rets.filter(r => (r - target) < 0).map(r => Math.pow(r - target, 2));
  const dd = downside.length ? Math.sqrt(downside.reduce((a,b)=>a+b,0) / downside.length) : 0;
  return dd > 0 ? (mean - target) / dd : NaN;
}

async function backfill({ dry = true, limit = 0 } = {}){
  console.log(`Backfill summaries (dry=${dry})`);

  const where = {
    OR: [
      { summary: null },
      { summary: { path: [] } },
    ]
  };

  // Create a short-lived Prisma client for this batch to avoid prepared-statement
  // name collisions when running repeated queries in long-lived processes.
  const prisma = new PrismaClient();
  // Fetch candidates - we will filter in JS for missing fields more precisely
  const sims = await prisma.simulation.findMany({
    where: {},
    select: { id: true, results: true, summary: true },
    take: limit > 0 ? limit : undefined,
  });

  let updated = 0;
  for (const s of sims) {
    try {
      const existingSummary = s.summary || null;
      const results = s.results || null;
      // If results is missing, skip
      if (!results) continue;

      // Normalize parsed results (may be JSON stored as string)
      const parsedResults = typeof results === 'string' ? JSON.parse(results) : results;

      // quick check: if summary already has sharpe10, assume done
      if (existingSummary && existingSummary.sharpe10 != null) continue;

      const portfolioReturns = Array.isArray(parsedResults.portfolioReturns) ? parsedResults.portfolioReturns : [];
      const finals = parsedResults.finalValues || parsedResults.finals || parsedResults.finalValues?.percentile90 ? [] : (parsedResults.finalValues || parsedResults.finals || []);

      // compute per-sim metrics
      const perSimCAGR = portfolioReturns.map(annualizedReturn).filter(x => isFinite(x));
      const perSimVol = portfolioReturns.map(stdev).filter(x => isFinite(x));
      const rfPct = (parsedResults?.summary?.riskFreeRate) ?? (parsedResults?.inputs?.riskFreeRate) ?? 2;
      const rf = rfPct > 1 ? rfPct / 100 : rfPct;
      const perSimSharpe = portfolioReturns.map(r => {
        const ar = annualizedReturn(r);
        const sd = stdev(r);
        return (isFinite(ar) && isFinite(sd) && sd > 0) ? (ar - rf) / sd : NaN;
      }).filter(x => isFinite(x));
      const perSimSortino = portfolioReturns.map(r => sortinoRatio(r, rf)).filter(x => isFinite(x));

      // percentiles
      const newSummary = Object.assign({}, existingSummary || {});
      newSummary.medianAnnualizedReturn = isFinite(percentile(perSimCAGR, 50)) ? Number((percentile(perSimCAGR,50) * 100).toFixed(2)) : newSummary.medianAnnualizedReturn;
      newSummary.annualizedReturn10 = isFinite(percentile(perSimCAGR,10)) ? Number((percentile(perSimCAGR,10) * 100).toFixed(2)) : newSummary.annualizedReturn10;
      newSummary.annualizedReturn25 = isFinite(percentile(perSimCAGR,25)) ? Number((percentile(perSimCAGR,25) * 100).toFixed(2)) : newSummary.annualizedReturn25;
      newSummary.annualizedReturn75 = isFinite(percentile(perSimCAGR,75)) ? Number((percentile(perSimCAGR,75) * 100).toFixed(2)) : newSummary.annualizedReturn75;
      newSummary.annualizedReturn90 = isFinite(percentile(perSimCAGR,90)) ? Number((percentile(perSimCAGR,90) * 100).toFixed(2)) : newSummary.annualizedReturn90;

      newSummary.annualizedVolatility = isFinite(percentile(perSimVol,50)) ? Number((percentile(perSimVol,50) * 100).toFixed(2)) : newSummary.annualizedVolatility;
      newSummary.annualizedVolatility10 = isFinite(percentile(perSimVol,10)) ? Number((percentile(perSimVol,10) * 100).toFixed(2)) : newSummary.annualizedVolatility10;
      newSummary.annualizedVolatility25 = isFinite(percentile(perSimVol,25)) ? Number((percentile(perSimVol,25) * 100).toFixed(2)) : newSummary.annualizedVolatility25;
      newSummary.annualizedVolatility75 = isFinite(percentile(perSimVol,75)) ? Number((percentile(perSimVol,75) * 100).toFixed(2)) : newSummary.annualizedVolatility75;
      newSummary.annualizedVolatility90 = isFinite(percentile(perSimVol,90)) ? Number((percentile(perSimVol,90) * 100).toFixed(2)) : newSummary.annualizedVolatility90;

      newSummary.sharpeMedian = isFinite(percentile(perSimSharpe,50)) ? Number(percentile(perSimSharpe,50).toFixed(2)) : newSummary.sharpeMedian;
      newSummary.sharpe10 = isFinite(percentile(perSimSharpe,10)) ? Number(percentile(perSimSharpe,10).toFixed(2)) : newSummary.sharpe10;
      newSummary.sharpe25 = isFinite(percentile(perSimSharpe,25)) ? Number(percentile(perSimSharpe,25).toFixed(2)) : newSummary.sharpe25;
      newSummary.sharpe75 = isFinite(percentile(perSimSharpe,75)) ? Number(percentile(perSimSharpe,75).toFixed(2)) : newSummary.sharpe75;
      newSummary.sharpe90 = isFinite(percentile(perSimSharpe,90)) ? Number(percentile(perSimSharpe,90).toFixed(2)) : newSummary.sharpe90;

      newSummary.sortino = isFinite(percentile(perSimSortino,50)) ? Number(percentile(perSimSortino,50).toFixed(2)) : newSummary.sortino;
      newSummary.sortino10 = isFinite(percentile(perSimSortino,10)) ? Number(percentile(perSimSortino,10).toFixed(2)) : newSummary.sortino10;
      newSummary.sortino25 = isFinite(percentile(perSimSortino,25)) ? Number(percentile(perSimSortino,25).toFixed(2)) : newSummary.sortino25;
      newSummary.sortino75 = isFinite(percentile(perSimSortino,75)) ? Number(percentile(perSimSortino,75).toFixed(2)) : newSummary.sortino75;
      newSummary.sortino90 = isFinite(percentile(perSimSortino,90)) ? Number(percentile(perSimSortino,90).toFixed(2)) : newSummary.sortino90;

      // probabilityOfLoss and medianFinalValue if finals exist
      if (Array.isArray(parsedResults.finalValues) && parsedResults.finalValues.length) {
        const finalsArr = parsedResults.finalValues;
        newSummary.probabilityOfLoss = (finalsArr.filter(v => v < (parsedResults.inputs?.initialEndowment || 0)).length / finalsArr.length) || newSummary.probabilityOfLoss;
        newSummary.medianFinalValue = isFinite(percentile(finalsArr,50)) ? percentile(finalsArr,50) : newSummary.medianFinalValue;
      }

      if (dry) {
        console.log(`[DRY] Would update simulation ${s.id} with summary keys:`, Object.keys(newSummary));
      } else {
        // Use raw SQL to update only the summary column to avoid schema mismatch issues
        // Cast the JSON string to JSONB for the database
        const summaryJson = JSON.stringify(newSummary);
        await prisma.$executeRawUnsafe(`UPDATE simulations SET summary = $1::jsonb WHERE id = $2`, summaryJson, s.id);
        console.log(`Updated simulation ${s.id}`);
        updated++;
      }

    } catch (err) {
      console.error(`Error processing simulation ${s.id}:`, err.message || err);
    }
  }

  console.log(`Done. Updated ${updated} simulations.`);

  // Disconnect the short-lived client to free prepared statements and connections
  try {
    await prisma.$disconnect();
  } catch (e) {
    console.warn('Error disconnecting prisma client:', e?.message || e);
  }
}

(async function(){
  try {
    const dry = !!argv.dry || !!argv._.includes('--dry');
    const limit = argv.limit ? Number(argv.limit) : 0;
    await backfill({ dry, limit });
  } catch (e) {
    console.error('Fatal error:', e);
  } finally {
    // Note: individual Prisma clients created inside backfill() are disconnected there.
    // No top-level client exists here, so nothing to disconnect.
  }
})();
