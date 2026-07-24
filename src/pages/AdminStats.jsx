import { Activity, ArrowLeft, ArrowUpRight, Dumbbell, Timer, UsersRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import EmptyState from '../components/ui/EmptyState'
import PageHeader from '../components/ui/PageHeader'
import { buildAdminStatsSnapshot, getAdminStatsCenter } from '../services/adminStatsService'
import { friendlyError } from '../utils/validation'

const periods = [
  { value: 7, label: '7 dias' },
  { value: 30, label: '30 dias' },
  { value: 90, label: '90 dias' },
  { value: 'all', label: 'Tudo' }
]

const tooltip = {
  contentStyle: { background: '#141416', border: '1px solid #2A2A2E', borderRadius: 8, color: '#F5F5F7' },
  labelStyle: { color: '#8E8E93' },
  cursor: { fill: 'rgba(200,255,61,.04)' }
}

const formatNumber = (value) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Number(value || 0))
const formatDate = (value) => value ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(`${value}T12:00:00`)) : '—'

function Metric({ icon: Icon, label, value, detail }) {
  return (
    <div className="py-5">
      <div className="flex items-center gap-2 text-[#8E8E93]"><Icon size={16}/><span className="text-xs">{label}</span></div>
      <p className="mt-2 tabular-nums text-3xl font-semibold tracking-[-.04em] text-[#F5F5F7]">{value}</p>
      <p className="mt-1 text-xs text-[#62676f]">{detail}</p>
    </div>
  )
}

