import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Roomy - Organize as tarefas da sua casa",
  description: "Mantenha as tarefas da sua casa organizadas com o Roomy. Acompanhe o que precisa ser feito, quem é responsável e quando deve ser concluído. Simplifique a gestão do lar e mantenha tudo sob controle com facilidade.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en"> 
        <body 
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
        </body>
    </html>
  );
}
