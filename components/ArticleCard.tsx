
import React from 'react';
import { Plus, Minus } from 'lucide-react';

interface ArticleCardProps {
  image: string;
  name: string;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ image, name, quantity, onAdd, onRemove }) => {
  return (
    <div className={`relative flex flex-col items-center justify-between p-3 rounded-[2.5rem] border-4 transition-all active:scale-95 h-52 sm:h-[20rem] group ${quantity > 0 ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-white'
      }`}>
      <div className="w-full h-24 sm:h-[13rem] mb-2 rounded-2xl overflow-hidden shadow-inner bg-gray-50 flex items-center justify-center">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
      </div>

      <div className="text-sm sm:text-base font-black text-gray-800 uppercase text-center truncate w-full px-2">
        {name}
      </div>

      <div className="flex items-center gap-3 mt-1">
        {quantity > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="w-10 h-10 flex items-center justify-center bg-gray-200 text-gray-700 rounded-2xl active:bg-gray-300"
          >
            <Minus size={20} />
          </button>
        )}

        <div className={`flex items-center justify-center font-black text-lg min-w-[24px] ${quantity > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
          {quantity}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onAdd(); }}
          className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-2xl active:bg-blue-700 shadow-lg shadow-blue-100"
        >
          <Plus size={20} />
        </button>
      </div>

      {quantity > 0 && (
        <div className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-lg">
          SELECTIONNÉ
        </div>
      )}
    </div>
  );
};

export default ArticleCard;
