import React from 'react';
import './ResultsList.css';

const ResultsList = ({ results, category, day }) => {
  if (!results || results.length === 0) {
    return (
      <div className="results-empty">
        <div className="empty-icon">🔍</div>
        <h3>No encontramos promociones activas</h3>
        <p>No hay descuentos disponibles para {category} hoy ({day}).</p>
        <p className="empty-hint">Probá con otra categoría o volvé mañana.</p>
      </div>
    );
  }

  const getMedal = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}°`;
  };

  const getDiscountLabel = (discount) => {
    const percentage = Math.round(discount * 100);
    if (percentage >= 25) return { text: `${percentage}% OFF`, class: 'high' };
    if (percentage >= 15) return { text: `${percentage}% OFF`, class: 'medium' };
    return { text: `${percentage}% OFF`, class: 'low' };
  };

  const getScoreColor = (score) => {
    if (score <= 1.5) return '#27ae60';
    if (score <= 2.5) return '#f39c12';
    return '#e74c3c';
  };

  return (
    <div className="results-container">
      <div className="results-header">
        <h2>
          🏆 Mejores opciones para {category}
        </h2>
        <span className="day-badge">📅 {day}</span>
      </div>

      <div className="results-list">
        {results.map((result, index) => {
          const discountInfo = getDiscountLabel(result.discount);
          const scoreColor = getScoreColor(result.score);
          
          return (
            <div 
              key={index} 
              className={`result-card ${index === 0 ? 'best' : ''}`}
            >
              <div className="result-rank">
                <span className="medal">{getMedal(index)}</span>
              </div>

              <div className="result-content">
                <h3 className="store-name">{result.store}</h3>
                
                <div className="result-details">
                  <span className={`discount-badge ${discountInfo.class}`}>
                    🏷️ {discountInfo.text}
                  </span>
                  
                  <span className="payment-method">
                    💳 {result.payment_method.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              <div className="result-score">
                <span className="score-label">Score</span>
                <span 
                  className="score-value"
                  style={{ color: scoreColor }}
                >
                  {result.score}
                </span>
                <span className="score-formula">
                  price × (1 - discount)
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="results-footer">
        <p>💡 <strong>Tip:</strong> Menor score = mejor combinación de precio y descuento</p>
      </div>
    </div>
  );
};

export default ResultsList;
