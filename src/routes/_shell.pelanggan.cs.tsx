import { createFileRoute } from "@tanstack/react-router";
import { CustomerServicePage } from "@/components/customer-service";

export const Route = createFileRoute("/_shell/pelanggan/cs")({
  head: () => ({
    meta: [
      { title: "Hubungi Pengembang AppBenk (Developer Support)" },
      {
        name: "description",
        content:
          "Sampaikan kendala teknis sistem, bug aplikasi, atau pertanyaan integrasi langsung ke Tim Pengembang Platform AppBenk.",
      },
      { property: "og:title", content: "Hubungi Pengembang AppBenk (Developer Support)" },
      {
        property: "og:description",
        content:
          "Sampaikan kendala teknis sistem, bug aplikasi, atau pertanyaan integrasi langsung ke Tim Pengembang Platform AppBenk.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CustomerServicePage,
});
