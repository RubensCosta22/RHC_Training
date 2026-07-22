import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingCard from '../components/ui/LoadingCard'
import PageHeader from '../components/ui/PageHeader'
import { getPostLoginPath } from '../services/familyService'
import { secureSignOut } from '../services/authService'
import { friendlyError } from '../utils/validation'

export default function Profiles() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getPostLoginPath()
      .then((path) => {
        if (!active) return
        if (path === '/profiles') {
          setError('Nenhum perfil está vinculado a esta conta. Peça ao administrador para revisar a associação do seu e-mail.')
          return
        }
        navigate(path, { replace: true })
      })
      .catch((err) => {
        if (active) setError(friendlyError(err))
      })
    return () => { active = false }
  }, [navigate])

  async function logout() {
    await secureSignOut()
    navigate('/login', { replace: true })
  }

  if (!error) return <LoadingCard lines={3} />

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        eyebrow="RHC Training"
        title="Perfil não vinculado"
        subtitle="Sua conta precisa estar associada a um perfil antes de acessar os treinos."
      />
      <div className="border-y border-[#2A2A2E] py-5">
        <p className="text-sm leading-relaxed text-[#8E8E93]">{error}</p>
        <button type="button" onClick={logout} className="mt-5 text-sm font-semibold text-[#C8FF3D]">Sair da conta</button>
      </div>
    </div>
  )
}
