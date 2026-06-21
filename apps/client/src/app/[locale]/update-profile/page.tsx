import { Metadata } from "next";
import UpdateForm from "./update-form";

export const metadata: Metadata = {
  title: "Xior Update Profile Page",
};

export default function Page() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4">
      <UpdateForm />
    </div>
  );
}
