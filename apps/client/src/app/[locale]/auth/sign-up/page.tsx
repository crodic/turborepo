import type { Metadata } from "next";
import SignUpForm from "./sign-up-form";

export const metadata: Metadata = {
  title: "Create account",
};

export default function Page() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <SignUpForm />
    </div>
  );
}
