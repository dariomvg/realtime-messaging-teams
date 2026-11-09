import type { Metadata } from "next";
import { authContent, pagesMetadata } from "@/lib/config";
import { FormForgotPassword } from "@/components/auth/form-forgot-password";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = pagesMetadata.forgotPassword;

export default function ForgotPasswordPage() {
  const content = authContent.forgotPassword;

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{content.title}</CardTitle>
          <CardDescription>{content.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <FormForgotPassword />
        </CardContent>
      </Card>
    </main>
  );
}
