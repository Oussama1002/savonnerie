
import React from 'react';
import { ServiceId, CartItem } from '../types';
import { SERVICES } from '../constants';

interface ServiceSelectorProps {
  item: CartItem;
  onUpdateService: (serviceId: ServiceId) => void;
}

const ServiceSelector: React.FC<ServiceSelectorProps> = ({ item, onUpdateService }) => {
  return (
    <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
      {SERVICES.map((service) => (
        <button
          key={service.id}
          onClick={() => onUpdateService(service.id)}
          className={`flex-shrink-0 flex flex-col items-center group w-24 sm:w-28 transition-all active:scale-95`}
        >
          <div className={`relative w-full aspect-square rounded-2xl overflow-hidden border-4 mb-2 shadow-sm transition-all ${
            item.serviceId === service.id
              ? 'border-blue-500 ring-4 ring-blue-500/10 scale-105 shadow-md'
              : 'border-white bg-white grayscale opacity-60'
          }`}>
            <img 
              src={(service as any).image} 
              alt={service.label} 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            {item.serviceId === service.id && (
              <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center">
                <div className="bg-blue-500 text-white p-1 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}
          </div>
          <span className={`text-[10px] sm:text-xs font-black uppercase text-center truncate w-full ${
            item.serviceId === service.id ? 'text-blue-600' : 'text-gray-400'
          }`}>
            {service.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default ServiceSelector;
