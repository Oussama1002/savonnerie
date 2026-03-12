"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
try {
    require("dotenv").config();
}
catch {
    // dotenv optional: set WHATSAPP_TOKEN in .env or system env
}
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const orders_routes_1 = __importDefault(require("./routes/orders.routes"));
const categoriesController = __importStar(require("./controllers/categories.controller"));
const services_routes_1 = __importDefault(require("./routes/services.routes"));
const articles_routes_1 = __importDefault(require("./routes/articles.routes"));
const users_routes_1 = __importDefault(require("./routes/users.routes"));
const suppliers_routes_1 = __importDefault(require("./routes/suppliers.routes"));
const article_supplier_prices_routes_1 = __importDefault(require("./routes/article_supplier_prices.routes"));
const machines_routes_1 = __importDefault(require("./routes/machines.routes"));
const clients_routes_1 = __importDefault(require("./routes/clients.routes"));
const old_stock_routes_1 = __importDefault(require("./routes/old_stock.routes"));
const transactions_routes_1 = __importDefault(require("./routes/transactions.routes"));
const audit_logs_routes_1 = __importDefault(require("./routes/audit_logs.routes"));
const supplier_invoices_routes_1 = __importDefault(require("./routes/supplier_invoices.routes"));
const stock_routes_1 = __importDefault(require("./routes/stock.routes"));
const expense_articles_routes_1 = __importDefault(require("./routes/expense_articles.routes"));
const settings_routes_1 = __importDefault(require("./routes/settings.routes"));
const notifications_routes_1 = __importDefault(require("./routes/notifications.routes"));
const init_1 = require("./database/init");
const seed_1 = require("./database/seed");
const cron_service_1 = require("./services/cron.service");
(0, init_1.initDB)();
(0, seed_1.seedDB)();
(0, cron_service_1.startCronJobs)();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// #region agent log
const DEBUG_LOG = path_1.default.resolve(__dirname, '../../debug-4d2292.log');
function agentLog(payload) {
    try {
        fs_1.default.appendFileSync(DEBUG_LOG, JSON.stringify({ ...payload, timestamp: Date.now() }) + '\n');
    }
    catch (_) { }
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
    }).catch(() => { });
    next();
});
// #endregion
app.get('/', (req, res) => res.json({ status: 'OK' }));
app.use('/orders', orders_routes_1.default);
app.get('/categories', categoriesController.getAll);
app.post('/categories', categoriesController.create);
app.put('/categories/:id', categoriesController.update);
app.delete('/categories/:id', categoriesController.remove);
// Allow preflight for categories (some clients send OPTIONS before POST/DELETE)
app.options('/categories', (_, res) => res.sendStatus(204));
app.options('/categories/:id', (_, res) => res.sendStatus(204));
app.use('/services', services_routes_1.default);
app.use('/articles', articles_routes_1.default);
app.use('/users', users_routes_1.default);
app.use('/suppliers', suppliers_routes_1.default);
app.use('/suppliers', article_supplier_prices_routes_1.default);
app.use('/machines', machines_routes_1.default);
app.use('/clients', clients_routes_1.default);
app.use('/old-stock', old_stock_routes_1.default);
app.use('/transactions', transactions_routes_1.default);
app.use('/audit-logs', audit_logs_routes_1.default);
app.use('/supplier-invoices', supplier_invoices_routes_1.default);
console.log('Registering stock routes...');
app.use('/stock', stock_routes_1.default);
app.use('/expense-articles', expense_articles_routes_1.default);
app.use('/settings', settings_routes_1.default);
app.use('/notifications', notifications_routes_1.default);const path = require('path');
const express = require('express');

const frontendPath = path.join(__dirname, '../../frontend/dist');

// Servir les fichiers statiques
app.use('/savonnerie', express.static(frontendPath));

// Toute autre requête vers /savonnerie renvoie index.html
app.get(/^\/savonnerie\/?.*$/, (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});
const server = app.listen(3333, () => {
    console.log('Backend running on http://localhost:3333');
});
server.on('error', (err) => {
    console.error('Server failed to start:', err);
    process.exit(1);
});
