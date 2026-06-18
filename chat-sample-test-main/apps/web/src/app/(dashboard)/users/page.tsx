import { getMe, getRoles, getUsers } from "@/lib/api";
import { UsersView } from "./users-view";

export default async function UsersPage() {
  const me = await getMe();
  const users = await getUsers();

  // Server-side check: only admin (users:update) can edit.
  const canEdit = me.role.permissions.includes("users:update");
  // The role dropdown is only needed (and only allowed to be fetched) if editing is possible.
  const roles = canEdit ? await getRoles() : [];

  return <UsersView users={users} roles={roles} canEdit={canEdit} />;
}
