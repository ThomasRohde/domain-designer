import React from 'react';
import { RectangleCategory } from '../types';
import { CATEGORY_CONFIGS } from '../utils/constants';

interface CategorySelectorProps {
  selectedCategory?: RectangleCategory;
  onCategoryChange: (category: RectangleCategory) => void;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategory,
  onCategoryChange
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold mb-3">Categories</h3>
      <div className="space-y-2">
        {Object.entries(CATEGORY_CONFIGS).map(([key, config]) => (
          <button
            key={key}
            onClick={() => onCategoryChange(key as RectangleCategory)}
            className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
              selectedCategory === key
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            style={{
              backgroundColor: selectedCategory === key ? config.backgroundColor : undefined,
              borderColor: selectedCategory === key ? config.borderColor : undefined
            }}
          >
            <div className="flex items-center space-x-3">
              <span className="text-lg">{config.icon}</span>
              <div className="flex-1">
                <div 
                  className="font-medium text-sm"
                  style={{ color: config.textColor }}
                >
                  {config.name}
                </div>
                <div className="text-xs opacity-60" style={{ color: config.textColor }}>
                  {key}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategorySelector;