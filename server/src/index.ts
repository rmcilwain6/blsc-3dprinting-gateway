import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
loadEnv({ path: resolve(__dirname, '../../.env') });
import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer } from 'http';
import { setupWebSocket } from './websocket';
import jobsRouter from './routes/jobs';
import printersRouter from './routes/printers';
import roomsRouter from './routes/rooms';
import adminRouter from './routes/admin';
import { printerRegistry } from './services/printerRegistry';

const app = express();
const server = createServer(app);
const PORT = parseInt(process.env.PRINTGATE_PORT ?? '3000', 10);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/jobs', jobsRouter);
app.use('/api/printers', printersRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/admin', adminRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', simulate: process.env.PRINTGATE_SIMULATE === 'true' });
});

// Serve client build in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

setupWebSocket(server);
printerRegistry.startPolling();

server.listen(PORT, () => {
  console.log(`\nPrintGate running at http://localhost:${PORT}`);
  console.log(`  Simulator mode : ${process.env.PRINTGATE_SIMULATE === 'true' ? 'ON' : 'OFF'}`);
  console.log(`  Admin password : ${process.env.PRINTGATE_ADMIN_PASSWORD ? 'configured' : 'NOT SET'}`);
  console.log(`  Upload dir     : ${process.env.PRINTGATE_UPLOAD_DIR ?? './uploads'}\n`);
});
