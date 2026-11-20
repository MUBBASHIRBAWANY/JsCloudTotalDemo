import React from 'react'
import { Link } from 'react-router-dom'

const variants = {
    outline: 'border-[1.5px] border-primary text-primary hover:bg-primary hover:text-on-primary',
    solid:   'bg-secondary hover:bg-secondary-dark text-on-secondary',
    ghost:   'border border-outline-variant text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
    danger:  'border-[1.5px] border-error text-error hover:bg-error hover:text-on-error',
}

const base = 'inline-flex items-center gap-1.5 text-sm font-medium px-5 py-2 rounded-md transition-all active:scale-95'

const PlusIcon = () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/>
    </svg>
)

const AppButton = ({ children, variant = 'solid', to, icon, onClick, className = '' }) => {
    const classes = `${base} ${variants[variant]} ${className}`

    const content = (
        <>
            {icon && icon}
            {children}
        </>
    )

    const handleClick = (event) => {
        if (event.detail > 1) {
            event.preventDefault()
            event.stopPropagation()
            return
        }
        onClick?.(event)
    }

    if (to) {
        return <Link to={to}><button type="button" className={classes} onDoubleClick={(e) => e.preventDefault()}>{content}</button></Link>
    }

    return (
        <button
            type="button"
            className={classes}
            onClick={handleClick}
            onDoubleClick={(e) => e.preventDefault()}
        >
            {content}
        </button>
    )
}

export { PlusIcon }
export default AppButton