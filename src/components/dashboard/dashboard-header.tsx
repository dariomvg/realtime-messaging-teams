import { dashboardContent } from "@/lib/config";
import { ButtonSignOut } from "@/components/auth/button-sign-out";
import { DialogAddWorker } from "@/components/dashboard/dialog-add-worker";
import { DialogSendMessage } from "@/components/dashboard/dialog-send-message";

export function DashboardHeader({ adminName }: { adminName: string }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{dashboardContent.header.title}</h1>
        <p className="text-sm text-muted-foreground">{adminName}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <DialogAddWorker />
        <DialogSendMessage />
        <ButtonSignOut />
      </div>
    </header>
  );
}