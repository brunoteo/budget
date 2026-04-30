import Link from "next/link";

type Props = {
  href?: string;
  label: string;
};

export function BackLink({ href = "/", label }: Props) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="-ml-2 grid h-11 w-11 place-items-center rounded-full text-clay-700 hover:bg-clay-100 active:bg-clay-200 transition-colors"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </Link>
  );
}
