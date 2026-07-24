import { Component } from 'react'
import { logger, createRequestId } from '../lib/observability/logger'

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    logger.fatal('application.react_render_failed', {
      requestId: createRequestId(),
      error,
      componentStack: info?.componentStack || undefined
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-[#08090a] px-6 text-center text-white">
          <div className="max-w-md">
            <p className="rhc-kicker mb-3">RHC / TRAINING</p>
            <h1 className="text-3xl font-[720] tracking-[-.04em]">Algo deu errado.</h1>
            <p className="mt-3 text-sm text-[#92979f]">Recarregue a página para continuar. Seus dados salvos não foram apagados.</p>
            <button className="btn-primary mt-6" type="button" onClick={() => window.location.reload()}>
              Recarregar
            </button>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}
