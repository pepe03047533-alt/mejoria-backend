import React, { useState } from 'react';
import './RecommendationSearch.css';

const CATEGORIES = [
  { value: 'carne', label: '🥩 Carnes', color: '#e74c3c' },
  { value: 'limpieza', label: '🧴 Limpieza', color: '#3498db' },
  { value: 'bebidas', label: '🥤 Bebidas', color: '#2ecc71' },
  { value: 'lacteos', label: '🥛 Lácteos', color: '#f39c12' },
];

const RecommendationSearch = ({ onSearch, loading }) => {
  const [category, setCategory] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (category) {
      onSearch(category);
    }
  };

  const handleSelect = (value) => {
    setCategory(value);
    setIsOpen(false);
  };

  const selectedCategory = CATEGORIES.find(c => c.value === category);

  return (
    <div className="search-container">
      <h1 className="search-title">
        🛒 ¿Dónde conviene comprar hoy?
      </h1>
      <p className="search-subtitle">
        Descubrí las mejores promociones según tu medio de pago
      </p>

      <form onSubmit={handleSubmit} className="search-form">
        <div className="dropdown-container">
          <button
            type="button"
            className="dropdown-trigger"
            onClick={() => setIsOpen(!isOpen)}
            style={{ 
              borderColor: selectedCategory?.color || '#ddd',
              backgroundColor: selectedCategory?.color + '10' || 'white'
            }}
          >
            {selectedCategory ? selectedCategory.label : '📂 Seleccioná una categoría'}
            <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
          </button>

          {isOpen && (
            <div className="dropdown-menu">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  className={`dropdown-item ${category === cat.value ? 'selected' : ''}`}
                  onClick={() => handleSelect(cat.value)}
                  style={{ 
                    '--hover-color': cat.color + '15',
                    '--selected-color': cat.color + '25'
                  }}
                >
                  <span className="category-icon">{cat.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="search-button"
          disabled={!category || loading}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Buscando...
            </>
          ) : (
            '🔍 Buscar mejores opciones'
          )}
        </button>
      </form>
    </div>
  );
};

export default RecommendationSearch;
