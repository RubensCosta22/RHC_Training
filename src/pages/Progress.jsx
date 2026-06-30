import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getProgressData } from '../services/workoutService'
import { friendlyError } from '../utils/validation'

function ChartCard({ title, children }) {
  return <section className="card"><h2 className="mb-4 text-lg font-black">{title}</h2><div className="h-64">{children}</div></section>
}

export default function Progress() {
  const { profileId } = useParams()
  const [data, setData] = useState({ sessions: [], measurements: [], exercises: [] })
  const [selectedExercise, setSelectedExercise] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getProgressData(profileId).then((result) => {
      setData(result)
      setSelectedExercise(result.exercises[0]?.exercise_name || '')
    }).catch((err) => setError(friendlyError(err)))
  }, [profileId])

  const exerciseNames = useMemo(() => [...new Set(data.exercises.map((item) => item.exercise_name))], [data.exercises])
  const exerciseWeights = useMemo(() => data.exercises.filter((item) => item.exercise_name === selectedExercise), [data.exercises, selectedExercise])

  const weekly = useMemo(() => {
    const map = {}
    data.sessions.forEach((session) => {
      const date = new Date(session.date)
      const start = new Date(date)
      start.setDate(date.getDate() - date.getDay())
      const key = start.toISOString().slice(0, 10)
      map[key] = (map[key] || 0) + 1
    })
    return Object.entries(map).map(([week, total]) => ({ week, total }))
  }, [data.sessions])

  const monthly = useMemo(() => {
    const map = {}
    data.sessions.forEach((session) => {
      const key = session.date.slice(0, 7)
      map[key] = (map[key] || 0) + 1
    })
    return Object.entries(map).map(([month, total]) => ({ month, total }))
  }, [data.sessions])

  if (error) return <p className="rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-red-100">{error}</p>

  return (
    <div>
      <header className="mb-5">
        <p className="text-sm font-bold text-emerald-300">Evolução</p>
        <h1 className="text-3xl font-black">Gráficos</h1>
      </header>

      <div className="grid gap-4">
        <ChartCard title="Volume total por treino">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.sessions}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="total_volume" name="Volume" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <section className="card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black">Carga por exercício</h2>
            <select className="max-w-48" value={selectedExercise} onChange={(e) => setSelectedExercise(e.target.value)}>
              {exerciseNames.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={exerciseWeights}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="weight" name="Carga" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <ChartCard title="Treinos por semana">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" name="Treinos" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Peso corporal">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.measurements}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="weight" name="Peso" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Medidas corporais">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.measurements}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="waist" name="Cintura" />
              <Line type="monotone" dataKey="chest" name="Peito" />
              <Line type="monotone" dataKey="arm" name="Braço" />
              <Line type="monotone" dataKey="thigh" name="Coxa" />
              <Line type="monotone" dataKey="hip" name="Quadril" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Frequência mensal">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" name="Treinos" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}
