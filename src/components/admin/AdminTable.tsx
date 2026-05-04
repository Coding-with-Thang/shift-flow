import type {
  HTMLAttributes,
  ReactNode,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

export function AdminTableRoot({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("border border-zinc-200 rounded-sm overflow-hidden", className)}
      {...props}
    />
  );
}

type AdminTableScrollProps = HTMLAttributes<HTMLDivElement> & {
  /** Horizontal scroll only (default). */
  mode?: "x" | "y";
};

export function AdminTableScroll({ mode = "x", className, ...props }: AdminTableScrollProps) {
  return (
    <div
      className={cn(
        mode === "y"
          ? "max-h-[min(70vh,720px)] overflow-auto"
          : "overflow-x-auto",
        className,
      )}
      {...props}
    />
  );
}

export function AdminTableTable({
  className,
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full text-left text-sm border-collapse", className)} {...props} />;
}

type AdminTableTheadProps = HTMLAttributes<HTMLTableSectionElement> & {
  /** Sticky header with bottom shadow (cursor / tall lists). */
  sticky?: boolean;
};

export function AdminTableThead({ sticky, className, ...props }: AdminTableTheadProps) {
  return (
    <thead
      className={cn(
        sticky
          ? "sticky top-0 z-10 bg-zinc-50 shadow-[0_1px_0_0_rgb(228_228_231)]"
          : undefined,
        className,
      )}
      {...props}
    />
  );
}

export function AdminTableHeaderRow({
  variant = "static",
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement> & {
  /** `static`: row has border/background. `sticky`: thead owns background (use with sticky thead). */
  variant?: "sticky" | "static";
}) {
  return (
    <tr
      className={cn(
        "text-[10px] font-bold uppercase tracking-widest text-zinc-500",
        variant === "static" && "bg-zinc-50 border-b border-zinc-200",
        className,
      )}
      {...props}
    />
  );
}

type CellDensity = "compact" | "comfortable";

const headerCellPadding: Record<CellDensity, string> = {
  compact: "px-4 py-3",
  comfortable: "px-6 py-3",
};

export function AdminTableHeaderCell({
  density = "compact",
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { density?: CellDensity }) {
  return (
    <th
      className={cn(headerCellPadding[density], "font-semibold", className)}
      {...props}
    />
  );
}

export function AdminTableBody({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-zinc-100 bg-white", className)} {...props} />;
}

export function AdminTableRow({
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("hover:bg-zinc-50/80 align-top", className)} {...props} />;
}

const dataCellPadding: Record<CellDensity, string> = {
  compact: "px-4 py-3",
  comfortable: "px-6 py-4",
};

export function AdminTableCell({
  density = "compact",
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { density?: CellDensity }) {
  return <td className={cn(dataCellPadding[density], className)} {...props} />;
}

export function AdminTableEmptyCard({
  title,
  description,
  className,
}: {
  title: string;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "p-16 border border-dashed border-zinc-300 rounded-sm text-center text-zinc-400",
        className,
      )}
    >
      <p className="font-bold tracking-widest uppercase text-xs">{title}</p>
      {description != null ? <div className="mt-2 text-sm text-zinc-500">{description}</div> : null}
    </div>
  );
}
