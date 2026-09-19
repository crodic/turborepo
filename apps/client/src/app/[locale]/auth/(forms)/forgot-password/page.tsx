import { getTranslations } from "next-intl/server";
import ForgotPasswordForm from "./forgot-password-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "Auth.forgotPassword",
  });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default function Page() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <ForgotPasswordForm />
    </div>
  );
}
