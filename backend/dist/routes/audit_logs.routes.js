"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const audit_logs_controller_1 = require("../controllers/audit_logs.controller");
const router = (0, express_1.Router)();
router.get('/', audit_logs_controller_1.getAll);
router.post('/', audit_logs_controller_1.create);
exports.default = router;
