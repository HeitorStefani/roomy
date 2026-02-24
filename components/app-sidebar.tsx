"use client"

import Link from "next/link"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"

import {
  Home,
  BookOpen,
  ClipboardList,
  Crown,
  ShoppingCart,
  BoxIcon,
  Newspaper,
} from "lucide-react"

export function AppSidebar() {
  return (
    <Sidebar className="border-none">
      <SidebarContent className="bg-gray-800 text-white">

        {/* Título */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-3 px-2 py-3 mb-4">
            <div className="bg-yellow-500 p-2 rounded-lg">
              <Crown size={20} className="text-black"/>
            </div>
            <span className="text-lg font-semibold text-white">
              ROOMY
            </span>
          </SidebarGroupLabel>

          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/dashboard">
                  <Home className="w-4 h-4" />
                  <span>Início</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/contas">
                  <BookOpen className="w-4 h-4" />
                  <span>Contas</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/tarefas">
                  <ClipboardList className="w-4 h-4" />
                  <span>Tarefas da casa</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/compras">
                  <ShoppingCart className="w-4 h-4" />
                  <span>Lista de compras</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/estoque">
                  <BoxIcon className="w-4 h-4" />
                  <span>Estoque</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/estatuto">
                  <Newspaper className="w-4 h-4" />
                  <span>Estatuto</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

          </SidebarMenu>
        </SidebarGroup>

      </SidebarContent>
    </Sidebar>
  )
}
