// Authentication utility functions

export const authUtils = {
  // Get token from localStorage
  getToken(): string | null {
    return localStorage.getItem('token')
  },

  // Set token in localStorage
  setToken(token: string): void {
    localStorage.setItem('token', token)
  },

  // Remove token from localStorage
  removeToken(): void {
    localStorage.removeItem('token')
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = this.getToken()
    return token !== null && token !== ''
  },

  // Get authorization header for API requests
  getAuthHeader(): { Authorization: string } | {} {
    const token = this.getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
}