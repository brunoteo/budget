import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type Props = {
  href?: string;
  label: string;
};

export function BackLink({ href = "/", label }: Props) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="-ml-2 grid h-11 w-11 place-items-center rounded-full text-clay-700 transition-colors hover:bg-clay-200 active:bg-clay-300"
    >
      <ChevronLeft className="h-5 w-5" strokeWidth={1.5} aria-hidden />
    </Link>
  );
}
