import type { Metadata } from "next";
import { authContent, pagesMetadata } from "@/lib/config";
import { ButtonSignOut } from "@/components/auth/button-sign-out";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = pagesMetadata.noAccess;

export default function NoAccessPage() {
  const content = authContent.noAccess;

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{content.title}</CardTitle>
          <CardDescription>{content.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <ButtonSignOut />
        </CardContent>
      </Card>
    </main>
  );
}