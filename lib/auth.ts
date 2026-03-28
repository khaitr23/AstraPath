import { getAuth } from "@clerk/nextjs/server";
import { NextApiRequest, NextApiResponse } from "next";

export const GUEST_ID_RE = /^guest_[a-zA-Z0-9-]+$/;

/** Returns the tenantId for the current request.
 *  Priority: Clerk userId → guest session cookie → null (unauthenticated) */
export async function getTenantId(
  req: NextApiRequest,
  _res: NextApiResponse
): Promise<string | null> {
  const { userId } = getAuth(req);
  if (userId) return userId;

  const guestId = req.cookies["guestId"];
  if (guestId && GUEST_ID_RE.test(guestId)) return guestId;

  return null;
}
