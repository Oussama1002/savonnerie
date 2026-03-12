"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const transactions_controller_1 = require("../controllers/transactions.controller");
const router = (0, express_1.Router)();
router.get('/', transactions_controller_1.getAll);
exports.default = router;
