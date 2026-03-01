"use client"

import Link from "next/link"
import { SidebarFooter, useSidebar } from "@/components/ui/sidebar"

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
  BoxIcon,
  Newspaper,
  LogOut,
} from "lucide-react"
import { Button } from "./ui/button"
import { logout } from "@/app/login/actions"
  
export function AppSidebar() {
  const { setOpenMobile } = useSidebar()

  const handleClick = (): void => {
    setOpenMobile(false)
  }

  return (
    <Sidebar className="border-none">
      <SidebarContent className="bg-gray-800 text-white">

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
                <Link href="/dashboard" onClick={handleClick}>
                  <Home className="w-4 h-4" />
                  <span>Início</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/contas" onClick={handleClick}>
                  <BookOpen className="w-4 h-4" />
                  <span>Contas</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/tarefas" onClick={handleClick}>
                  <ClipboardList className="w-4 h-4" />
                  <span>Tarefas da casa</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/estoque" onClick={handleClick}>
                  <BoxIcon className="w-4 h-4" />
                  <span>Estoque</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/estatuto" onClick={handleClick}>
                  <Newspaper className="w-4 h-4" />
                  <span>Estatuto</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

          </SidebarMenu>
        </SidebarGroup>

      </SidebarContent>
      <SidebarFooter className="bg-gray-800 text-gray-400 text-sm p-3">
        <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Button className="w-full bg-yellow-500 text-black hover:bg-yellow-600 font-semibold active:bg-yellow-700" onClick={logout}>
                  <LogOut className="w-4 h-4" />
                  <span>Sair</span>
                </Button>
              </SidebarMenuButton>
            </SidebarMenuItem>
      </SidebarFooter>
    </Sidebar>
  )
}