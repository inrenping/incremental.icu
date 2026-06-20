'use client';

import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  IconCircleCheckFilled,
  IconDeviceWatch
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { AppConfig } from "@/app/dash/page";

interface AppCardProps {
  app: AppConfig;
  onConnect: (app: AppConfig) => void;
  onRefresh: (id: number) => void;
}

export function AppCard({ app, onConnect, onRefresh }: AppCardProps) {
  const t = useTranslations('DashPage');

  return (
    <Card className="relative">
      <div className="flex items-center gap-6 p-6">
        <div className="p-3 bg-primary/10 rounded-xl">
          <IconDeviceWatch className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <CardTitle className="text-lg">{app.source_type}</CardTitle>
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 gap-1 border-emerald-200">
              <IconCircleCheckFilled className="h-3 w-3" />
              {t("connected")}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {app.account && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{t("account")}</span>
                <span className="font-medium">{app.account}</span>
              </div>
            )}
            {app.region && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{t("region")}</span>
                <span className="font-medium">{app.region}</span>
              </div>
            )}
            {app.updated_at && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{t("addedAt")}</span>
                <span className="font-medium font-mono">{dayjs(app.updated_at).format('YYYY-MM-DD HH:mm')}</span>
              </div>
            )}
            {app.last_synced_at && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{t("lastSyncedTime")}</span>
                <span className="font-medium font-mono">{dayjs(app.last_synced_at).format('YYYY-MM-DD HH:mm')}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onConnect(app)}
          >
            {t("reconnectAccount")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onRefresh(app.id)}
          >
            {t("refreshAuthentication")}
          </Button>
        </div>
      </div>
    </Card>
  );
}