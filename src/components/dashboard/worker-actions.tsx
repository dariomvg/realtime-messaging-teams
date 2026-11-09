"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteWorkerAction, updateWorkerPositionAction } from "@/lib/supabase/actions";
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

type Props = { userId: string; name: string; position: string | null };

export function WorkerActions({ userId, name, position }: Props) {
  const content = dashboardContent.editWorkerModal;
  const deleteContent = dashboardContent.deleteWorkerDialog;

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [value, setValue] = useState(position ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleting] = useTransition();

  function handleEditOpenChange(next: boolean) {
    setEditOpen(next);
    if (next) {
      setValue(position ?? "");
      setError(null);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value) {
      setError(commonContent.invalidInput);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await updateWorkerPositionAction(userId, value);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success(content.success);
      setEditOpen(false);
    });
  }

  function handleDelete() {
    startDeleting(async () => {
      const result = await deleteWorkerAction(userId);
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
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => handleEditOpenChange(true)}>
          <Pencil />
          {dashboardContent.workersTable.edit}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
          <Trash2 />
          {dashboardContent.workersTable.delete}
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{content.title}</DialogTitle>
            <DialogDescription>{content.description}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-sm font-medium">{name}</p>

            <div className="flex flex-col gap-2">
              <Label htmlFor={`position-${userId}`}>{content.positionLabel}</Label>
              <Select value={value} onValueChange={(next) => setValue(next ?? "")}>
                <SelectTrigger id={`position-${userId}`} className="w-full">
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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteContent.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {name}. {deleteContent.description}
            </AlertDialogDescription>
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