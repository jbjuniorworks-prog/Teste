import { getMe, getRoles } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function RolesPage() {
  const me = await getMe();

  // Server-side gate: without roles:get_all, it neither fetches nor renders the data.
  if (!me.role.permissions.includes("roles:get_all")) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">No access</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You don&apos;t have permission to view the roles.
          </p>
        </div>
      </div>
    );
  }

  const roles = await getRoles();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Roles</h1>
        <p className="text-sm text-muted-foreground">
          {roles.length} role(s) and their permissions.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <CardTitle>{role.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {role.permissions.map((permission) => (
                <Badge key={permission} variant="secondary">
                  {permission}
                </Badge>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
