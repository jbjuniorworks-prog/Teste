"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { issueTokenAction, deleteTokenAction } from "@/actions/tokens";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { TokenInfo } from "@/lib/types";

export function PatSection({ token }: { token: TokenInfo | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [revealed, setRevealed] = useState<string | null>(null);

  function issue() {
    startTransition(async () => {
      const res = await issueTokenAction();
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setRevealed(res.token ?? null);
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const res = await deleteTokenAction();
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Token deleted");
      router.refresh();
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-primary" />
            Personal Access Token
          </CardTitle>
          <CardDescription>
            A personal access token to authenticate integrations (e.g. MCP).
            You only see the value once, at the moment it is generated.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {token ? (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-mono text-sm">{token.prefix}…</p>
                <p className="text-xs text-muted-foreground">
                  Created on {new Date(token.created_at).toLocaleString("en-US")}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              You don&apos;t have a token yet.
            </p>
          )}
        </CardContent>

        <CardFooter className="gap-2">
          {token ? (
            <>
              <Button onClick={issue} disabled={pending}>
                Regenerate
              </Button>
              <Button variant="outline" onClick={remove} disabled={pending}>
                Delete
              </Button>
            </>
          ) : (
            <Button onClick={issue} disabled={pending}>
              Generate token
            </Button>
          )}
        </CardFooter>
      </Card>

      <RevealDialog token={revealed} onClose={() => setRevealed(null)} />
    </>
  );
}

function RevealDialog({
  token,
  onClose,
}: {
  token: string | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    toast.success("Copied");
  }

  return (
    <Dialog open={token !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Your new token</DialogTitle>
          <DialogDescription>
            Copy it now — it will not be shown again. Keep it in a safe place.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Input readOnly value={token ?? ""} className="font-mono text-xs" />
          <Button type="button" variant="outline" size="icon" onClick={copy}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
