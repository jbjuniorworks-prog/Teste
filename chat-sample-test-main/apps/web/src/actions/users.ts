"use server";

import { revalidatePath } from "next/cache";

import { updateUser } from "@/lib/api";
import { ApiError } from "@/lib/types";

export type UpdateUserState = { error?: string; ok?: boolean };

export async function updateUserAction(
  _prev: UpdateUserState,
  formData: FormData,
): Promise<UpdateUserState> {
  const id = String(formData.get("id") ?? "");
  const body = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    role_id: String(formData.get("role_id") ?? ""),
  };

  try {
    await updateUser(id, body);
  } catch (e) {
    if (e instanceof ApiError) {
      return { error: e.message };
    }
    return { error: "Failed to save" };
  }

  revalidatePath("/users");
  return { ok: true };
}
