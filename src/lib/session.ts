import { cookies } from "next/headers";
import { getUser, resolveOrgId } from "./auth";

export async function getOrgId(): Promise<{
  orgId: string;
  isAnon: boolean;
  email: string | null;
}> {
  const user = await getUser();
  if (user) {
    const orgId = await resolveOrgId(user.id);
    return { orgId, isAnon: false, email: user.email };
  }

  const jar = await cookies();
  const anonId = jar.get("hunter_anon")?.value;
  if (!anonId) throw new Error("Missing anon session");
  return { orgId: anonId, isAnon: true, email: null };
}
