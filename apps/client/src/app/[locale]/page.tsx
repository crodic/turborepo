import { Footer } from "@/components/layouts/footer";
import { Header } from "@/components/layouts/header";
import Layout from "@/components/layouts/layout";
import { CtaSection } from "@/components/landing/cta-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HeroSection } from "@/components/landing/hero-section";
import { PortalSection } from "@/components/landing/portal-section";
import { TechStackSection } from "@/components/landing/tech-stack-section";
import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

interface RootPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: RootPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Landing" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function RootPage({ params }: RootPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Layout>
      <Header />
      <main className="flex-1">
        <HeroSection />
        <TechStackSection />
        <FeaturesSection />
        <PortalSection />
        <CtaSection />
      </main>
      <Footer />
    </Layout>
  );
}
