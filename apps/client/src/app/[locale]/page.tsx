import { Footer } from "@/components/layouts/footer";
import { Header } from "@/components/layouts/header";
import Layout from "@/components/layouts/layout";

export default async function RootPage() {
  return (
    <Layout>
      <Header />
      <div className="flex min-h-screen flex-col items-center justify-center px-8 py-24 md:px-24"></div>
      <Footer />
    </Layout>
  );
}
