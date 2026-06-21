import type { Metadata } from "next";
import ResetPasswordForm from "./reset-password-form";

export const metadata: Metadata = {
  title: "Reset password",
};

export default function Page() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <ResetPasswordForm />
    </div>
  );
}
