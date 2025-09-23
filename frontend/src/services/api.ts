// Configuración base
const API_BASE_URL = 'http://localhost:8080'; // Tu backend

// Función helper para manejar respuestas
async function handleResponse(response:Response) {
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error ${response.status}: ${error}`);
  }
  
  // Si no hay contenido (ej: DELETE), retornar null
  if (response.status === 204) return null;
  
  return response.json();
}

// Objeto principal con todas las funciones
export const api = {
  // USERS
  characters: {
    async findAll() {
      const response = await fetch(`${API_BASE_URL}/characters`);
      return handleResponse(response);
    },

    async findById(id:number) {
      const response = await fetch(`${API_BASE_URL}/character/${id}`);
      return handleResponse(response);
    },

    //CREAR INTERFAZ DE CHARACTER
    async crear(character:any) {
      const response = await fetch(`${API_BASE_URL}/character`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(character),
      });
      return handleResponse(response);
    },
    
    //CREAR INTERFAZ DE CHARACTER
    async update(id:number, character:any) {
      const response = await fetch(`${API_BASE_URL}/character/${id}`, {
        method: 'Patch',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(character),
      });
      return handleResponse(response);
    },

    async remove(id:number) {
      const response = await fetch(`${API_BASE_URL}/character/${id}`, {
        method: 'DELETE',
      });
      return handleResponse(response);
    }
  },

  // PRODUCTOS
  productos: {
    async obtenerTodos(params = {}) {
      const queryString = new URLSearchParams(params).toString();
      const url = `${API_BASE_URL}/productos${queryString ? `?${queryString}` : ''}`;
      const response = await fetch(url);
      return handleResponse(response);
    },

    async buscar(query:any) {
      const response = await fetch(`${API_BASE_URL}/productos/buscar?q=${encodeURIComponent(query)}`);
      return handleResponse(response);
    },

    async obtenerPorCategoria(categoriaId:number) {
      const response = await fetch(`${API_BASE_URL}/productos/categoria/${categoriaId}`);
      return handleResponse(response);
    }
  },

  // AUTENTICACIÓN
  auth: {
    async login(credentials:{ username: string; password: string }) {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      return handleResponse(response);
    },

    async register(userData:{  email: string; username: string; password: string}) {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      return handleResponse(response);
    },

    async logout() {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      return handleResponse(response);
    }
  }
};