import React from 'react'

export const Button: React.FC<any> = ({ children, ...props }) =>
  React.createElement('button', { style: { padding: '8px 16px', borderRadius: '8px', border: '1px solid #444', background: '#1a1a2e', color: '#fff', cursor: 'pointer', ...props.style }, ...props }, children)

export const Card: React.FC<any> = ({ children, ...props }) =>
  React.createElement('div', { style: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', ...props.style }, ...props }, children)

export const Badge: React.FC<any> = ({ children, ...props }) =>
  React.createElement('span', { style: { display: 'inline-block', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', color: '#aaa', ...props.style }, ...props }, children)