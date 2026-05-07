'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { deleteHouse } from './actions'

export function DeleteHouseButton({ houseId, houseName }: { houseId: string; houseName: string }) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm(`Deletar a república "${houseName}"? Todos os dados serão removidos e os moradores perderão o vínculo.`)) return
    const fd = new FormData()
    fd.append('houseId', houseId)
    startTransition(() => deleteHouse(fd))
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={handleClick}
      className="border-red-800 bg-zinc-900 text-red-400 hover:bg-red-950 hover:text-red-300 shrink-0"
    >
      {pending ? 'Deletando...' : 'Deletar'}
    </Button>
  )
}
