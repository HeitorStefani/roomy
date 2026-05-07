'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { deleteUser } from './actions'

export function DeleteUserButton({ userId, userName }: { userId: string; userName: string }) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm(`Deletar ${userName}? Esta ação não pode ser desfeita.`)) return
    const fd = new FormData()
    fd.append('userId', userId)
    startTransition(() => deleteUser(fd))
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={handleClick}
      className="border-red-800 bg-zinc-900 text-red-400 hover:bg-red-950 hover:text-red-300 shrink-0"
    >
      {pending ? 'Deletando...' : 'Deletar morador'}
    </Button>
  )
}
