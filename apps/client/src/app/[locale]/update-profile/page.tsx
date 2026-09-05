import { Metadata } from "next";
import UpdateForm from "./update-form";

export const metadata: Metadata = {
  title: "Update Profile",
};

export default function Page() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 px-4">
      <UpdateForm />
    </div>
  );
}
