import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/auth(.*)",
  "/api/v1(.*)",
  "/heart(.*)",
  "/doc(.*)",
  "/",
]);

export default clerkMiddleware(async (auth, request) => {
  // 已登录用户访问首页（精确匹配 "/"，不匹配 /doc、/heart 等公开子路由）直接进控制台，
  // 避免停在营销落地页；未登录则正常展示落地页。/dash 不会回跳到 "/"，故不会形成循环。
  const { userId } = await auth();
  if (userId && request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/dash", request.url));
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
