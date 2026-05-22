import React from 'react';

export default function KrokLogo({ className = "h-8", height = 32 }: { className?: string, height?: number }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex flex-col leading-none font-black tracking-tighter" style={{ height: `${height}px` }}>
        <span className="text-[1.2em]" style={{ color: '#003DA5' }}>KR<span style={{ color: '#FFD100' }}>O</span>K</span>
      </div>
    </div>
  );
}
