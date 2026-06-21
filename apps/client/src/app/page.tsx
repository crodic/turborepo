import { redirect } from "next/navigation";

const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_APP_LOCALE || "en";

// This page only renders when the app is built statically (output: 'export')
export default function RootPage() {
  redirect(`/${DEFAULT_LOCALE}`);
}
