import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth/supabase/basic-auth/actions";
import { authContent, pagesMetadata } from "@/lib/config";
import { FormNewPassword } from "@/components/auth/form-new-password";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = pagesMetadata.resetPassword;

export default async function ResetPasswordPage() {
  // The forgot-password email link creates a recovery session. Without one, back to /login.
  await requireAuth();
  const content = authContent.resetPassword;

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{content.title}</CardTitle>
          <CardDescription>{content.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <FormNewPassword variant="reset" />
        </CardContent>
      </Card>
    </main>
  );
}