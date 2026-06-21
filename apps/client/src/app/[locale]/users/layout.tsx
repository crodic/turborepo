import { Footer } from "@/components/layouts/footer";
import { Header } from "@/components/layouts/header";
import Layout from "@/components/layouts/layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PlusIcon } from "lucide-react";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Layout>
      <Header />
      <div className="flex min-h-screen flex-col place-content-stretch items-center justify-center px-8 pb-24 md:px-24">
        <div
          style={{
            backgroundImage: "url(/image.png)",
            backgroundPosition: "top",
          }}
          className="h-48 w-full md:h-120"
        ></div>
        <div className="flex w-full gap-4 md:px-24">
          <Avatar className="border-background -mt-12 size-36 border-4 shadow">
            <AvatarFallback>CD</AvatarFallback>
            <AvatarImage src="/test.jpg" className="object-cover object-top" />
          </Avatar>
          <div className="mt-4 flex w-full justify-between">
            <div>
              <h1 className="text-2xl font-bold">Kris Bayer</h1>
              <Badge className="mt-2" variant="default">
                Artist
              </Badge>
            </div>
            <Button size="lg" className="mt-4">
              <PlusIcon />
              Follow
            </Button>
          </div>
        </div>
        <Separator className="my-8" />
        {children}
      </div>
      <Footer />
    </Layout>
  );
}
