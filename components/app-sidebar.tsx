"use client"

import Link from "next/link"
import Image from "next/image"
import { SidebarFooter, useSidebar } from "@/components/ui/sidebar"
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
} from "@/components/ui/sidebar"
import {
  Home, BookOpen, ClipboardList, Crown, BoxIcon,
  Newspaper, LogOut, UserCircle,
} from "lucide-react"
import { Button } from "./ui/button"
import { logout } from "@/app/login/actions"

type SidebarUser = {
  name: string
  avatarColor: string
  avatarUrl: string | null
}

export function AppSidebar({ user }: { user?: SidebarUser }) {
  const { setOpenMobile } = useSidebar()
  const handleClick = () => setOpenMobile(false)

  const initials = user?.name
    ? user.name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <Sidebar className="border-none">
      <SidebarContent className="bg-gray-800 text-white">
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-3 px-2 py-3 mb-4">
            <div className="bg-yellow-500 p-2 rounded-lg">
              <Crown size={20} className="text-black" />
            </div>
            <span className="text-lg font-semibold text-white">ROOMY</span>
          </SidebarGroupLabel>

          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/dashboard" onClick={handleClick}>
                  <Home className="w-4 h-4" /><span>Início</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/contas" onClick={handleClick}>
                  <BookOpen className="w-4 h-4" /><span>Contas</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/tarefas" onClick={handleClick}>
                  <ClipboardList className="w-4 h-4" /><span>Tarefas da casa</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/estoque" onClick={handleClick}>
                  <BoxIcon className="w-4 h-4" /><span>Estoque</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/estatuto" onClick={handleClick}>
                  <Newspaper className="w-4 h-4" /><span>Estatuto</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="bg-gray-800 text-gray-400 text-sm p-3 space-y-2">
        {/* Link para perfil */}
        <Link
          href="/perfil"
          onClick={handleClick}
          className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-zinc-700 transition-colors group"
        >
          <div className={`w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border-2 border-zinc-600 group-hover:border-yellow-500 transition-colors`}>
            {user?.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.name}
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={`w-full h-full ${user?.avatarColor ?? 'bg-zinc-500'} flex items-center justify-center text-white text-xs font-bold`}>
                {initials}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name ?? 'Perfil'}</p>
            <p className="text-zinc-500 text-xs">Ver perfil</p>
          </div>
          <UserCircle className="w-4 h-4 text-zinc-600 group-hover:text-yellow-500 transition-colors" />
        </Link>

        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Button
              className="w-full bg-yellow-500 text-black hover:bg-yellow-600 font-semibold active:bg-yellow-700"
              onClick={logout}
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </Button>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarFooter>
    </Sidebar>
  )
}