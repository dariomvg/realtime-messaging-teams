"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOutAction } from "@/lib/auth/supabase/basic-auth/actions";
import { authContent, routes } from "@/lib/config";
import { Button } from "@/components/ui/button";

export function ButtonSignOut({
  variant = "outline",
}: {
  variant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await signOutAction();
      router.replace(routes.login);
      router.refresh();
    });
  }

  return (
    <Button variant={variant} onClick={handleClick} disabled={isPending}>
      {authContent.signOut}
    </Button>
  );
}
