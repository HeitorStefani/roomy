import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import logo from '@/public/logo.png'

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900">
      <div className="grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-2xl bg-gray-800 md:grid-cols-2">
        
        {/* IMAGEM */}
        <div className="relative hidden md:block">
          <Image
            src={logo}
            alt="Imagem de login"
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* FORMULÁRIO */}
        <div className="flex flex-col justify-center p-8 space-y-6">
          <h1 className="text-2xl font-bold text-yellow-300">Login</h1>

          <label className="flex flex-col gap-2 text-yellow-300">
            RA
            <Input />
          </label>

          <label className="flex flex-col gap-2 text-yellow-300">
            Senha
            <Input type="password" />
          </label>

          <Button className="mt-4 bg-yellow-400 text-black hover:bg-yellow-500">
            Entrar
          </Button>
        </div>
      </div>
    </div>
  );
}