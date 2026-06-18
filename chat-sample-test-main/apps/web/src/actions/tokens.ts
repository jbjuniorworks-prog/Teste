"use server";

import { revalidatePath } from "next/cache";

import { issueToken, deleteMyToken } from "@/lib/api";
import { ApiError } from "@/lib/types";

export type IssueTokenResult = { token?: string; error?: string };

export async function issueTokenAction(): Promise<IssueTokenResult> {
  try {
    const issued = await issueToken();
    revalidatePath("/settings");
    return { token: issued.token };
  } catch (e) {
    return {
      error: e instanceof ApiError ? e.message : "Failed to generate token",
    };
  }
}

export async function deleteTokenAction(): Promise<{ error?: string }> {
  try {
    await deleteMyToken();
    revalidatePath("/settings");
    return {};
  } catch (e) {
    return {
      error: e instanceof ApiError ? e.message : "Failed to delete token",
    };
  }
}
