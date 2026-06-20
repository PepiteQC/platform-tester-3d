import React from 'react'

type AnyProps = React.PropsWithChildren<Record<string, any>>

function stripDesignProps(props: AnyProps) {
  const { children, variant, size, asChild, ...domProps } = props
  return { children, domProps }
}

export const Button: React.FC<AnyProps> = (props) => {
  const { children, domProps } = stripDesignProps(props)
  return React.createElement(
    'button',
    {
      ...domProps,
      style: {
        padding: '8px 16px',
        borderRadius: '8px',
        border: '1px solid #444',
        background: '#1a1a2e',
        color: '#fff',
        cursor: 'pointer',
        ...domProps.style
      }
    },
    children
  )
}

export const Card: React.FC<AnyProps> = (props) => {
  const { children, domProps } = stripDesignProps(props)
  return React.createElement(
    'div',
    {
      ...domProps,
      style: {
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '16px',
        ...domProps.style
      }
    },
    children
  )
}

export const Badge: React.FC<AnyProps> = (props) => {
  const { children, domProps } = stripDesignProps(props)
  return React.createElement(
    'span',
    {
      ...domProps,
      style: {
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.1)',
        fontSize: '12px',
        color: '#aaa',
        ...domProps.style
      }
    },
    children
  )
}

export const AppShell: React.FC<AnyProps> = ({ children, ...props }) =>
  React.createElement('div', { ...props }, children)

export const AppShellSidebar: React.FC<AnyProps> = ({ children, ...props }) =>
  React.createElement('aside', { ...props }, children)

export const AppShellMain: React.FC<AnyProps> = ({ children, ...props }) =>
  React.createElement('main', { ...props }, children)

export const SidebarGroup: React.FC<AnyProps> = ({ children, ...props }) =>
  React.createElement('div', { ...props }, children)

export const SidebarItem: React.FC<AnyProps> = ({ children, ...props }) =>
  React.createElement('button', { ...props }, children)
