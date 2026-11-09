import type { Metadata } from "next";
import { requirePendingPasswordChange } from "@/lib/supabase/session";
import { authContent, pagesMetadata } from "@/lib/config";
import { FormNewPassword } from "@/components/auth/form-new-password";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = pagesMetadata.changePassword;

export default async function ChangePasswordPage() {
  await requirePendingPasswordChange();
  const content = authContent.changePassword;

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{content.title}</CardTitle>
          <CardDescription>{content.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <FormNewPassword variant="change" />
        </CardContent>
      </Card>
    </main>
  );
}