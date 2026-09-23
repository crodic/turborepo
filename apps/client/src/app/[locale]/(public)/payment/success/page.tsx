import { Footer } from "@/components/layouts/footer";
import { Header } from "@/components/layouts/header";
import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PaymentSuccessView } from "./components/success-view";

interface PaymentSuccessPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: PaymentSuccessPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PaymentSuccess" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function PaymentSuccessPage({
  params,
}: PaymentSuccessPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center">
        <PaymentSuccessView />
      </main>
      <Footer />
    </div>
  );
}
