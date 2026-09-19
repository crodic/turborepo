import { Footer } from "@/components/layouts/footer";
import { Header } from "@/components/layouts/header";
import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProfileView } from "./components/profile-view";

interface ProfilePageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Profile" });

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="bg-muted/20 flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-6 sm:py-10">
        <ProfileView />
      </main>
      <Footer />
    </div>
  );
}
