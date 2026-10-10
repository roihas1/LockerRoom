"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { he } from "@/config/strings";

interface ShareButtonProps {
  /** Same-origin path, e.g. `/games/12`. */
  path: string;
  /** Message sent with the link (WhatsApp text / share sheet text). */
  text: string;
  title?: string;
  label?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md";
  className?: string;
}

function absoluteUrl(path: string) {
  return new URL(path, window.location.origin).toString();
}

/** Native share sheet on phones; WhatsApp and copy-link everywhere else. */
export function ShareButton({ path, text, title, label = he.share.share, variant = "secondary", size = "sm", className }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const share = async (e: MouseEvent) => {
    if (typeof navigator.share !== "function") return;
    e.preventDefault();
    try {
      await navigator.share({ title, text, url: absoluteUrl(path) });
    } catch (err) {
      if ((err as DOMException)?.name !== "AbortError") setOpen(true);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(absoluteUrl(path));
      setCopied(true);
      toast.success(he.share.copied);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(he.errors.generic);
    }
  };

  const whatsapp = () => `https://wa.me/?text=${encodeURIComponent(`${text}\n${absoluteUrl(path)}`)}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} onClick={share} className={className}>
          <Share2 aria-hidden />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent title={label} description={text} variant="sheet">
        <div className="grid gap-2">
          <Button asChild className="w-full bg-[#25D366] text-black">
            <a href={open ? whatsapp() : "#"} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
              {he.share.whatsapp}
            </a>
          </Button>
          <Button variant="secondary" className="w-full" onClick={copy}>
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            {he.share.copyLink}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
