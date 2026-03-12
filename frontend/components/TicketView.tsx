import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Order, ServiceRef, Supplier } from '../types';
import { notifySuppliersOnPrint, sendTicketPdfToClient } from '../services/api';
import { MessageCircle, Phone, Printer, X, Truck } from 'lucide-react';
import { BarcodeDisplay } from './BarcodeDisplay';

interface TicketViewProps {
  order: Order;
  type: 'CLIENT' | 'INTERNAL' | 'SUPPLIER';
  supplierId?: string;
  services: ServiceRef[];
  suppliers: Supplier[];
  onClose: () => void;
}

const TicketView: React.FC<TicketViewProps> = ({ order, type: initialType, supplierId: initialSupplierId, services, suppliers, onClose }) => {
  const { t, language } = useLanguage();
  const [currentType, setCurrentType] = useState<'CLIENT' | 'INTERNAL' | 'SUPPLIER'>(initialType);
  const [currentSupplierId, setCurrentSupplierId] = useState<string | undefined>(initialSupplierId);
  const [tempPhone, setTempPhone] = useState(order.customerPhone || '');

  const orderSuppliers = Array.from(new Set(order.items.filter(it => it.isSupplierItem).map(it => it.supplierId))).filter(Boolean) as string[];

  const supplier = suppliers.find(s => s.id === currentSupplierId);

  const displayItems = currentType === 'SUPPLIER'
    ? order.items.filter(it => it.isSupplierItem && it.supplierId === currentSupplierId)
    : order.items;

  const getWhatsAppMessage = () => {
    const itemsList = displayItems
      .map(item => {
        const areaStr = item.categoryId === 'maison' && item.width && item.height
          ? `(${item.width}x${item.height}m = ${(item.width * item.height).toFixed(2)}m²)`
          : `x${item.quantity}`;
        const service = services.find(s => s.id === item.serviceId);
        const serviceLabel = language === 'ar' && t(`stock_client.${item.serviceId}`) !== `stock_client.${item.serviceId}` ? t(`stock_client.${item.serviceId}`) : service?.name;
        return `- ${(language === 'ar' && item.articleName_ar) ? item.articleName_ar : item.articleName} ${areaStr} (${serviceLabel || item.serviceId})`;
      })
      .join('\n');

    const header = currentType === 'SUPPLIER'
      ? `📦 *${t('ticket.supplier_ticket')} : ${supplier?.name}*`
      : `✨ *${t('app_title')} - ${t('ticket.title')} #${order.ticketId}* ✨`;

    let footer = '';
    if (currentType === 'SUPPLIER') {
      footer = `\n📍 *${t('ticket.source') || 'Ticket Source'} :* #${order.ticketId}`;
    } else {
      footer = `💰 *${t('common.total')} :* ${order.total.toFixed(2)} DH\n`;
      if (order.discount && order.discount > 0) {
        footer += `📉 *${t('ticket.discount')} (${order.discountRate}%):* -${order.discount.toFixed(2)} DH\n`;
      }
      if (order.isDelivery) {
        footer += `🚚 *Livraison:* Oui\n`;
        if (order.deliveryAddress) {
          footer += `📍 *Adresse:* ${order.deliveryAddress}\n`;
        }
      }
      footer += `✅ *${t('ticket.paid')} :* ${order.paid.toFixed(2)} DH\n` +
        `⏳ *${t('ticket.rest')} :* ${(order.total - order.paid).toFixed(2)} DH\n\n` +
        `📅 *${t('ticket.pickup_date')} :* ${new Date(order.pickupDate).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR')}\n\n` +
        `${t('ticket.see_you_soon') || 'À bientôt !'} 🌀`;
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
    // Notify fournisseurs by WhatsApp that there is an article to pick up
    notifySuppliersOnPrint(order.ticketId).catch(() => {});
    // Send ticket as PDF to client via WhatsApp when printing CLIENT ticket
    if (currentType === 'CLIENT' && (tempPhone || order.customerPhone)) {
      sendTicketPdfToClient(order.ticketId, language).catch((e) =>
        console.warn('Ticket PDF to client:', e),
      );
    }
    // Print directly: print-only block is shown, modal is hidden via CSS
    requestAnimationFrame(() => window.print());
  };

  // Compact ticket content for printing only (smaller, no overlay)
  const renderClientPrintTicket = () => (
    <>
      <div className="p-4 flex flex-col items-center border-b border-gray-200">
        <h2 className="text-lg font-black uppercase text-blue-600">{t('app_title')}</h2>
        <p className="text-[8px] font-bold text-gray-400 uppercase">{t('app_subtitle')}</p>
        <div className="text-xl font-black text-gray-800 mt-2">#{order.ticketId}</div>
        <div className="mt-1 flex justify-center" title={order.ticketId}>
          <BarcodeDisplay value={order.ticketId} width={1} height={28} displayValue fontSize={8} />
        </div>
        <div className="mt-1 px-2 py-0.5 rounded text-[7px] font-black uppercase bg-blue-50 text-blue-600">
          {t('ticket.client_ticket')}
        </div>
      </div>
      <div className="p-3 space-y-2">
        {order.items.map((item, idx) => {
          const service = services.find(s => s.id === item.serviceId);
          const statusLabel = t(`stock_client.${item.status}`) !== `stock_client.${item.status}` ? t(`stock_client.${item.status}`) : item.status;
          return (
            <div key={idx} className="flex justify-between items-center text-[9px] gap-1">
              <span className="font-bold text-gray-800 flex-1 min-w-0">
                {(language === 'ar' && item.articleName_ar) ? item.articleName_ar : item.articleName} (
                {language === 'ar' && t(`stock_client.${item.serviceId}`) !== `stock_client.${item.serviceId}`
                  ? t(`stock_client.${item.serviceId}`)
                  : (service?.name || item.serviceId)}
                ) {item.categoryId === 'maison' && item.width && item.height ? `${(item.width * item.height).toFixed(2)} m²` : `x${item.quantity}`}
              </span>
              <span className="text-[7px] font-black uppercase text-gray-500 shrink-0">{statusLabel}</span>
            </div>
          );
        })}
        <div className="border-t border-gray-200 pt-2 mt-2 text-[9px] space-y-0.5">
          <div className="flex justify-between font-bold"><span>{t('ticket.subtotal')}</span><span>{order.subtotal.toFixed(2)} DH</span></div>
          {order.discount > 0 && <div className="flex justify-between text-orange-600"><span>{t('ticket.discount')}</span><span>-{order.discount.toFixed(2)} DH</span></div>}
          <div className="flex justify-between font-black text-base"><span>{t('ticket.total')}</span><span>{order.total.toFixed(2)} DH</span></div>
          <div className="flex justify-between text-green-600"><span>{t('ticket.paid')}</span><span>{order.paid.toFixed(2)} DH</span></div>
        </div>
      </div>
    </>
  );

  const renderSupplierPrintTicket = (supplierId: string) => {
    const sup = suppliers.find(s => s.id === supplierId);
    const itemsForSupplier = order.items.filter(it => it.isSupplierItem && it.supplierId === supplierId);
    if (itemsForSupplier.length === 0) return null;
    return (
      <div key={supplierId} className="ticket-print-size w-full max-w-[80mm] mx-auto my-4 text-black border-t border-dashed border-gray-300 pt-4">
        <div className="p-2 flex flex-col items-center border-b border-gray-200">
          <h2 className="text-sm font-black uppercase text-gray-800">{sup?.name || t('ticket.supplier_ticket')}</h2>
          <div className="text-xs font-black text-gray-400 mt-1">#FL-{order.ticketId}</div>
        </div>
        <div className="p-2 space-y-2">
          {itemsForSupplier.map((item, idx) => {
            const service = services.find(s => s.id === item.serviceId);
            return (
              <div key={idx} className="flex justify-between items-center text-[8px] gap-1">
                <span className="font-bold text-gray-800 flex-1 min-w-0">
                  {(language === 'ar' && item.articleName_ar) ? item.articleName_ar : item.articleName} (
                  {language === 'ar' && t(`stock_client.${item.serviceId}`) !== `stock_client.${item.serviceId}`
                    ? t(`stock_client.${item.serviceId}`)
                    : (service?.name || item.serviceId)}
                  ) {item.categoryId === 'maison' && item.width && item.height ? `${(item.width * item.height).toFixed(2)} m²` : `x${item.quantity}`}
                </span>
              </div>
            );
          })}
          <div className="mt-3 pt-2 border-t border-gray-200 grid grid-cols-2 gap-4 h-16 text-[7px] font-black text-gray-400 uppercase">
            <div className="border-b border-gray-200 flex items-end pb-1">
              {t('ticket.workshop_signature')}
            </div>
            <div className="border-b border-gray-200 flex items-end pb-1">
              {t('ticket.carrier_signature')}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Print-only: smaller ticket so it prints on paper (no overlay, no buttons) */}
      <div className="ticket-print-container hidden print:block">
        <div className="ticket-print-size w-full max-w-[80mm] mx-auto my-0 text-black">
          {renderClientPrintTicket()}
        </div>
        {/* Automatically print supplier FL for each supplier when printing client ticket */}
        {orderSuppliers.map((sid) => renderSupplierPrintTicket(sid))}
      </div>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-lg print:hidden">
        <div className="bg-white rounded-[2.5rem] w-full max-w-sm flex flex-col shadow-[0_30px_100px_-20px_rgba(0,0,0,0.3)] relative max-h-[95vh] overflow-hidden border-8 border-white">
          {/* Header Section */}
          <div className="p-6 pb-4 flex flex-col items-center border-b-2 border-dashed border-gray-100 relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-300 hover:text-gray-500"><X /></button>
          
          <h2 className="text-2xl font-black uppercase tracking-tighter text-blue-600">{t('app_title')}</h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{t('app_subtitle')}</p>

          <div className="mt-4 flex flex-col items-center">
            {currentType === 'SUPPLIER' ? (
              <>
                <div className="bg-orange-50 p-3 rounded-2xl mb-2 text-orange-500">
                  <Truck size={24} />
                </div>
                <h3 className="text-lg font-black uppercase text-gray-800">{supplier?.name}</h3>
                <div className="text-xl font-black text-gray-400">#FL-{order.ticketId}</div>
              </>
            ) : (
              <>
                <div className="text-3xl font-black text-gray-800 tracking-tighter">#{order.ticketId}</div>
                <div className="mt-2 flex justify-center print:block" title={order.ticketId}>
                  <BarcodeDisplay value={order.ticketId} width={1.2} height={36} displayValue fontSize={10} />
                </div>
                <div className={`mt-1 inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${currentType === 'CLIENT' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                  {currentType === 'CLIENT' ? t('ticket.client_ticket') : t('ticket.workshop_ticket')}
                </div>
              {order.isDelivery && (
                  <div className="mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100/50 shadow-sm text-[9px] font-black uppercase tracking-widest">
                    <Truck size={10} strokeWidth={3} />
                    Livraison
                  </div>
                )}
                {(order.deliveryAddress || order.clientAddress) && (
                  <div className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 text-slate-500 border border-slate-100 text-[9px] font-bold max-w-[250px] text-center">
                    <span className="flex-shrink-0">📍</span>
                    <span className="truncate">{order.deliveryAddress || order.clientAddress}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Type Selector */}
          {(orderSuppliers.length > 0 || currentType !== 'CLIENT') && (
            <div className="w-full flex gap-2 mt-4 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setCurrentType('CLIENT')}
                className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${currentType === 'CLIENT' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-400'}`}
              >
                {t('ticket.client')}
              </button>
              <button
                onClick={() => setCurrentType('INTERNAL')}
                className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${currentType === 'INTERNAL' ? 'bg-purple-600 text-white' : 'bg-gray-50 text-gray-400'}`}
              >
                {t('ticket.workshop')}
              </button>
              {orderSuppliers.map(sid => (
                <button
                  key={sid}
                  onClick={() => { setCurrentType('SUPPLIER'); setCurrentSupplierId(sid); }}
                  className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${currentType === 'SUPPLIER' && currentSupplierId === sid ? 'bg-orange-600 text-white' : 'bg-gray-50 text-gray-400'}`}
                >
                  {suppliers.find(s => s.id === sid)?.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
          {/* Articles List */}
          <div className="space-y-4">
            {displayItems.map((item, idx) => {
              const service = services.find(s => s.id === item.serviceId);
              const serviceLabel = language === 'ar' && t(`stock_client.${item.serviceId}`) !== `stock_client.${item.serviceId}` ? t(`stock_client.${item.serviceId}`) : (service?.name || item.serviceId);
              const qtyStr = item.categoryId === 'maison' && item.width && item.height
                ? `${(item.width * item.height).toFixed(2)} m²`
                : `x${item.quantity}`;
              const name = (language === 'ar' && item.articleName_ar) ? item.articleName_ar : item.articleName;
              const statusLabel = t(`stock_client.${item.status}`) !== `stock_client.${item.status}` ? t(`stock_client.${item.status}`) : item.status;
              const statusClass = item.status === 'livré' ? 'bg-blue-100 text-blue-700' : item.status === 'prêt' ? 'bg-green-100 text-green-700' : item.status === 'fournisseur' ? 'bg-purple-100 text-purple-700' : item.status === 'en_cours' ? 'bg-amber-100 text-amber-700' : item.status === 'no_service' || item.status === 'lost' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600';
              return (
                <div key={idx} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2 last:border-0">
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-black text-gray-800 uppercase text-xs leading-tight">{name} ({serviceLabel}) {qtyStr}</span>
                    {currentType !== 'SUPPLIER' && (
                      <>
                        <span className="text-[8px] font-mono text-gray-400 mt-0.5">{item.barcode}</span>
                        <span className={`text-[8px] font-bold uppercase mt-1 px-1.5 py-0.5 rounded w-fit ${statusClass}`}>{statusLabel}</span>
                      </>
                    )}
                  </div>
                  {currentType !== 'SUPPLIER' && (
                    <div className="text-right font-bold text-gray-800 text-xs whitespace-nowrap ml-2">
                      {item.price.toFixed(2)} DH
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Totals or Signatures */}
          {currentType !== 'SUPPLIER' ? (
            <div className="bg-gray-50/80 p-5 rounded-[2rem] space-y-3 border border-gray-100 shadow-inner">
              {(order.deliveryAddress || order.clientAddress) && (
                <div className="bg-gradient-to-r from-indigo-50/80 to-blue-50/60 p-4 rounded-2xl mb-4 border border-indigo-100/50 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-indigo-500 text-white rounded-lg flex items-center justify-center">
                      {order.isDelivery ? <Truck size={12} strokeWidth={3} /> : <span className="text-[10px]">📍</span>}
                    </div>
                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{order.isDelivery ? 'Adresse de livraison' : 'Adresse du client'}</span>
                  </div>
                  <p className="text-xs font-bold text-gray-700 leading-relaxed pl-8">{order.deliveryAddress || order.clientAddress}</p>
                </div>
              )}
              {order.note && (
                <div className="bg-amber-50/80 p-3 rounded-2xl mb-3 border border-amber-100/50">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px]">📝</span>
                    <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest">Note</span>
                  </div>
                  <p className="text-xs font-bold text-gray-700 leading-relaxed pl-5">{order.note}</p>
                </div>
              )}
              <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <span>{t('ticket.subtotal')}</span>
                <span>{order.subtotal.toFixed(2)} DH</span>
              </div>
              {order.discount && order.discount > 0 && (
                <div className="flex justify-between text-[10px] font-black text-orange-500 uppercase tracking-widest">
                  <span>{t('ticket.discount')} {order.discountRate}%</span>
                  <span>- {order.discount.toFixed(2)} DH</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-gray-900 uppercase pt-3 border-t border-gray-200/50 tracking-tighter">
                <span>{t('ticket.total')}</span>
                <span>{order.total.toFixed(2)} DH</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-green-600 uppercase">
                <span>{t('ticket.paid')}</span>
                <span>{order.paid.toFixed(2)} DH</span>
              </div>
              {order.total - order.paid > 0 && (
                <div className="flex justify-between text-sm font-black text-red-500 uppercase pt-1 tracking-tight">
                  <span>{t('ticket.rest')}</span>
                  <span>{(order.total - order.paid).toFixed(2)} DH</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 pt-4 border-t border-gray-100 mt-4">
              <div className="grid grid-cols-2 gap-4 h-20 text-[8px] font-black text-gray-400 uppercase">
                <div className="border-b border-gray-200 flex items-end pb-1">{t('ticket.workshop_signature')}</div>
                <div className="border-b border-gray-200 flex items-end pb-1">{t('ticket.carrier_signature')}</div>
              </div>
            </div>
          )}

          {/* WhatsApp Client (only for Client Ticket) */}
          {currentType === 'CLIENT' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase">
                <Phone size={12} /> {t('ticket.whatsapp_client')}
              </div>
              <div className="flex gap-2">
                <input
                  type="tel"
                  placeholder={t('ticket.phone_placeholder') || 'Téléphone...'}
                  value={tempPhone}
                  onChange={(e) => setTempPhone(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <button
                  onClick={sendWhatsApp}
                  disabled={!tempPhone}
                  className="bg-green-500 text-white p-2 rounded-xl active:scale-95 disabled:opacity-50 transition-all"
                >
                  <MessageCircle size={20} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons Section */}
        <div className="p-6 pt-0 space-y-3 mt-auto bg-white">
          <button
            onClick={handlePrint}
            className={`w-full py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all ${currentType === 'SUPPLIER' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-white'}`}
          >
            <Printer size={18} /> {currentType === 'SUPPLIER' ? t('ticket.print') : t('ticket.print')}
          </button>
          <button
            onClick={onClose}
            className="w-full bg-gray-100 text-gray-400 py-3 rounded-2xl font-black uppercase text-[10px] active:scale-95 transition-all"
          >
            {t('ticket.close')}
          </button>
          
          <div className="text-center text-[8px] font-bold text-gray-300 uppercase italic">
            {t('ticket.pickup_date')}: {new Date(order.pickupDate).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR')}
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default TicketView;
