import React from "react";
import { ServiceId, CartItem, ServiceRef } from "../types";
import { SERVICE_ICONS } from "../constants";
import { useLanguage } from "../context/LanguageContext";

interface ServiceSelectorProps {
  item: CartItem;
  services: ServiceRef[];
  onUpdateService: (serviceId: ServiceId) => void;
}

// Map Tailwind color classes to hex values for inline styles
const colorMap: Record<string, string> = {
  "text-blue-500": "#3b82f6",
  "text-yellow-500": "#eab308",
  "text-orange-500": "#f97316",
  "text-purple-500": "#a855f7",
  "text-cyan-500": "#06b6d4",
  "text-green-500": "#22c55e",
  "text-red-500": "#ef4444",
  "text-pink-500": "#ec4899",
};

function getColorHex(color?: string): string {
  if (!color) return "#3b82f6";
  return colorMap[color] || "#3b82f6";
}

const ServiceSelector: React.FC<ServiceSelectorProps> = ({
  item,
  services,
  onUpdateService,
}) => {
  const { language, t } = useLanguage();
  return (
    <div className="flex flex-wrap gap-4 py-2">
      {services.map((service) => {
        const hex = getColorHex(service.color);
        const isSelected = item.serviceId === service.id;
        return (
          <button
            key={service.id}
            onClick={() => onUpdateService(service.id as ServiceId)}
            className={`flex-shrink-0 flex flex-col items-center group w-24 sm:w-28 transition-all active:scale-95`}
          >
            <div
              className={`relative w-full aspect-square rounded-2xl overflow-hidden border-4 mb-2 shadow-sm transition-all ${
                isSelected
                  ? "scale-105 shadow-md"
                  : "border-white bg-white grayscale opacity-60"
              }`}
              style={
                isSelected
                  ? { borderColor: hex, boxShadow: `0 0 0 4px ${hex}20` }
                  : undefined
              }
            >
              {service.image ? (
                <img
                  src={service.image}
                  alt={service.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                  {SERVICE_ICONS[service.id] || (
                    <span className="text-2xl">?</span>
                  )}
                </div>
              )}
              {isSelected && (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ backgroundColor: `${hex}15` }}
                >
                  <div
                    className="text-white p-1 rounded-full"
                    style={{ backgroundColor: hex }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              )}
            </div>
            <span
              className={`text-[10px] sm:text-xs font-black uppercase text-center truncate w-full`}
              style={{ color: isSelected ? hex : "#9ca3af" }}
            >
              {language === "ar" && t(`stock_client.${service.id}`) !== `stock_client.${service.id}`
                ? t(`stock_client.${service.id}`)
                : (service.name_ar || service.name)}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default ServiceSelector;
