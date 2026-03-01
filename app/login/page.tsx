import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import logo from '@/public/logo.png'
import { login, signup } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mode?: string }>
}) {
  const params = await searchParams
  const isSignup = params.mode === 'signup'

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900">
      <div className="grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-2xl bg-gray-800 md:grid-cols-2">

        {/* IMAGEM */}
        <div className="relative hidden md:block">
          <Image src={logo} alt="Logo" fill className="object-cover" priority />
        </div>

        {/* FORMULÁRIO */}
        <form
          action={isSignup ? signup : login}
          className="flex flex-col justify-center p-8 space-y-5"
        >
          <h1 className="text-2xl font-bold text-yellow-300">
            {isSignup ? 'Criar conta' : 'Login'}
          </h1>

          {/* Erro */}
          {params.error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {params.error}
            </p>
          )}

          {/* Campos só do cadastro */}
          {isSignup && (
            <>
              <label className="flex flex-col gap-2 text-yellow-300">
                Nome completo
                <Input
                  name="name"
                  placeholder="Ana Silva"
                  required
                  className="bg-zinc-700 border-zinc-600 text-white placeholder:text-zinc-500"
                />
              </label>

              <label className="flex flex-col gap-2 text-yellow-300">
                Código de convite
                <Input
                  name="invite_code"
                  placeholder="Ex: CASA2025"
                  required
                  className="bg-zinc-700 border-zinc-600 text-white placeholder:text-zinc-500 uppercase"
                />
                <span className="text-zinc-500 text-xs -mt-1">
                  Peça o código para quem administra a república
                </span>
              </label>
            </>
          )}

          {/* RA e senha */}
          <label className="flex flex-col gap-2 text-yellow-300">
            RA
            <Input
              name="ra"
              placeholder="12345678"
              required
              className="bg-zinc-700 border-zinc-600 text-white placeholder:text-zinc-500"
            />
          </label>

          <label className="flex flex-col gap-2 text-yellow-300">
            Senha
            <Input
              name="password"
              type="password"
              placeholder="••••••••"
              required
              className="bg-zinc-700 border-zinc-600 text-white placeholder:text-zinc-500"
            />
          </label>

          <Button
            type="submit"
            className="mt-2 bg-yellow-400 text-black hover:bg-yellow-500 font-semibold"
          >
            {isSignup ? 'Criar conta' : 'Entrar'}
          </Button>

          <p className="text-center text-zinc-400 text-sm">
            {isSignup ? 'Já tem conta?' : 'Ainda não tem conta?'}{' '}
            <a
              href={isSignup ? '/login' : '/login?mode=signup'}
              className="text-yellow-300 hover:underline"
            >
              {isSignup ? 'Entrar' : 'Criar conta'}
            </a>
          </p>
        </form>

      </div>
    </div>
  )
}