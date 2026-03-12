import React from 'react';
import { createOrder } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const Caisse = () => {
  const { t } = useLanguage();

  const handleConfirmOrder = async () => {
    try {
      const order = {
        clientId: null,
        userId: 'USER_ID', // later from auth
        total: 120,
        paid: 50,
        pickupDate: '2026-02-12',
        items: [
          {
            articleId: 'shirt',
            service: t('service.lavage') || 'LAVAGE',
            quantity: 2,
            unitPrice: 10,
            totalPrice: 20
          }
        ]
      };

      const result = await createOrder(order);
      console.log('Order created:', result);

      alert(t('common.order_saved') || 'Commande enregistrée ✅');
    } catch (err) {
      console.error(err);
      alert(t('common.error_save') || 'Erreur lors de l’enregistrement ❌');
    }
  };

  return (
    <button onClick={handleConfirmOrder}>
      {t('pos.finish_order')}
    </button>
  );
};

export default Caisse;
