/**
 * Safely evaluates a basic arithmetic expression.
 * Supports numbers, decimals, +, -, *, /, and parentheses.
 * Returns the evaluated number rounded to 2 decimal places, or null if invalid.
 */
export function evaluateMath(str) {
  if (!str) return null;
  
  // Remove all whitespace
  const cleanStr = str.replace(/\s+/g, '');
  
  // Allow only digits, +, -, *, /, dots, and parentheses
  if (!/^[0-9+\-*/().]+$/.test(cleanStr)) {
    return null;
  }
  
  try {
    // Safe sandbox invocation for pure math evaluation
    const result = new Function(`return (${cleanStr})`)();
    
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      // Round to 2 decimal places for financial calculations
      return Math.round(result * 100) / 100;
    }
  } catch (e) {
    console.warn('Math parsing failed for expression:', cleanStr, e);
  }
  return null;
}
