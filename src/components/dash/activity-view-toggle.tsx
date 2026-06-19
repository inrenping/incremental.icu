'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface ActivityViewToggleProps {
  href: string;
  label: string;
  children: React.ReactNode;
}

export function ActivityViewToggle({ href, label, children }: ActivityViewToggleProps) {
  return (
    <Button
      variant="outline"
      size="icon"
      className="h-8 w-8 shrink-0"
      asChild
      title={label}
    >
      <Link href={href}>{children}</Link>
    </Button>
  );
}
