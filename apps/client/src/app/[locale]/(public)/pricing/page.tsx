import { Footer } from "@/components/layouts/footer";
import { Header } from "@/components/layouts/header";
import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PricingView } from "./components/pricing-view";

interface PricingPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: PricingPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Pricing" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function PricingPage({ params }: PricingPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-4 sm:py-8">
        <PricingView />
      </main>
      <Footer />
    </div>
  );
}