export default function AdminStats() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState(null)
  const [period, setPeriod] = useState(30)
  const [error, setError] = useState('')

  useEffect(() => {
    getAdminStatsCenter()
      .then(setEntries)
      .catch((err) => {
        setError(friendlyError(err))
        if (String(err?.message || '').includes('administrativo')) navigate('/profiles', { replace: true })
      })
  }, [navigate])

  const stats = useMemo(() => entries ? buildAdminStatsSnapshot(entries, period) : null, [entries, period])

  if (error) return <p className="border border-red-400/30 bg-red-400/10 p-3 text-red-100">{error}</p>
  if (!stats) return <p className="text-[#8E8E93]">Carregando centro geral...</p>

  const { summary, comparison, weeklyTrend, recentActivity } = stats

  return (
    <div className="page-enter pb-10">
      <PageHeader
        eyebrow="Administracao · Performance"
        title="Centro geral."
        subtitle="Uma leitura unica da consistencia, volume e atividade de todos os perfis supervisionados."
        action={<Link to="/admin" className="btn-secondary inline-flex items-center gap-2"><ArrowLeft size={16}/> Central RHC</Link>}
      />

      <div className="mb-10 flex flex-wrap gap-1 border-b border-[#2A2A2E]">
        {periods.map((item) => <button key={item.value} type="button" onClick={() => setPeriod(item.value)} className={`px-4 py-3 text-xs font-semibold ${period === item.value ? 'border-b-2 border-[#C8FF3D] text-[#F5F5F7]' : 'text-[#8E8E93]'}`}>{item.label}</button>)}
      </div>

      <section className="mb-10 grid grid-cols-2 divide-x divide-y divide-[#2A2A2E] border-y border-[#2A2A2E] lg:grid-cols-4 lg:divide-y-0">
        <div className="pr-4"><Metric icon={Dumbbell} label="Treinos" value={summary.totalWorkouts} detail="no periodo selecionado"/></div>
        <div className="pl-4 lg:px-4"><Metric icon={UsersRound} label="Perfis ativos" value={`${summary.activeProfiles}/${summary.profiles}`} detail={`${summary.inactiveProfiles} sem atividade no periodo`}/></div>
        <div className="pr-4 lg:px-4"><Metric icon={Activity} label="Volume total" value={`${formatNumber(summary.totalVolume)} kg`} detail="somando todos os perfis"/></div>
        <div className="pl-4"><Metric icon={Timer} label="Duracao media" value={`${summary.averageDuration} min`} detail="por sessao registrada"/></div>
      </section>

      {!summary.totalWorkouts ? <EmptyState title="Nenhum treino neste periodo" description="Troque o filtro ou aguarde novos registros para visualizar a atividade geral." icon={Dumbbell}/> : <>
        <section className="mb-12 grid gap-10 xl:grid-cols-[1.15fr_.85fr]">
          <div>
            <div className="mb-5"><p className="text-sm text-[#8E8E93]">Ritmo coletivo</p><h2 className="mt-1 text-2xl font-semibold text-[#F5F5F7]">Treinos por semana</h2></div>
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyTrend} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                  <defs><linearGradient id="adminWorkouts" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#C8FF3D" stopOpacity=".22"/><stop offset="1" stopColor="#C8FF3D" stopOpacity="0"/></linearGradient></defs>
                  <CartesianGrid vertical={false} stroke="#2A2A2E"/>
                  <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: '#8E8E93', fontSize: 11 }}/>
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#8E8E93', fontSize: 11 }}/>
                  <Tooltip {...tooltip} formatter={(value) => [value, 'Treinos']}/>
                  <Area type="monotone" dataKey="workouts" stroke="#C8FF3D" strokeWidth={2.5} fill="url(#adminWorkouts)" dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <div className="mb-5"><p className="text-sm text-[#8E8E93]">Comparativo</p><h2 className="mt-1 text-2xl font-semibold text-[#F5F5F7]">Treinos por perfil</h2></div>
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparison} layout="vertical" margin={{ top: 0, right: 10, left: 8, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke="#2A2A2E"/>
                  <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#8E8E93', fontSize: 11 }}/>
                  <YAxis type="category" dataKey="name" width={78} axisLine={false} tickLine={false} tick={{ fill: '#F5F5F7', fontSize: 11 }}/>
                  <Tooltip {...tooltip} formatter={(value) => [value, 'Treinos']}/>
                  <Bar dataKey="workouts" fill="#C8FF3D" radius={[0, 4, 4, 0]} maxBarSize={24}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <div className="mb-5"><p className="text-sm text-[#8E8E93]">Perfis</p><h2 className="mt-1 text-2xl font-semibold text-[#F5F5F7]">Leitura individual sem trocar de tela</h2></div>
          <div className="overflow-hidden border-y border-[#2A2A2E]">
            {comparison.map((profile) => <Link to={`/progress/${profile.id}`} key={profile.id} className="group grid gap-3 border-b border-[#2A2A2E] py-4 last:border-b-0 sm:grid-cols-[minmax(180px,1.2fr)_repeat(3,minmax(90px,.6fr))_auto] sm:items-center">
              <div className="flex min-w-0 items-center gap-3">{profile.avatarSignedUrl?<img src={profile.avatarSignedUrl} alt={profile.name} className="h-10 w-10 rounded-full object-cover"/>:<span className="grid h-10 w-10 place-items-center rounded-full bg-[#1a1d21] text-sm font-black text-[#C8FF3D]">{profile.name?.[0]}</span>}<div className="min-w-0"><p className="truncate font-semibold text-[#F5F5F7]">{profile.name}</p><p className="truncate text-xs text-[#62676f]">{profile.goal}</p></div></div>
              <div><p className="text-[10px] uppercase tracking-[.12em] text-[#62676f]">Treinos</p><p className="mt-1 tabular-nums font-semibold">{profile.workouts}</p></div>
              <div><p className="text-[10px] uppercase tracking-[.12em] text-[#62676f]">Volume</p><p className="mt-1 tabular-nums font-semibold">{formatNumber(profile.volume)} kg</p></div>
              <div><p className="text-[10px] uppercase tracking-[.12em] text-[#62676f]">Media</p><p className="mt-1 tabular-nums font-semibold">{profile.averageDuration} min</p></div>
              <ArrowUpRight size={17} className="text-[#62676f] transition group-hover:text-[#C8FF3D]"/>
            </Link>)}
          </div>
        </section>

        <section>
          <div className="mb-5"><p className="text-sm text-[#8E8E93]">Agora</p><h2 className="mt-1 text-2xl font-semibold text-[#F5F5F7]">Atividade recente</h2></div>
          <div className="grid gap-px overflow-hidden rounded-[18px] bg-[#2A2A2E] md:grid-cols-2 xl:grid-cols-3">
            {recentActivity.map((session, index) => <Link to={`/history/${session.profileId}`} key={`${session.profileId}-${session.id || session.date}-${index}`} className="group bg-[#0d0f11] p-5 transition hover:bg-[#141619]">
              <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-[#C8FF3D]">{session.profileName}</p><h3 className="mt-2 text-lg font-semibold">Treino {session.workout_type}</h3></div><ArrowUpRight size={17} className="text-[#62676f] group-hover:text-[#C8FF3D]"/></div>
              <div className="mt-6 flex items-center justify-between text-xs text-[#8E8E93]"><span>{formatDate(session.date)}</span><span>{formatNumber(session.total_volume)} kg · {session.duration_minutes || 0} min</span></div>
            </Link>)}
          </div>
        </section>
      </>}
    </div>
  )
}
