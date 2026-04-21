'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { storage } from '@/lib/storage';
import { toast } from "sonner";

export default function GitHubCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');

  useEffect(() => {
    if (!code) return;

    const exchangeCode = async () => {
      try {
        // 调用后端 API。注意路径包含 /api/v1
        const res = await fetch(`/api/v1/auth/github-login-by-code?code=${code}`, {
          method: 'POST',
        });

        const data = await res.json();

        if (res.ok) {
          // 存储 Token 和用户信息，逻辑与你的 Google 登录完全一致
          storage.set('accessToken', data.access_token);
          storage.set('user', data.user);

          toast.success("登录成功！");
          router.replace('/dash');
        } else {
          toast.error(data.detail || "GitHub 登录失败");
          router.push('/login');
        }
      } catch (err) {
        toast.error("网络错误");
        router.push('/login');
      }
    };

    exchangeCode();
  }, [code, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
        <p className="text-sm text-gray-500">正在通过 GitHub 验证...</p>
      </div>
    </div>
  );
}