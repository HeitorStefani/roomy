'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Camera, Check, Loader2, Pencil, User, Palette, X, Bell, QrCode } from 'lucide-react'
import { updateProfile, uploadAvatar } from './actions'

type ProfileData = {
  userId: string
  name: string
  avatarColor: string
  avatarUrl: string | null
  houseName: string
  emailNotificacao: string | null
  pixKey: string | null
}

const AVATAR_COLORS = [
  { value: 'bg-red-500',    label: 'Vermelho' },
  { value: 'bg-orange-500', label: 'Laranja'  },
  { value: 'bg-yellow-500', label: 'Amarelo'  },
  { value: 'bg-green-500',  label: 'Verde'    },
  { value: 'bg-teal-500',   label: 'Teal'     },
  { value: 'bg-blue-500',   label: 'Azul'     },
  { value: 'bg-indigo-500', label: 'Índigo'   },
  { value: 'bg-purple-500', label: 'Roxo'     },
  { value: 'bg-pink-500',   label: 'Rosa'     },
  { value: 'bg-zinc-500',   label: 'Cinza'    },
]

export default function PerfilClient({ data }: { data: ProfileData }) {
  const router       = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name,        setName]        = useState(data.name)
  const [color,       setColor]       = useState(data.avatarColor)
  const [emailNotif,  setEmailNotif]  = useState(data.emailNotificacao ?? '')
  const [pixKey,      setPixKey]      = useState(data.pixKey ?? '')
  const [avatarUrl,   setAvatarUrl]   = useState(data.avatarUrl)
  const [preview,     setPreview]     = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const [savingInfo,  setSavingInfo]  = useState(false)
  const [savingPhoto, setSavingPhoto] = useState(false)
  const [savedInfo,   setSavedInfo]   = useState(false)
  const [savedPhoto,  setSavedPhoto]  = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const initials = name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Arquivo muito grande. Máximo 5MB.'); return }
    setError(null)
    setPendingFile(file)
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleCancelPhoto = () => {
    setPreview(null); setPendingFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSavePhoto = async () => {
    if (!pendingFile) return
    setSavingPhoto(true); setError(null)
    try {
      const formData = new FormData()
      formData.append('file', pendingFile)
      formData.append('userId', data.userId)
      const result = await uploadAvatar(formData)
      if (result?.url) {
        setAvatarUrl(result.url); setPreview(null); setPendingFile(null)
        setSavedPhoto(true); setTimeout(() => setSavedPhoto(false), 2500)
        router.refresh()
      } else {
        setError(result?.error ?? 'Erro ao salvar foto.')
      }
    } catch { setError('Erro inesperado ao salvar foto.') }
    finally { setSavingPhoto(false) }
  }

  const handleSaveInfo = async () => {
    if (!name.trim()) return
    if (emailNotif && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNotif)) {
      setError('E-mail de notificação inválido.'); return
    }
    setSavingInfo(true); setError(null)
    try {
      await updateProfile({
        userId:           data.userId,
        name:             name.trim(),
        avatarColor:      color,
        emailNotificacao: emailNotif.trim() || null,
        pixKey:           pixKey.trim() || null,
      })
      setSavedInfo(true); setTimeout(() => setSavedInfo(false), 2500)
      router.refresh()
    } catch { setError('Erro ao salvar informações.') }
    finally { setSavingInfo(false) }
  }

  const displaySrc = preview ?? avatarUrl

  return (
    <div className="min-h-screen bg-gray-800 p-1 sm:p-2">
      <div className="bg-zinc-900 min-h-screen rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8">

        <div className="flex items-center mb-8">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
          <h1 className="text-white text-xl sm:text-2xl font-bold mx-2">Meu Perfil</h1>
        </div>

        <div className="max-w-lg mx-auto space-y-6">

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
              <X className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          {/* Foto */}
          <div className="bg-zinc-800 rounded-2xl p-6 border border-zinc-700">
            <div className="flex items-center gap-2 mb-6">
              <Camera className="w-4 h-4 text-yellow-500" />
              <h2 className="text-white font-semibold text-sm">Foto de Perfil</h2>
            </div>
            <div className="flex flex-col items-center gap-5">
              <div className="relative">
                <div className={`w-28 h-28 rounded-full overflow-hidden border-4 ${preview ? 'border-yellow-500' : 'border-zinc-700'} transition-all`}>
                  {displaySrc ? (
                    <Image src={displaySrc} alt="Avatar" width={112} height={112} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full ${color} flex items-center justify-center text-white text-3xl font-bold`}>
                      {initials || <User className="w-10 h-10" />}
                    </div>
                  )}
                </div>
                {!preview && (
                  <button onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center hover:bg-yellow-400 transition-colors shadow-lg">
                    <Pencil className="w-3.5 h-3.5 text-zinc-900" />
                  </button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
              {preview ? (
                <div className="flex gap-3 w-full">
                  <Button variant="outline" onClick={handleCancelPhoto} className="flex-1 border-zinc-600 text-zinc-400 hover:text-white hover:bg-zinc-700">
                    <X className="w-4 h-4 mr-1.5" />Cancelar
                  </Button>
                  <Button onClick={handleSavePhoto} disabled={savingPhoto} className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-zinc-900 font-semibold">
                    {savingPhoto ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Salvando…</> : <><Check className="w-4 h-4 mr-1.5" />Salvar foto</>}
                  </Button>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className="text-sm text-zinc-400 hover:text-yellow-400 transition-colors underline underline-offset-2">
                  {avatarUrl ? 'Trocar foto' : 'Escolher foto'}
                </button>
              )}
              {savedPhoto && !preview && <p className="text-emerald-400 text-xs flex items-center gap-1.5"><Check className="w-3.5 h-3.5" />Foto atualizada!</p>}
              <p className="text-zinc-600 text-xs">JPG, PNG ou WebP · máximo 5MB</p>
            </div>
          </div>

          {/* Informações */}
          <div className="bg-zinc-800 rounded-2xl p-6 border border-zinc-700 space-y-5">
            <div className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-yellow-500" />
              <h2 className="text-white font-semibold text-sm">Informações</h2>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Nome</Label>
              <Input value={name} onChange={e => setName(e.target.value)}
                className="bg-zinc-700 border-zinc-600 text-white focus:border-yellow-500" placeholder="Seu nome" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">República</Label>
              <div className="bg-zinc-700/50 border border-zinc-600 rounded-md px-3 py-2 text-zinc-400 text-sm">{data.houseName}</div>
            </div>

            {/* PIX */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                <Label className="text-zinc-400 text-xs">Chave PIX</Label>
              </div>
              <Input
                value={pixKey}
                onChange={e => setPixKey(e.target.value)}
                placeholder="CPF, e-mail, telefone ou chave aleatória"
                className="bg-zinc-700 border-zinc-600 text-white focus:border-emerald-500"
              />
              <p className="text-zinc-600 text-[11px]">
                Aparece para os outros moradores quando precisam te pagar.
              </p>
            </div>

            {/* E-mail notificação */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-zinc-400" />
                <Label className="text-zinc-400 text-xs">E-mail para notificações de tarefas</Label>
              </div>
              <Input
                type="email"
                value={emailNotif}
                onChange={e => setEmailNotif(e.target.value)}
                placeholder="seuemail@gmail.com"
                className="bg-zinc-700 border-zinc-600 text-white focus:border-yellow-500"
              />
              <p className="text-zinc-600 text-[11px]">Deixe em branco para não receber notificações.</p>
            </div>

            {/* Cor */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Palette className="w-3.5 h-3.5 text-zinc-400" />
                <Label className="text-zinc-400 text-xs">Cor do avatar (quando sem foto)</Label>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {AVATAR_COLORS.map(c => (
                  <button key={c.value} title={c.label} onClick={() => setColor(c.value)}
                    className={`w-7 h-7 rounded-full ${c.value} transition-all ${
                      color === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-800 scale-110' : 'hover:scale-105 opacity-70 hover:opacity-100'
                    }`} />
                ))}
              </div>
            </div>

            <Button onClick={handleSaveInfo} disabled={savingInfo || !name.trim()}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-zinc-900 font-semibold disabled:opacity-50">
              {savingInfo ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Salvando…</> :
               savedInfo  ? <><Check className="w-4 h-4 mr-1.5" />Salvo!</> : 'Salvar informações'}
            </Button>
          </div>

        </div>
      </div>
    </div>
  )
}