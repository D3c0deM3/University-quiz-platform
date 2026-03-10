import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300',
        secondary: 'bg-gray-100 text-gray-800 dark:bg-zinc-700 dark:text-zinc-300',
        success: 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300',
        warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-300',
        destructive: 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-300',
        outline: 'border border-gray-300 text-gray-700 dark:border-zinc-600 dark:text-zinc-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
