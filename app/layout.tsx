import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Max Note — Ruang Catatan Digital",
  description: "Workspace monokrom untuk catatan, prompt AI, dan arsip ide.",
  applicationName: "Max Note"
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}