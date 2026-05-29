'use client';

import Link from "next/link";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  IconCircleCheckFilled,
  IconAlertCircleFilled,
  IconDeviceWatch
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { AppConfig } from "@/app/dash/page";

interface AppCardProps {
  app: AppConfig;
  onConnect: (app: AppConfig) => void;
  onRefresh: (id: number) => void;
  onTest: (id: number) => void;
}

export function AppCard({ app, onConnect, onRefresh, onTest }: AppCardProps) {
  const t = useTranslations('DashPage');

  return (
    <Card className="relative">
      {app.is_active && app.total_count !== undefined && app.total_count > 0 && (
        <Link href={`/dash/activities?platform=${app.source_type}&email=${app.account}`} className="absolute -top-3 -right-3 z-20 hover:scale-110 transition-transform">
          <Badge className="rounded-full px-2.5 py-0 h-7 min-w-7 flex items-center justify-center text-sm font-bold border-2 border-background shadow-lg bg-primary text-primary-foreground cursor-pointer">
            {app.total_count}
          </Badge>
        </Link>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <IconDeviceWatch className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base">{app.source_type}</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 gap-1 border-emerald-200">
            <IconCircleCheckFilled className="h-3 w-3" />
            {t("connected")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* <p className="text-muted-foreground text-xs leading-relaxed">
          {app.guid}
        </p> */}
        <div className="space-y-1.5 border-t pt-3">
          {app.account && (
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">{t("account")}</span>
              <span className="font-medium truncate">{app.account}</span>
            </div>
          )}
          {app.region && (
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">{t("region")}</span>
              <span className="font-medium">{app.region}</span>
            </div>
          )}
          {app.updated_at && (
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">{t("addedAt")}</span>
              <span className="font-medium font-mono">{dayjs(app.updated_at).format('YYYY-MM-DD HH:mm')}</span>
            </div>
          )}
          {app.last_synced_at && (
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">{t("lastSyncedTime")}</span>
              <span className="font-medium font-mono">{dayjs(app.last_synced_at).format('YYYY-MM-DD HH:mm')}</span>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            className={cn("text-muted-foreground", "flex-1")}
            onClick={() => onTest(app.id)}
          >
            测试
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn("text-muted-foreground", "flex-1")}
            onClick={() => onConnect(app)}
          >
            {t("reconnectAccount")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 text-muted-foreground gap-1"
            onClick={() => onRefresh(app.id)}
          >
            {t("refreshAuthentication")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}