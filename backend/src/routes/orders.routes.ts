import { Router } from "express";
import {
  createOrder,
  getOrders,
  updateItemStatus,
  updateItemPrice,
  removeItem,
  updateOrderPaid,
  notifySuppliersOnPrint,
  sendTicketPdfToClient,
} from "../controllers/orders.controller";
import { updateSupplier } from "../controllers/order_items.controller";

const router = Router();

router.post("/", createOrder);
router.get("/", getOrders);
router.post("/:id/notify-suppliers", notifySuppliersOnPrint);
router.post("/:id/send-ticket-pdf", sendTicketPdfToClient);
router.put("/items/:id/supplier", updateSupplier);
router.put("/items/:id/status", updateItemStatus);
router.put("/items/:id/price", updateItemPrice);
router.delete("/items/:id", removeItem);
router.put("/:id/paid", updateOrderPaid);

export default router;
