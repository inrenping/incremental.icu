"use client";

import { Suspense, useState, useEffect } from 'react';
import { IconBrandGithubFilled } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function GitHubLink() {
  return (
    <Button asChild size="sm" variant="ghost" className="h-8 shadow-none gap-2">
      <a href="https://github.com/inrenping/incremental.icu" target="_blank" rel="noreferrer">
        <IconBrandGithubFilled className="h-4 w-4" />
        <Suspense fallback={<Skeleton className="h-4 w-8" />}>
          <StarsCount />
        </Suspense>
      </a>
    </Button>
  );
}

export function StarsCount() {
  const [stars, setStars] = useState<string | null>(null);

  useEffect(() => {
    async function getStars() {
      try {
        const res = await fetch("https://api.github.com/repos/inrenping/incremental.icu");
        const json = await res.json();

        const count = json.stargazers_count;
        const formattedCount = count >= 1000
          ? `${Math.round(count / 1000)}k`
          : count?.toLocaleString();

        setStars(formattedCount);
      } catch (error) {
        console.error("Failed to fetch GitHub stars:", error);
        setStars("0");
      }
    }

    getStars();
  }, []);

  return (
    <span className="w-fit text-xs text-muted-foreground tabular-nums">
      {stars ?? null}
    </span>
  );
}