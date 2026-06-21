import { Metadata } from "next";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Xior Login Page",
};

export default function Page() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <LoginForm />
    </div>
  );
}
