"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateUserAction, type UpdateUserState } from "@/actions/users";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Role, User } from "@/lib/types";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UsersView({
  users,
  roles,
  canEdit,
}: {
  users: User[];
  roles: Role[];
  canEdit: boolean;
}) {
  const [selected, setSelected] = useState<User | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          {users.length} user(s). Click a card to see the details.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {users.map((user) => (
          <Card
            key={user.id}
            onClick={() => setSelected(user)}
            className="cursor-pointer transition-colors hover:border-primary/50 hover:bg-accent/40"
          >
            <CardContent className="flex items-center gap-4">
              <Avatar>
                <AvatarFallback>{initials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{user.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {user.email}
                </p>
              </div>
              <Badge variant="secondary">{user.role.name}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {selected ? (
        <UserDialog
          key={selected.id}
          user={selected}
          roles={roles}
          canEdit={canEdit}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
}

const initialState: UpdateUserState = {};

function UserDialog({
  user,
  roles,
  canEdit,
  onClose,
}: {
  user: User;
  roles: Role[];
  canEdit: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [roleId, setRoleId] = useState(user.role.id);
  const [state, formAction, pending] = useActionState(
    updateUserAction,
    initialState,
  );

  useEffect(() => {
    if (state.ok) {
      toast.success("User updated");
      onClose();
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>User details</DialogTitle>
          <DialogDescription>
            {canEdit
              ? "Edit the fields and save the changes."
              : "You don't have permission to edit."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={user.id} />
          <input type="hidden" name="role_id" value={roleId} />

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={user.name}
              disabled={!canEdit}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={user.email}
              disabled={!canEdit}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={roleId}
              onValueChange={(value) => value && setRoleId(value)}
              disabled={!canEdit}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(canEdit ? roles : [user.role]).map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {canEdit ? (
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  );
}
