import type { Metadata } from "next";
import ForgotPasswordForm from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
};

export default function Page() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <ForgotPasswordForm />
    </div>
  );
}
