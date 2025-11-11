// server.mjs
import express from 'express';
import next from 'next';

const dev  = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 3000;       // Plesk injecte PORT
const host = process.env.HOST || '0.0.0.0';  // écouter partout derrière le proxy

const app = next({ dev });
const handle = app.getRequestHandler();

await app.prepare();

const server = express();
server.set('trust proxy', true);

// Healthcheck (utile pour Passenger / monitoring)
server.get('/healthz', (_req, res) => res.status(200).send('ok'));

// (tes routes custom ici si besoin)

server.all('*', (req, res) => handle(req, res));

// Lancement
const listener = server.listen(port, host, () => {
  console.log(`✅ Next + Express up on http://${host}:${port} (env: ${process.env.NODE_ENV})`);
});

// Arrêt propre (redémarrages Plesk)
const shutdown = () => listener.close(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
