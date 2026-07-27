import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Lightweight scroll container using native overflow with the themed
 * scrollbars from globals.css. (No extra Radix dependency needed.)
 */
export const ScrollArea = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("relative overflow-auto", className)}
    {...props}
  >
    {children}
  </div>
));
ScrollArea.displayName = "ScrollArea";
