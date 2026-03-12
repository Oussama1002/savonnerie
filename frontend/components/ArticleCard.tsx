
import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface ArticleCardProps {
  image: string;
  name: string;
  name_ar?: string;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ image, name, name_ar, quantity, onAdd, onRemove }) => {
  const { t, language } = useLanguage();
  return (
    <div className={`relative flex flex-col p-4 rounded-[2rem] transition-all duration-300 group
      ${quantity > 0 
        ? 'bg-indigo-50/50 ring-2 ring-indigo-500 shadow-xl shadow-indigo-100' 
        : 'bg-white shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] border border-slate-100 hover:shadow-xl hover:shadow-slate-200 hover:-translate-y-1'
      }`}>
      <div className="relative w-full aspect-square mb-4 rounded-3xl overflow-hidden bg-slate-50 flex items-center justify-center">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        {quantity > 0 && (
          <div className="absolute inset-0 bg-indigo-600/10 backdrop-blur-[2px]" />
        )}
      </div>

      <div className={`text-sm font-bold text-slate-800 tracking-tight text-center mb-4 min-h-[40px] flex items-center justify-center px-1 ${language === 'ar' ? 'font-arabic text-base leading-tight' : 'uppercase leading-tight'}`}>
        {language === 'ar' && name_ar ? name_ar : name}
      </div>

      <div className="flex items-center justify-between gap-3 mt-auto">
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className={`w-10 h-10 flex items-center justify-center transition-all duration-300 rounded-2xl
            ${quantity > 0 
              ? 'bg-white text-indigo-600 shadow-sm border border-indigo-100 hover:bg-indigo-50 active:scale-95' 
              : 'bg-slate-50 text-slate-300 opacity-0 pointer-events-none'
            }`}
        >
          <Minus size={18} strokeWidth={3} />
        </button>

        <div className={`flex items-center justify-center font-black text-xl min-w-[32px] transition-all duration-300 ${quantity > 0 ? 'text-indigo-600' : 'text-slate-300'}`}>
          {quantity}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onAdd(); }}
          className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all active:scale-95 shadow-lg
            ${quantity > 0 
              ? 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700' 
              : 'bg-white text-slate-400 border border-slate-200 hover:border-indigo-400 hover:text-indigo-600'
            }`}
        >
          <Plus size={18} strokeWidth={3} />
        </button>
      </div>

      {quantity > 0 && (
        <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[9px] font-black px-2.5 py-1.5 rounded-xl shadow-lg ring-4 ring-white animate-in zoom-in duration-300">
          {t('common.selected')}
        </div>
      )}
    </div>
  );
};

export default ArticleCard;
