import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva("inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors", {
  variants: { variant: {
    default: "border-transparent bg-primary/12 text-primary",
    secondary: "border-border bg-secondary text-secondary-foreground",
    outline: "border-border text-muted-foreground"
  } },
  defaultVariants: { variant: "default" }
})
function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) { return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} /> }
export { Badge, badgeVariants }
