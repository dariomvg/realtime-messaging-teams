"use client";

import { useState, useTransition } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteMessageAction, updateMessagePositionAction } from "@/lib/supabase/actions";
import { commonContent, dashboardContent, positions } from "@/lib/config";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  id: number;
  description: string;
  content: string;
  position: string;
  createdLabel: string;
};

export function MessageActions({ id, description, content, position, createdLabel }: Props) {
  const readContent = dashboardContent.readMessageModal;
  const editContent = dashboardContent.editMessageModal;
  const deleteContent = dashboardContent.deleteMessageDialog;

  const [readOpen, setReadOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [value, setValue] = useState(position);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [isDeleting, startDeleting] = useTransition();

  function handleEditOpenChange(next: boolean) {
    setEditOpen(next);
    if (next) {
      setValue(position);
      setError(null);
    }
  }

  function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value) {
      setError(commonContent.invalidInput);
      return;
    }
    if (value === position) {
      setEditOpen(false);
      return;
    }

    setError(null);
    startSaving(async () => {
      const result = await updateMessagePositionAction(id, value);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success(editContent.success);
      setEditOpen(false);
    });
  }

  function handleDelete() {
    startDeleting(async () => {
      const result = await deleteMessageAction(id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(deleteContent.success);
      setDeleteOpen(false);
    });
  }

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setReadOpen(true)}>
          <Eye />
          {dashboardContent.messagesTable.open}
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleEditOpenChange(true)}>
          <Pencil />
          {dashboardContent.messagesTable.edit}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
          <Trash2 />
          {dashboardContent.messagesTable.delete}
        </Button>
      </div>

      <Dialog open={readOpen} onOpenChange={setReadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{description}</DialogTitle>
            <DialogDescription>
              {readContent.sentTo} {position} · {createdLabel}
            </DialogDescription>
          </DialogHeader>
          <p className="max-h-96 overflow-y-auto text-sm whitespace-pre-wrap">{content}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReadOpen(false)}>
              {readContent.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editContent.title}</DialogTitle>
            <DialogDescription>{editContent.description}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
            <p className="text-sm font-medium">{description}</p>

            <div className="flex flex-col gap-2">
              <Label htmlFor={`message-position-${id}`}>{editContent.positionLabel}</Label>
              <Select value={value} onValueChange={(next) => setValue(next ?? "")}>
                <SelectTrigger id={`message-position-${id}`} className="w-full">
                  <SelectValue placeholder={editContent.positionPlaceholder} />
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
              <Button type="submit" disabled={isSaving}>
                {isSaving ? editContent.submitting : editContent.submit}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteContent.title}</AlertDialogTitle>
            <AlertDialogDescription>{deleteContent.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{deleteContent.cancel}</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {deleteContent.confirm}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}