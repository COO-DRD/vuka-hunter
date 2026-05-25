import { Card, CardContent, CardHeader } from "@/components/ui/card";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-zinc-800 ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Your lead pipeline at a glance</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}><CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-4" />
            </div>
            <Skeleton className="h-8 w-16" />
          </CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader><Skeleton className="h-5 w-20" /></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-6" />
                  </div>
                  <Skeleton className="h-1.5 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><Skeleton className="h-5 w-28" /></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-8 w-8 rounded-md shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-4 w-6" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
