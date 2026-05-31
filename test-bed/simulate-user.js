'use strict';

/**
 * Simula un usuario publicando su posición en el KV bucket MH_POSITIONS.
 * Conecta vía TCP (puerto 4222) — requiere el servicio nats corriendo.
 *
 * Uso:
 *   NATS_URL=nats://localhost:4222 node simulate-user.js
 *   CALLSIGN=HK5YYY LAT=7.10 LON=-72.13 node simulate-user.js
 */

const { connect, StringCodec } = require('nats');

const NATS_URL    = process.env.NATS_URL    || 'nats://localhost:4222';
const CALLSIGN    = process.env.CALLSIGN    || 'NJ7TST';
const LAT         = parseFloat(process.env.LAT  || '7.10');
const LON         = parseFloat(process.env.LON  || '-72.13');
const PUBLISH_MS  = parseInt(process.env.INTERVAL_MS || '15000', 10);
const BUCKET      = 'MH_POSITIONS';
const STALE_MS    = 5 * 60_000;

const sc = StringCodec();

// ── Cálculo Maidenhead grid6 ──────────────────────────────────────────────────
function toGrid(lat, lon) {
  const FIELD  = 'ABCDEFGHIJKLMNOPQR';
  const SQUARE = '0123456789';
  const SUB    = 'abcdefghijklmnopqrstuvwx';

  const adjLon = lon + 180;
  const adjLat = lat + 90;

  const f1  = Math.floor(adjLon / 20);
  const f2  = Math.floor(adjLat / 10);
  const s1  = Math.floor((adjLon - f1 * 20) / 2);
  const s2  = Math.floor(adjLat - f2 * 10);
  const ss1 = Math.floor((adjLon - f1 * 20 - s1 * 2) * 12);
  const ss2 = Math.floor((adjLat - f2 * 10 - s2) * 24);

  return FIELD[f1] + FIELD[f2] + SQUARE[s1] + SQUARE[s2] + SUB[ss1] + SUB[ss2];
}

async function main() {
  console.log(`Connecting to NATS at ${NATS_URL} …`);
  const nc = await connect({ servers: NATS_URL });
  console.log(`✓ Connected`);

  const js = nc.jetstream();
  const kv = await js.views.kv(BUCKET, { ttl: STALE_MS });
  console.log(`✓ KV bucket "${BUCKET}" ready`);

  const grid = toGrid(LAT, LON);
  console.log(`\nSimulating: ${CALLSIGN}  lat=${LAT}  lon=${LON}  grid=${grid}`);
  console.log(`Publishing every ${PUBLISH_MS / 1000}s  (Ctrl+C to stop)\n`);

  const publish = async () => {
    const pos = {
      v:    1,
      call: CALLSIGN,
      lat:  LAT,
      lon:  LON,
      grid,
      acc:  10,
      ts:   Date.now(),
    };
    await kv.put(CALLSIGN, sc.encode(JSON.stringify(pos)));
    console.log(`[${new Date().toISOString()}]  ↑ ${CALLSIGN}  ${grid}  (${LAT}, ${LON})`);
  };

  await publish();
  const timer = setInterval(publish, PUBLISH_MS);

  const shutdown = async (signal) => {
    console.log(`\n${signal} received — removing ${CALLSIGN} from KV …`);
    clearInterval(timer);
    try { await kv.delete(CALLSIGN); } catch { /* ignore */ }
    await nc.drain();
    console.log('Done.');
    process.exit(0);
  };

  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
