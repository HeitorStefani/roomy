"use client"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Clipboard, Coins, ShoppingCart, AlertCircle, Component } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const stats = [
  {
    label: "Gasto pessoal",
    value: "R$ 500,00",
    icon: Coins,
  },
  {
    label: "Tarefas restantes",
    value: "5",
    icon: Clipboard,
  },
  {
    label: "Produtos a comprar",
    value: "12",
    icon: ShoppingCart,
  },
];

// Mock gráfico
const expenseData = [
  { dia: "01", gasto: 120 },
  { dia: "05", gasto: 80 },
  { dia: "10", gasto: 150 },
  { dia: "15", gasto: 90 },
  { dia: "20", gasto: 200 },
  { dia: "25", gasto: 140 },
  { dia: "30", gasto: 170 },
];

// Mock tarefas
const upcomingTasks = [
  { title: "Limpar cozinha", date: "Hoje" },
  { title: "Tirar lixo", date: "Amanhã" },
  { title: "Pagar internet", date: "22/02" },
];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-800 p-2">
      <div className="bg-zinc-900 min-h-screen rounded-3xl p-6">
        
        {/* Header */}
        <div className="flex mb-6 items-center">

          <SidebarTrigger/>
          <Separator orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"/>
          <h1 className="text-white text-2xl font-bold mx-2">Início</h1>
          <hr />
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="bg-zinc-800 border-zinc-700">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className="text-zinc-400 w-4 h-4" />
                    <CardDescription className="text-zinc-400">
                      {stat.label}
                    </CardDescription>
                  </div>
                  <CardTitle className="text-white text-2xl">
                    {stat.value}
                  </CardTitle>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {/* Seção Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">

          {/* Gráfico de Gastos */}
          <Card className="bg-zinc-800 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-white">
                Gastos últimos 30 dias
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Evolução dos gastos mensais
              </CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={expenseData}>
                  <XAxis dataKey="dia" stroke="#a1a1aa" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      color: "white"
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="gasto"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Próximas Tarefas */}
          <Card className="bg-zinc-800 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-white">
                Próximas tarefas
              </CardTitle>
              <CardDescription className="text-zinc-400">
                O que precisa ser feito em breve
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingTasks.map((task, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-zinc-900 p-3 rounded-lg"
                >
                  <span className="text-white text-sm">
                    {task.title}
                  </span>
                  <span className="text-zinc-400 text-xs">
                    {task.date}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Resumo Inteligente */}
        <Card className="bg-zinc-800 border-zinc-700 mt-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Component className="w-4 h-4 text-yellow-500" />
              <CardTitle className="text-white">
                Resumo
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-300">
            <p>📈 Você gastou 20% a mais que semana passada.</p>
            <p>🧹 3 tarefas estão atrasadas.</p>
            <p>🛒 5 itens estão há mais de 7 dias na lista.</p>
            <p>📦 2 produtos estão acabando no estoque.</p>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}