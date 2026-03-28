import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher(["/login(.*)"]);

// Kept inline — middleware runs on Edge runtime and cannot import Node.js modules
const GUEST_ID_RE = /^guest_[a-zA-Z0-9-]+$/;

export default clerkMiddleware(async (auth, req: NextRequest) => {
  if (isPublicRoute(req)) return;

  // Guest users carry a session cookie — let them through without Clerk auth
  const guestId = req.cookies.get("guestId")?.value;
  if (guestId && GUEST_ID_RE.test(guestId)) return;

  await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
