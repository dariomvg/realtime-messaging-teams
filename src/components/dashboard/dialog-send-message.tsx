"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { sendMessageAction } from "@/lib/supabase/actions";
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
import { Textarea } from "@/components/ui/textarea";

export function DialogSendMessage() {
  const content = dashboardContent.sendMessageModal;
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setPosition("");
      setError(null);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const description = String(formData.get("description") ?? "");
    const body = String(formData.get("content") ?? "");

    if (!position) {
      setError(commonContent.invalidInput);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await sendMessageAction({
        recipientPosition: position,
        description,
        content: body,
      });
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
      <Button onClick={() => handleOpenChange(true)}>
        <Send />
        {dashboardContent.header.sendMessage}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{content.title}</DialogTitle>
            <DialogDescription>{content.description}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="message-position">{content.positionLabel}</Label>
              <Select value={position} onValueChange={(value) => setPosition(value ?? "")}>
                <SelectTrigger id="message-position" className="w-full">
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

            <div className="flex flex-col gap-2">
              <Label htmlFor="message-description">{content.descriptionLabel}</Label>
              <Input
                id="message-description"
                name="description"
                placeholder={content.descriptionPlaceholder}
                maxLength={200}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="message-content">{content.contentLabel}</Label>
              <Textarea
                id="message-content"
                name="content"
                placeholder={content.contentPlaceholder}
                maxLength={5000}
                rows={6}
                required
              />
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
