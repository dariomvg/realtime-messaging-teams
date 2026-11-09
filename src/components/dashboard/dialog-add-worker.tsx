"use client";

import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { createWorkerAction } from "@/lib/supabase/actions";
import { commonContent, dashboardContent, positions } from "@/lib/config";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Random provisional password, without look-alike characters. */
function generatePassword(length = 12): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function DialogAddWorker() {
  const content = dashboardContent.addWorkerModal;
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setPosition("");
      setPassword("");
      setError(null);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "");
    const email = String(formData.get("email") ?? "");

    if (!position) {
      setError(commonContent.invalidInput);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createWorkerAction({ name, email, password, position });
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success(content.success);
      setOpen(false);
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => handleOpenChange(true)}>
        <UserPlus />
        {dashboardContent.header.addWorker}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{content.title}</DialogTitle>
            <DialogDescription>{content.description}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="worker-name">{content.nameLabel}</Label>
              <Input
                id="worker-name"
                name="name"
                placeholder={content.namePlaceholder}
                maxLength={100}
                autoComplete="off"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="worker-email">{content.emailLabel}</Label>
              <Input
                id="worker-email"
                name="email"
                type="email"
                placeholder={content.emailPlaceholder}
                maxLength={254}
                autoComplete="off"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="worker-password">{content.passwordLabel}</Label>
              <div className="flex gap-2">
                <Input
                  id="worker-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={content.passwordPlaceholder}
                  minLength={8}
                  maxLength={72}
                  autoComplete="off"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPassword(generatePassword())}
                >
                  {content.generate}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="worker-position">{content.positionLabel}</Label>
              <Select value={position} onValueChange={(value) => setPosition(value ?? "")}>
                <SelectTrigger id="worker-position" className="w-full">
                  <SelectValue placeholder={content.positionPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? content.submitting : content.submit}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
