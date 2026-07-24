import { createRequestId } from './logger'

export function createLogContext(context = {}) {
  return {
    requestId: context.requestId || createRequestId(),
    userId: context.userId || undefined,
    profileId: context.profileId || undefined
  }
}
