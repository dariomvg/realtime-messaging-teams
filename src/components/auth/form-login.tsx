"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInAction } from "@/lib/auth/supabase/basic-auth/actions";
import { authContent, getAuthErrorMessage, routes } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormLogin() {
  const router = useRouter();
  const content = authContent.login;
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    setError(null);
    startTransition(async () => {
      const { error } = await signInAction({ email, password });
      if (error) {
        setError(getAuthErrorMessage(error.code));
        return;
      }
      // "/" decides where to send the user based on their role.
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">{content.emailLabel}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={content.emailPlaceholder}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{content.passwordLabel}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder={content.passwordPlaceholder}
          required
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? content.submitting : content.submit}
      </Button>

      <Link
        href={routes.forgotPassword}
        className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        {content.forgotPassword}
      </Link>
    </form>
  );
}
