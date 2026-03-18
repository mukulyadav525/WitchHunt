import React from 'react';
import { cn } from '../../lib/utils';

export { cn };

export const Card = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("card", className)} {...props}>
        {children}
    </div>
);

export const Button = ({
    children,
    className,
    variant = 'primary',
    size = 'md',
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost',
    size?: 'sm' | 'md' | 'lg'
}) => {
    const variants = {
        primary: "btn-primary",
        secondary: "btn-secondary",
        danger: "btn-danger",
        ghost: "btn-ghost"
    };

    const sizes = {
        sm: "btn-sm",
        md: "",
        lg: "btn-lg"
    };

    return (
        <button
            className={cn("btn", variants[variant], sizes[size], className)}
            {...props}
        >
            {children}
        </button>
    );
};

export const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        className={cn("input", className)}
        {...props}
    />
);

export const TextArea = ({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea
        className={cn("textarea", className)}
        {...props}
    />
);

export const Textarea = TextArea;

export const Badge = ({ children, className, variant = 'info', ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: 'info' | 'success' | 'warning' | 'error' }) => {
    const variants = {
        info: "badge-info",
        success: "badge-success",
        warning: "badge-warning",
        error: "badge-danger"
    };

    return (
        <span className={cn("badge", variants[variant], className)} {...props}>
            {children}
        </span>
    );
};
