import type { AuthorRole } from "@/lib/types";
import { ROLE_LABEL } from "@/lib/types";
import { cn } from "@/lib/utils";
import { GraduationCap, Users } from "lucide-react";

export default function RoleBadge({ role }: { role: AuthorRole }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium leading-none",
        role === "academy"
          ? "bg-ink-900 text-white"
          : "border border-ink-300 text-ink-600"
      )}
    >
      {role === "academy" ? (
        <GraduationCap size={11} strokeWidth={2.2} />
      ) : (
        <Users size={11} strokeWidth={2.2} />
      )}
      {ROLE_LABEL[role]}
    </span>
  );
}
