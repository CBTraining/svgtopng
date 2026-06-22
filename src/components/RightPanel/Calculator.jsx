import { useState } from 'react';
import './Calculator.css';

export default function Calculator() {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [isNewNumber, setIsNewNumber] = useState(true);

  const handleNum = (num) => {
    if (isNewNumber) {
      setDisplay(num);
      setIsNewNumber(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  };

  const handleOp = (op) => {
    setEquation(equation + display + ' ' + op + ' ');
    setIsNewNumber(true);
  };

  const handleEqual = () => {
    try {
      // safely evaluate simple math
      const fullEquation = equation + display;
      const sanitized = fullEquation.replace(/[^0-9+\-*/.]/g, '');
      const result = new Function('return ' + sanitized)();
      // Round to 8 decimal places max to avoid JS math float weirdness
      const rounded = Math.round(result * 100000000) / 100000000;
      setDisplay(String(rounded));
      setEquation('');
      setIsNewNumber(true);
    } catch (e) {
      setDisplay('Error');
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
    setIsNewNumber(true);
  };

  return (
    <div className="calculator">
      <div className="calc-display">
        <div className="calc-equation">{equation}</div>
        <div className="calc-main">{display}</div>
      </div>
      <div className="calc-buttons">
        <button className="calc-btn btn-secondary" onClick={handleClear}>C</button>
        <button className="calc-btn btn-secondary" onClick={() => handleOp('/')}>÷</button>
        <button className="calc-btn btn-secondary" onClick={() => handleOp('*')}>×</button>
        <button className="calc-btn btn-secondary" onClick={() => handleOp('-')}>-</button>
        
        <button className="calc-btn" onClick={() => handleNum('7')}>7</button>
        <button className="calc-btn" onClick={() => handleNum('8')}>8</button>
        <button className="calc-btn" onClick={() => handleNum('9')}>9</button>
        <button className="calc-btn btn-secondary" style={{ gridRow: 'span 2' }} onClick={() => handleOp('+')}>+</button>
        
        <button className="calc-btn" onClick={() => handleNum('4')}>4</button>
        <button className="calc-btn" onClick={() => handleNum('5')}>5</button>
        <button className="calc-btn" onClick={() => handleNum('6')}>6</button>
        
        <button className="calc-btn" onClick={() => handleNum('1')}>1</button>
        <button className="calc-btn" onClick={() => handleNum('2')}>2</button>
        <button className="calc-btn" onClick={() => handleNum('3')}>3</button>
        <button className="calc-btn btn-primary" style={{ gridRow: 'span 2' }} onClick={handleEqual}>=</button>
        
        <button className="calc-btn" style={{ gridColumn: 'span 2' }} onClick={() => handleNum('0')}>0</button>
        <button className="calc-btn" onClick={() => handleNum('.')}>.</button>
      </div>
    </div>
  );
}
