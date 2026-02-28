export { }

declare global {
  namespace Express {
    interface Request {
      requestId?: string
      auth?: {
        userId: string
        teamId?: string
        role?: 'ADMIN' | 'MEMBER'
        isManager?: boolean
      }
    }
  }
}
