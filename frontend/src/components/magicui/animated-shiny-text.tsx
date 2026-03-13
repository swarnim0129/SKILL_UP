'use client';

import { cn } from '@/lib/utils';
import { motion, type HTMLMotionProps } from 'motion/react';
import { type ReactNode, type CSSProperties } from 'react';

interface AnimatedShinyTextProps extends HTMLMotionProps<'span'> {
  children: ReactNode;
  className?: string;
  shimmerWidth?: number;
}

export function AnimatedShinyText({
  children,
  className,
  shimmerWidth = 100,
  ...props
}: AnimatedShinyTextProps) {
  return (
    <motion.span
      className={cn(
        'inline-flex items-center justify-center',
        className
      )}
      style={
        {
          '--shimmer-width': `${shimmerWidth}px`,
          backgroundImage:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0) 60%, transparent 100%)',
          backgroundSize: `${shimmerWidth}px 100%`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: '-100% 0',
          WebkitBackgroundClip: 'text',
        } as CSSProperties
      }
      animate={{
        backgroundPosition: ['0% 0%', '200% 0%'],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: 'linear',
      }}
      {...props}
    >
      {children}
    </motion.span>
  );
}
