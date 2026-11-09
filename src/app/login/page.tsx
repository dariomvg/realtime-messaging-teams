import type { Metadata } from "next";
import { authContent, pagesMetadata } from "@/lib/config";
import { FormLogin } from "@/components/auth/form-login";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = pagesMetadata.login;

const LINK_ERRORS = ["auth_callback_failed", "missing_code"];

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const content = authContent.login;
  const params = await searchParams;
  const errorParam = Array.isArray(params.error) ? params.error[0] : params.error;
  const showLinkError = typeof errorParam === "string" && LINK_ERRORS.includes(errorParam);

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{content.title}</CardTitle>
          <CardDescription>{content.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {showLinkError && (
            <p role="alert" className="text-sm text-destructive">
              {content.linkError}
            </p>
          )}
          <FormLogin />
        </CardContent>
      </Card>
    </main>
  );
}