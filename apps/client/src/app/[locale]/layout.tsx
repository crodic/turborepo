import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import Provider from "@/components/provider";
import {
  fetchActiveClientWhiteLabel,
  isWhiteLabelEnabled,
  WhiteLabelProvider,
  WhiteLabelServerStyle,
} from "@/lib/white-label";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { getMessages, setRequestLocale } from "next-intl/server";
import { dancingScript, geistMono, geistSans } from "@/fonts";

export async function generateMetadata(): Promise<Metadata> {
  const whiteLabel = await fetchActiveClientWhiteLabel();
  if (!whiteLabel || !isWhiteLabelEnabled) {
    return {
      title: "Visel Art - Creative Platform",
      description: "Creative Design & Modern Platform",
      icons: {
        icon: [{ rel: "icon", url: "/favicon.png" }],
      },
    };
  }

  const title =
    whiteLabel.siteTitle ||
    whiteLabel.metaTitle ||
    whiteLabel.brandName ||
    "Visel Art - Creative Platform";
  const description =
    whiteLabel.metaDescription || "Creative Design & Modern Platform";
  const iconUrl = whiteLabel.siteFavicon || "/favicon.png";

  return {
    title,
    description,
    icons: {
      icon: [{ rel: "icon", url: iconUrl }],
    },
    openGraph: whiteLabel.ogImage
      ? {
          title,
          description,
          images: [{ url: whiteLabel.ogImage }],
        }
      : undefined,
    twitter: whiteLabel.twitterImage
      ? {
          card: "summary_large_image",
          title,
          description,
          images: [whiteLabel.twitterImage],
        }
      : undefined,
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Ensure that the incoming `locale` is valid
  const { locale } = await params;
  const messages = await getMessages();

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Fetch active white label on server (SSR)
  const whiteLabel = await fetchActiveClientWhiteLabel();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <WhiteLabelServerStyle styles={whiteLabel?.styles} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${dancingScript.variable} antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <Provider>
            <WhiteLabelProvider initialData={whiteLabel}>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
                storageKey={`${process.env.APP_NAME}-theme`}
              >
                {children}
              </ThemeProvider>
            </WhiteLabelProvider>
          </Provider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
