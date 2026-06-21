import { getTranslations, setRequestLocale } from "next-intl/server";

export const dynamic = "force-static";
export default async function DynamicPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "HomePage" });

  setRequestLocale(locale);

  return <div>{t("title")}</div>;
}
