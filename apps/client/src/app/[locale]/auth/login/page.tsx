import { getTranslations } from "next-intl/server";
import LoginForm from "./login-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth.login" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default function Page() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <LoginForm />
    </div>
  );
}
