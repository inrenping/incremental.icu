'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { storage } from '@/lib/storage';
import { toast } from 'sonner';

export default function dashPage() {
  const router = useRouter();

  const handleLogout = () => {
    // 清除本地存储的 token 和用户信息
    storage.clearAuth();
    toast.success("已成功退出登录");
    // 强制跳转回登录页
    router.replace('/login');
  };

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col items-center justify-center gap-4 py-10">
        <h1 className="text-xl font-semibold"></h1>
        <Button variant="destructive" onClick={handleLogout}>
          exit
        </Button>
      </div>
    </div>
  );
}
