import React from 'react';

export default function Skeleton({ 
  width, 
  height, 
  borderRadius, 
  className = '', 
  style = {} 
}) {
  return (
    <div 
      className={`skeleton ${className}`}
      style={{ 
        width: width || '100%', 
        height: height || '100%', 
        borderRadius: borderRadius || 'var(--radius-sm)',
        ...style 
      }}
    />
  );
}
