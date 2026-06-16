import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  IconRun,
  IconTreadmill,
  IconFileUnknown,
  IconFileTextShield,
  IconExternalLink,
  IconBrandStrava,
  IconBrandWechat
} from "@tabler/icons-react";

export function SiteExplore() {
  return (
    <footer className="border-t pt-5 bg-background w-full">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* 第一列: 链接 */}
        <Card className="gap-0.5 py-0 border-none shadow-none bg-transparent">
          <CardHeader className="mt-2">
            <CardTitle className="text-2xl font-bold">相关文档</CardTitle>
          </CardHeader>
          <CardContent className="mt-2">
            <Button variant="ghost" className="w-full justify-start gap-3 text-sm text-muted-foreground hover:text-foreground">
              <IconFileTextShield className="h-5 w-5" />
              隐私政策
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 text-sm text-muted-foreground hover:text-foreground">
              <IconFileUnknown className="h-5 w-5" />
              使用说明
            </Button>
          </CardContent>
          <CardHeader className="mt-2 pt-10">
            <CardTitle className="text-2xl font-bold">相关平台</CardTitle>
          </CardHeader>
          <CardContent className="mt-2">
            <Button variant="ghost" className="w-full justify-start gap-3 text-sm text-muted-foreground hover:text-foreground">
              <IconRun className="h-5 w-5" />
              佳明国际版
              <IconExternalLink className="h-3 w-3" />
            </Button> <Button variant="ghost" className="w-full justify-start gap-3 text-sm text-muted-foreground hover:text-foreground">
              <IconRun className="h-5 w-5" />
              佳明中国版
              <IconExternalLink className="h-3 w-3" />
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 text-sm text-muted-foreground hover:text-foreground">
              <IconTreadmill className="h-5 w-5" />
              高驰训练管理平台
              <IconExternalLink className="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>

        {/* 第二列: 探索 */}
        <div className="flex flex-col gap-4">
          <Card className="gap-0.5 py-0 border-none shadow-none bg-transparent">
            <CardHeader className="mt-2">
              <CardTitle className="text-2xl font-bold">探索</CardTitle>
            </CardHeader>
            <CardContent className="mt-2">
              <Button variant="ghost" className="w-full justify-start gap-3 text-sm text-muted-foreground hover:text-foreground">
                跑力
                <IconExternalLink className="h-3 w-3" />
              </Button> <Button variant="ghost" className="w-full justify-start gap-3 text-sm text-muted-foreground hover:text-foreground">
                intervals.icu
                <IconExternalLink className="h-3 w-3" />
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3 text-sm text-muted-foreground hover:text-foreground">
                Dailysync
                <IconExternalLink className="h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 第三列: 作者信息 */}
        <div className="flex flex-col gap-4">
          <Card className="gap-0.5 py-0 border-none shadow-none bg-transparent">
            <CardHeader className="mt-2">
              <CardTitle className="text-2xl font-bold">联系作者</CardTitle>
            </CardHeader>
            <CardContent className="px-0 mt-0">
              <Button variant="ghost" className="w-full justify-start gap-3 text-sm text-muted-foreground hover:text-foreground">
                <IconBrandWechat />
                加微信联系（微信号：inrenping）
                <IconExternalLink className="h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 第四列: iframe (占50%宽度) */}
        <div className="md:col-span-1">
          <Card className="gap-0.5 py-0 border-none shadow-none bg-transparent">
            <CardHeader className="mt-2">
              <CardTitle className="text-2xl font-bold flex items-left gap-2">
                <IconBrandStrava className="h-6 w-6 text-[#FC4C02]" />
                <span>加入 Strava Club</span>
              </CardTitle>
            </CardHeader>
            <iframe
              title="Strava Activity"
              width="100%"
              height="454"
              scrolling="no"
              src='https://www.strava.com/clubs/2195257/latest-rides/cf8a59f301f929036ecc77f53f351e35596757ee?show_rides=true'
              className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow duration-300"
            />
          </Card>
        </div>
      </div>
    </footer>
  );
}