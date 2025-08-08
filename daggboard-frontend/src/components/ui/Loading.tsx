import type { ReactNode } from 'react';

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
  inline?: boolean;
}

export function Loading({ size = 'md', className = '', text, inline = false }: LoadingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const Container = inline ? 'span' : 'div';
  const containerClasses = inline 
    ? `inline-flex items-center ${className}`
    : `flex items-center justify-center ${className}`;

  return (
    <Container className={containerClasses}>
      <svg
        className={`animate-spin ${sizeClasses[size]} text-primary-600`}
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {text && <span className="ml-2 text-gray-600">{text}</span>}
    </Container>
  );
}

export interface LoadingSkeletonProps {
  className?: string;
  children?: ReactNode;
}

export function LoadingSkeleton({ className = '', children }: LoadingSkeletonProps) {
  return (
    <div className={`animate-pulse ${className}`}>
      {children || <div className="bg-gray-200 rounded h-4 w-full" />}
    </div>
  );
}

export interface LoadingOverlayProps {
  loading: boolean;
  children: ReactNode;
  text?: string;
}

export function LoadingOverlay({ loading, children, text = 'Loading...' }: LoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <Loading text={text} />
        </div>
      )}
    </div>
  );
}