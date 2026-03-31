export interface User {
  id: number
  username: string
  email: string
  role: 'ROLE_USER' | 'ROLE_ADMIN'
}
