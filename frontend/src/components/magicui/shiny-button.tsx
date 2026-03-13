'use client';

import { cn } from '@/lib/utils';
import { motion, useMotionTemplate, useMotionValue } from 'motion/react';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';

interface ShinyButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function ShinyButton({ children, className, ...props }: ShinyButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const { left, top } = e.currentTarget.getBoundingClientRect();
      mouseX.set(e.clientX - left);
      mouseY.set(e.clientY - top);
    },
    [mouseX, mouseY]
  );

  const background = useMotionTemplate`radial-gradient(120px circle at ${mouseX}px ${mouseY}px, rgba(200,255,0,0.15), transparent 60%)`;

  return (
    <motion.button
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-semibold transition-colors',
        className
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{ background }}
      />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  );
}
