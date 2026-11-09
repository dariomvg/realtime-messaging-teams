"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { forgotPasswordAction } from "@/lib/auth/supabase/basic-auth/actions";
import { authContent, getAuthErrorMessage, routes } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Supabase allows one recovery email per user every 60 seconds.
const COOLDOWN_SECONDS = 60;

export function FormForgotPassword() {
  const content = authContent.forgotPassword;
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    setError(null);
    setSent(false);
    startTransition(async () => {
      const { error } = await forgotPasswordAction({ email });
      // Supabase answers "ok" for unknown emails, so any error here is a real
      // failure (rate limit, SMTP...) and must be shown, not hidden.
      if (error) {
        setError(getAuthErrorMessage(error.code));
        return;
      }
      setSent(true);
      setCooldown(COOLDOWN_SECONDS);
    });
  }

  const label =
    cooldown > 0
      ? `${content.resendIn} ${cooldown}s`
      : isPending
        ? content.submitting
        : content.submit;

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

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {sent && (
        <p role="status" className="text-sm text-muted-foreground">
          {content.success}
        </p>
      )}

      <Button type="submit" disabled={isPending || cooldown > 0} className="w-full">
        {label}
      </Button>

      <Link
        href={routes.login}
        className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        {content.backToLogin}
      </Link>
    </form>
  );
}