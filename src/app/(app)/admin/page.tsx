import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ActivityFeed } from "./ActivityFeed";
import { Shield } from "lucide-react";

const ADMIN_EMAILS = new Set(["ian.dullu@akamom.org", "dr.dullu@gmail.com"]);

export default async function AdminPage() {
  const user = await requireUser();
  if (!ADMIN_EMAILS.has(user.email ?? "")) redirect("/dashboard");

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600/20 border border-red-600/30">
          <Shield className="h-4 w-4 text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Activity Monitor</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Live user activity · error log · self-healing</p>
        </div>
      </div>
      <ActivityFeed />
    </div>
  );
}
