
import React, { useState } from 'react';
import { Order } from '../types';
import { SERVICES, SUPPLIERS } from '../constants';
import { MessageCircle, Phone, Printer, X, Truck, FileText, UserCheck } from 'lucide-react';

interface TicketViewProps {
  order: Order;
  type: 'CLIENT' | 'INTERNAL' | 'SUPPLIER';
  supplierId?: string;
  onClose: () => void;
}

const TicketView: React.FC<TicketViewProps> = ({ order, type: initialType, supplierId: initialSupplierId, onClose }) => {
  const [currentType, setCurrentType] = useState<'CLIENT' | 'INTERNAL' | 'SUPPLIER'>(initialType);
  const [currentSupplierId, setCurrentSupplierId] = useState<string | undefined>(initialSupplierId);
  const [tempPhone, setTempPhone] = useState(order.customerPhone || '');

  // Get all unique supplier IDs in this order
  const orderSuppliers = Array.from(new Set(order.items.filter(it => it.isSupplierItem).map(it => it.supplierId))).filter(Boolean) as string[];

  const supplier = SUPPLIERS.find(s => s.id === currentSupplierId);

  const displayItems = currentType === 'SUPPLIER'
    ? order.items.filter(it => it.isSupplierItem && it.supplierId === currentSupplierId)
    : order.items;

  const getWhatsAppMessage = () => {
    const itemsList = displayItems
      .map(item => {
        const areaStr = item.categoryId === 'maison' && item.width && item.height
          ? `(${item.width}x${item.height}m = ${(item.width * item.height).toFixed(2)}m²)`
          : `x${item.quantity}`;
        return `- ${item.articleName} ${areaStr} (${SERVICES.find(s => s.id === item.serviceId)?.label})`;
      })
      .join('\n');

    const header = currentType === 'SUPPLIER'
      ? `📦 *BON DE LIVRAISON FOURNISSEUR : ${supplier?.name}*`
      : `✨ *SAVONNERIE PRO - TICKET #${order.ticketId}* ✨`;

    let footer = '';
    if (currentType === 'SUPPLIER') {
      footer = `\n📍 *Ticket Source :* #${order.ticketId}`;
    } else {
      footer = `💰 *Total :* ${order.total.toFixed(2)} DH\n`;
      if (order.discount && order.discount > 0) {
        footer += `📉 *Remise (${order.discountRate}%):* -${order.discount.toFixed(2)} DH\n`;
      }
      footer += `✅ *Payé :* ${order.paid.toFixed(2)} DH\n` +
        `⏳ *Reste :* ${(order.total - order.paid).toFixed(2)} DH\n\n` +
        `📅 *Récupération :* ${new Date(order.pickupDate).toLocaleDateString('fr-FR')}\n\n` +
        `À bientôt ! 🌀`;
    }

    return `${header}\n\n` +
      `📦 *Articles :*\n${itemsList}\n\n` +
      footer;
  };

  const sendWhatsApp = () => {
    if (!tempPhone) return;
    const message = getWhatsAppMessage();
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${tempPhone.replace(/\s+/g, '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const handlePrint = () => {
    if (currentType === 'CLIENT' && tempPhone) {
      sendWhatsApp();
    }
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 no-print backdrop-blur-sm">
      <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm flex flex-col items-center shadow-2xl relative overflow-hidden">
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-300 hover:text-gray-500"><X /></button>

        {/* Multi-Ticket Selector */}
        {(orderSuppliers.length > 0 || currentType !== 'CLIENT') && (
          <div className="w-full flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2 border-b border-gray-100">
            <button
              onClick={() => setCurrentType('CLIENT')}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase whitespace-nowrap transition-all ${currentType === 'CLIENT' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
            >
              Client
            </button>
            <button
              onClick={() => setCurrentType('INTERNAL')}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase whitespace-nowrap transition-all ${currentType === 'INTERNAL' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
            >
              Atelier
            </button>
            {orderSuppliers.map(sid => {
              const s = SUPPLIERS.find(sup => sup.id === sid);
              return (
                <button
                  key={sid}
                  onClick={() => {
                    setCurrentType('SUPPLIER');
                    setCurrentSupplierId(sid);
                  }}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase whitespace-nowrap transition-all ${currentType === 'SUPPLIER' && currentSupplierId === sid ? 'bg-orange-600 text-white shadow-md' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                >
                  Exp: {s?.name}
                </button>
              );
            })}
          </div>
        )}

        <div className="w-full text-center border-b-2 border-dashed border-gray-200 pb-6 mb-6">
          <h2 className="text-2xl font-black uppercase tracking-tighter text-blue-600">Savonnerie PRO</h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Blanchisserie Moderne</p>

          {currentType === 'SUPPLIER' ? (
            <div className="mt-6 flex flex-col items-center">
              <div className="bg-orange-50 p-4 rounded-2xl mb-2 text-orange-500 border border-orange-100">
                <Truck size={32} />
              </div>
              <h3 className="text-xl font-black uppercase text-gray-800">{supplier?.name}</h3>
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Bon de Livraison Externe</p>
              <div className="mt-4 text-2xl font-black text-gray-400">#FL-{order.ticketId}</div>
            </div>
          ) : (
            <>
              <div className="mt-4 text-4xl font-black text-gray-800 tracking-tighter">#{order.ticketId}</div>
              <div className={`mt-2 inline-block px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${currentType === 'CLIENT' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                TICKET {currentType === 'CLIENT' ? 'CLIENT' : 'ATELIER'}
              </div>
            </>
          )}
        </div>

        <div className="w-full space-y-4 mb-8 max-h-64 overflow-y-auto no-scrollbar pr-1">
          {displayItems.map((item, idx) => {
            const service = SERVICES.find(s => s.id === item.serviceId);
            return (
              <div key={idx} className="flex items-center justify-between text-sm group">
                <div className="flex items-center gap-3">
                  <img src={item.image} className="w-10 h-10 rounded-xl object-cover shadow-sm" alt={item.articleName} />
                  <div className="flex flex-col">
                    <span className="font-black text-gray-800 uppercase text-xs leading-none mb-1">{item.articleName}</span>
                    <span className="text-[10px] text-blue-500 font-bold uppercase">{service?.label}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[8px] font-mono bg-gray-100 px-1 rounded text-gray-500 tracking-tighter">|| {item.barcode} ||</span>
                      {item.categoryId === 'maison' && item.width && item.height && (
                        <span className="text-[8px] font-bold text-gray-400">{item.width}m x {item.height}m</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-black text-gray-400 text-xs">
                    {item.categoryId === 'maison' && item.width && item.height
                      ? `${(item.width * item.height).toFixed(2)} m²`
                      : `x${item.quantity}`}
                  </span>
                  {currentType !== 'SUPPLIER' && <span className="font-black text-gray-800 text-xs">{item.price.toFixed(2)} DH</span>}
                </div>
              </div>
            );
          })}
        </div>

        {currentType !== 'SUPPLIER' ? (
          <div className="w-full bg-gray-50 p-6 rounded-3xl space-y-2 mb-8 border border-gray-100">
            <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase">
              <span>Sous-total</span>
              <span>{order.subtotal.toFixed(2)} DH</span>
            </div>
            {order.discount && order.discount > 0 && (
              <div className="flex justify-between text-[10px] font-black text-orange-500 uppercase">
                <span>Remise {order.discountRate}%</span>
                <span>- {order.discount.toFixed(2)} DH</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-gray-800 uppercase pt-2 border-t border-gray-200">
              <span>TOTAL</span>
              <span>{order.total.toFixed(2)} DH</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-green-500 uppercase">
              <span>PAYÉ</span>
              <span>{order.paid.toFixed(2)} DH</span>
            </div>
            {order.total - order.paid > 0 && (
              <div className="flex justify-between text-sm font-black text-red-500 uppercase pt-2 border-t border-gray-200">
                <span>RESTE À PAYER</span>
                <span>{(order.total - order.paid).toFixed(2)} DH</span>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full space-y-6 mb-8 pt-6 border-t-2 border-dashed border-gray-100">
            <div className="flex flex-col gap-2">
              <p className="text-[9px] font-black text-gray-400 uppercase">Date d'Envoi</p>
              <p className="text-sm font-bold text-gray-800">{new Date().toLocaleDateString('fr-FR')}</p>
            </div>
            <div className="grid grid-cols-2 gap-8 h-20">
              <div className="border-b border-gray-300 flex flex-col justify-between pb-1">
                <span className="text-[8px] font-black text-gray-400 uppercase">Signature Atelier</span>
              </div>
              <div className="border-b border-gray-300 flex flex-col justify-between pb-1">
                <span className="text-[8px] font-black text-gray-400 uppercase">Signature Transporteur</span>
              </div>
            </div>
          </div>
        )}

        {currentType === 'CLIENT' && (
          <div className="w-full mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Phone size={14} className="text-gray-400" />
              <span className="text-[10px] font-black text-gray-400 uppercase">WhatsApp Client</span>
            </div>
            <div className="flex gap-2">
              <input
                type="tel"
                placeholder="Ajouter téléphone..."
                value={tempPhone}
                onChange={(e) => setTempPhone(e.target.value)}
                className="flex-1 bg-gray-100 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-green-500"
              />
              <button
                onClick={sendWhatsApp}
                disabled={!tempPhone}
                className="bg-green-500 text-white p-3 rounded-2xl shadow-lg shadow-green-100 active:scale-95 disabled:opacity-50 transition-all"
                title="Envoyer via WhatsApp"
              >
                <MessageCircle size={20} />
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col w-full gap-3 mt-auto">
          <button
            onClick={handlePrint}
            className={`w-full py-5 rounded-[2rem] font-black uppercase text-xs flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all ${currentType === 'SUPPLIER' ? 'bg-orange-500 text-white shadow-orange-100' : 'bg-gray-800 text-white shadow-gray-100'}`}
          >
            <Printer size={20} /> {currentType === 'SUPPLIER' ? 'Imprimer Bon de Sortie' : `Imprimer ${currentType === 'CLIENT' && tempPhone ? '& WhatsApp' : 'Ticket'}`}
          </button>
          <button
            onClick={onClose}
            className="w-full bg-gray-100 text-gray-400 py-4 rounded-[2rem] font-black uppercase text-[10px] active:scale-95 transition-all"
          >
            Fermer
          </button>
        </div>

        <div className="mt-4 text-[9px] font-bold text-gray-300 uppercase tracking-widest italic">
          {currentType === 'SUPPLIER' ? `Référence Ticket Source : #${order.ticketId}` : `Récupération: ${new Date(order.pickupDate).toLocaleDateString('fr-FR')}`}
        </div>
      </div>
    </div>
  );
};

export default TicketView;
