'use client';
import * as React from 'react';
export function Card({ className='', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`bg-white rounded-2xl border shadow-soft ${className}`}>{children}</div>;
}
export function Button({ className='', variant='solid', ...props }:
  React.ComponentProps<'button'> & { variant?: 'solid'|'outline' }) {
  const base = "px-3 py-2 rounded-full text-sm transition border";
  const styles = variant === 'outline'
    ? "bg-white hover:bg-black/5 border-black/20"
    : "bg-brand-primary text-white hover:opacity-90 border-brand-primary";
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}
export function Input(props: React.ComponentProps<'input'>) {
  return <input {...props} className={`w-full border rounded-xl2 px-3 py-2 bg-white focus:outline-none ${props.className||''}`} />;
}
export function Select(props: React.ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select {...props} className={`w-full border border-zinc-300 rounded-lg px-3 py-2 pr-10 bg-transparent text-[#2e2e2e] focus:outline-none focus:border-[#d96857] transition-colors cursor-pointer appearance-none ${props.className||''}`} />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
export function Badge({ className='', children }:{ className?: string; children: React.ReactNode }) {
  return <span className={`inline-block bg-black/5 text-black/70 text-xs px-2 py-1 rounded-full border ${className}`}>{children}</span>;
}
