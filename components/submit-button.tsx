'use client'

import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export function SubmitButton({ isSignup }: { isSignup: boolean }) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending}
      className="mt-2 bg-yellow-400 text-black hover:bg-yellow-500 font-semibold"
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          {isSignup ? 'Criando conta...' : 'Entrando...'}
        </span>
      ) : (
        isSignup ? 'Criar conta' : 'Entrar'
      )}
    </Button>
  )
}