'use client';

import { cn } from '@/lib/utils';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { type ReactNode, useRef, useState } from 'react';

interface MagicCardProps {
  children: ReactNode;
  className?: string;
  gradientColor?: string;
  gradientSize?: number;
}

export function MagicCard({
  children,
  className,
  gradientColor = 'rgba(200, 255, 0, 0.08)',
  gradientSize = 250,
}: MagicCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [isHovered, setIsHovered] = useState(false);

  const springX = useSpring(mouseX, { stiffness: 300, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(springY, [-0.5, 0.5], ['2deg', '-2deg']);
  const rotateY = useTransform(springX, [-0.5, 0.5], ['-2deg', '2deg']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: '800px' }}
      className={cn('relative overflow-hidden rounded-2xl transition-shadow', className)}
    >
      {isHovered && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background: `radial-gradient(${gradientSize}px circle at ${50 + springX.get() * 100}% ${50 + springY.get() * 100}%, ${gradientColor}, transparent 60%)`,
          }}
        />
      )}
      {children}
    </motion.div>
  );
}
