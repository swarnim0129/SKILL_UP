'use client';

import { cn } from '@/lib/utils';
import { motion, useScroll, useTransform } from 'motion/react';
import { useRef, type ReactNode } from 'react';

interface TextRevealProps {
  text: string;
  className?: string;
}

export function TextReveal({ text, className }: TextRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 0.9', 'start 0.2'],
  });

  const words = text.split(' ');

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <p className="flex flex-wrap text-3xl md:text-5xl font-extrabold leading-tight tracking-tight">
        {words.map((word, i) => {
          const start = i / words.length;
          const end = start + 1 / words.length;
          return (
            <Word key={i} progress={scrollYProgress} range={[start, end]}>
              {word}
            </Word>
          );
        })}
      </p>
    </div>
  );
}

function Word({
  children,
  progress,
  range,
}: {
  children: ReactNode;
  progress: any;
  range: [number, number];
}) {
  const opacity = useTransform(progress, range, [0.15, 1]);
  const y = useTransform(progress, range, [8, 0]);

  return (
    <motion.span style={{ opacity, y }} className="mr-2 mt-1 inline-block transition-colors">
      {children}
    </motion.span>
  );
}
