"use client"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider className="bg-gray-800 text-white">
      <AppSidebar />
      <main className="flex-1 min-h-screen w-full overflow-auto relative">
        {children}
      </main>
    </SidebarProvider>
  );
}