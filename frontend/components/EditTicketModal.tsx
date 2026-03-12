import React, { useState, useEffect } from "react";
import { Order, CartItem } from "../types";
import { X, Trash2, Save, Edit } from "lucide-react";
import * as api from "../services/api";
import { useLanguage } from "../context/LanguageContext";

interface EditTicketModalProps {
  order: Order;
  onClose: () => void;
  onUpdated: () => void;
}

const EditTicketModal: React.FC<EditTicketModalProps> = ({
  order,
  onClose,
  onUpdated,
}) => {
  const { language } = useLanguage();
  const [items, setItems] = useState<CartItem[]>([...order.items]);
  const [paid, setPaid] = useState(order.paid);
  const [saving, setSaving] = useState(false);
  const [editedPrices, setEditedPrices] = useState<Record<string, number>>({});

  const total = items.reduce((s, it) => s + it.price, 0);
  const remaining = total - paid;

  const handlePriceChange = (itemId: string, newPrice: number) => {
    setEditedPrices((prev) => ({ ...prev, [itemId]: newPrice }));
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, price: newPrice } : it)),
    );
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!confirm("Supprimer cet article du ticket ?")) return;
    try {
      await api.removeOrderItem(itemId);
      setItems((prev) => prev.filter((it) => it.id !== itemId));
      onUpdated();
    } catch (e) {
      alert("Erreur lors de la suppression");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save edited prices
      for (const [itemId, newPriceVal] of Object.entries(editedPrices)) {
        const newPrice = newPriceVal as number;
        const item = items.find((it) => it.id === itemId);
        if (item) {
          await api.updateItemPrice(
            itemId,
            newPrice / (item.quantity || 1),
            newPrice,
          );
        }
      }
      // Save paid amount
      if (paid !== order.paid) {
        await api.updateOrderPaid(order.ticketId, paid);
      }
      onUpdated();
      onClose();
    } catch (e) {
      alert("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  if (items.length === 0) {
    onClose();
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[999] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Edit size={20} />
            <div>
              <h2 className="font-black text-lg">Modifier Ticket</h2>
              <p className="text-blue-200 text-xs font-bold">
                #{order.ticketId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">
            Articles
          </p>
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100"
            >
              <img
                src={item.image}
                alt={(language === "ar" && item.articleName_ar) ? item.articleName_ar : item.articleName}
                className="w-10 h-10 rounded-xl object-cover shadow-sm flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="font-black text-xs text-gray-800 uppercase truncate">
                  {(language === "ar" && item.articleName_ar) ? item.articleName_ar : item.articleName}
                </p>
                <p className="text-[10px] text-gray-400 font-bold">
                  {item.categoryId === "maison" && item.width && item.height
                    ? `${(item.width * item.height).toFixed(2)} m²`
                    : `x${item.quantity}`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) =>
                      handlePriceChange(
                        item.id,
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    className="w-20 h-8 px-2 text-right bg-white border-2 border-gray-200 rounded-xl text-xs font-black text-gray-800 focus:border-blue-500 focus:ring-0 transition-all"
                    step="0.01"
                    min="0"
                  />
                  <span className="text-[9px] font-black text-gray-400">
                    DH
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer - Totals & Save */}
        <div className="border-t border-gray-100 p-4 space-y-3 flex-shrink-0 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-gray-500 uppercase">
              Total
            </span>
            <span className="text-lg font-black text-gray-800">
              {total.toFixed(2)} DH
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black text-gray-500 uppercase">
              Payé
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={paid}
                onChange={(e) => setPaid(parseFloat(e.target.value) || 0)}
                className="w-28 h-9 px-3 text-right bg-white border-2 border-gray-200 rounded-xl text-sm font-black text-emerald-600 focus:border-emerald-500 focus:ring-0 transition-all"
                step="0.01"
                min="0"
              />
              <span className="text-[9px] font-black text-gray-400">DH</span>
            </div>
          </div>

          {remaining > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-red-400 uppercase">
                Reste
              </span>
              <span className="text-sm font-black text-red-500">
                {remaining.toFixed(2)} DH
              </span>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditTicketModal;
