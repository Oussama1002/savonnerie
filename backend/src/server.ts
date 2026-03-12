try {
  require("dotenv").config();
} catch {
  // dotenv optional: set WHATSAPP_TOKEN in .env or system env
}
import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import ordersRoutes from './routes/orders.routes';
import * as categoriesController from './controllers/categories.controller';
import servicesRoutes from './routes/services.routes';
import articlesRoutes from './routes/articles.routes';
import usersRoutes from './routes/users.routes';
import suppliersRoutes from './routes/suppliers.routes';
import articleSupplierPricesRoutes from './routes/article_supplier_prices.routes';
import machinesRoutes from './routes/machines.routes';
import clientsRoutes from './routes/clients.routes';
import oldStockRoutes from './routes/old_stock.routes';
import transactionsRoutes from './routes/transactions.routes';
import auditLogsRoutes from './routes/audit_logs.routes';
import supplierInvoicesRoutes from './routes/supplier_invoices.routes';
import stockRoutes from './routes/stock.routes';
import expenseArticlesRoutes from './routes/expense_articles.routes';
import settingsRoutes from './routes/settings.routes';
import notificationsRoutes from './routes/notifications.routes';
import { initDB } from './database/init';
import { seedDB } from './database/seed';
import { startCronJobs } from './services/cron.service';

initDB();
seedDB();
startCronJobs();

const app = express();
app.use(cors());
app.use(express.json());

// #region agent log
const DEBUG_LOG = path.resolve(__dirname, '../../debug-4d2292.log');
function agentLog(payload: object) {
  try {
    fs.appendFileSync(DEBUG_LOG, JSON.stringify({ ...payload, timestamp: Date.now() }) + '\n');
  } catch (_) {}
}
app.use((req, _res, next) => {
  agentLog({
    sessionId: '4d2292',
    hypothesisId: 'H1',
    location: 'server.ts',
    message: 'incoming_request',
    data: { method: req.method, path: req.path, originalUrl: req.originalUrl },
  });
  fetch('http://127.0.0.1:7742/ingest/8891bdea-7168-4cb4-b1af-1b5dde681c4a', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '4d2292',
    },
    body: JSON.stringify({
      sessionId: '4d2292',
      runId: 'initial',
      hypothesisId: 'H1',
      location: 'server.ts:27',
      message: 'incoming_request',
      data: {
        method: req.method,
        path: req.path,
        originalUrl: req.originalUrl,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  next();
});
// #endregion

app.get('/', (req, res) => res.json({ status: 'OK' }));
app.use('/orders', ordersRoutes);
app.get('/categories', categoriesController.getAll);
app.post('/categories', categoriesController.create);
app.put('/categories/:id', categoriesController.update);
app.delete('/categories/:id', categoriesController.remove);
// Allow preflight for categories (some clients send OPTIONS before POST/DELETE)
app.options('/categories', (_, res) => res.sendStatus(204));
app.options('/categories/:id', (_, res) => res.sendStatus(204));
app.use('/services', servicesRoutes);
app.use('/articles', articlesRoutes);
app.use('/users', usersRoutes);
app.use('/suppliers', suppliersRoutes);
app.use('/suppliers', articleSupplierPricesRoutes);
app.use('/machines', machinesRoutes);
app.use('/clients', clientsRoutes);
app.use('/old-stock', oldStockRoutes);
app.use('/transactions', transactionsRoutes);
app.use('/audit-logs', auditLogsRoutes);
app.use('/supplier-invoices', supplierInvoicesRoutes);
console.log('Registering stock routes...');
app.use('/stock', stockRoutes);
app.use('/expense-articles', expenseArticlesRoutes);
app.use('/settings', settingsRoutes);
app.use('/notifications', notificationsRoutes);

const server = app.listen(3333, () => {
  console.log('Backend running on http://localhost:3333');
});
server.on('error', (err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
