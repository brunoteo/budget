import { notFound } from "next/navigation";
import { SignupForm } from "./_components/signup-form";

export default function SignupPage() {
  if (process.env.NEXT_PUBLIC_ALLOW_SIGNUP !== "true") notFound();
  return <SignupForm />;
}
