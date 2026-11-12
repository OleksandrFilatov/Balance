import { t as tr } from "@/i18n";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ReactNode, RefObject } from "react";
import { X } from "lucide-react";
import { Button } from "./button";
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  busy = false,
  returnFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children: ReactNode;
  busy?: boolean;
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(value) => {
        if (!value && !busy) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay" />
        <DialogPrimitive.Content
          className="dialog-content"
          onCloseAutoFocus={(event) => {
            if (returnFocusRef?.current?.isConnected) {
              event.preventDefault();
              returnFocusRef.current.focus();
            }
          }}
          onOpenAutoFocus={(e) => {
            const input = (
              e.currentTarget as HTMLElement
            ).querySelector<HTMLElement>("[data-autofocus]");
            if (input) {
              e.preventDefault();
              input.focus();
            }
          }}
          onEscapeKeyDown={(e) => {
            if (busy) e.preventDefault();
          }}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className="dialog-heading">
            <DialogPrimitive.Title className="dialog-title">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="dialog-description">
              {description}
            </DialogPrimitive.Description>
          </div>
          {children}
          <DialogPrimitive.Close asChild>
            <Button
              variant="ghost"
              size="icon"
              className="dialog-close"
              disabled={busy}
              aria-label={tr("Закрыть окно")}
            >
              <X size={18} />
            </Button>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
