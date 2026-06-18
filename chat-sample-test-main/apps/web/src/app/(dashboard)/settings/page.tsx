import { getMyToken } from "@/lib/api";
import { PatSection } from "./pat-section";

export default async function SettingsPage() {
  const token = await getMyToken();

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account and credentials.
        </p>
      </div>

      {/* Stacked sections (GitHub style). New sections go below. */}
      <PatSection token={token} />
    </div>
  );
}
