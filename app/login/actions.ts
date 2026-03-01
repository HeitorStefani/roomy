'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const toEmail = (ra: string) => `${ra.trim()}@republica.app`

export async function login(formData: FormData) {
  const supabase = await createClient()
  const ra       = formData.get('ra') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email: toEmail(ra),
    password,
  })

  if (error) redirect('/login?error=RA+ou+senha+inválidos')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const ra         = formData.get('ra') as string
  const password   = formData.get('password') as string
  const name       = formData.get('name') as string
  const inviteCode = formData.get('invite_code') as string

  // ── LOG 1: o que chegou do formulário
  console.log('=== SIGNUP DEBUG ===')
  console.log('RA:', ra)
  console.log('Nome:', name)
  console.log('Código digitado:', inviteCode)
  console.log('Código após trim/upper:', inviteCode?.trim().toUpperCase())

  // ── LOG 2: testa a conexão listando todas as casas
  const { data: allHouses, error: listError } = await supabase
    .from('houses')
    .select('id, name, invite_code')

  console.log('Erro ao listar casas:', listError)
  console.log('Casas encontradas:', allHouses)

  // ── LOG 3: tenta buscar pelo código
  const { data: house, error: houseError } = await supabase
    .from('houses')
    .select('id')
    .eq('invite_code', inviteCode?.trim().toUpperCase())
    .single()

  console.log('Erro na busca por código:', houseError)
  console.log('Casa encontrada:', house)
  console.log('===================')

  if (houseError || !house) {
    redirect('/login?mode=signup&error=Código+de+convite+inválido')
  }

  const { data, error: authError } = await supabase.auth.signUp({
    email:    toEmail(ra),
    password,
  })

  if (authError || !data.user) {
    redirect('/login?mode=signup&error=Erro+ao+criar+conta.+RA+já+cadastrado?')
  }

  const { error: profileError } = await supabase.from('users').insert({
    id:           data.user.id,
    house_id:     house.id,
    name:         name.trim(),
    avatar_color: 'bg-zinc-500',
  })

  if (profileError) {
    console.log('Erro ao salvar perfil:', profileError)
    redirect('/login?mode=signup&error=Erro+ao+salvar+perfil')
  }

  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}