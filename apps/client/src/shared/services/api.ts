import { isTokenExpired } from '@/shared/utils/tokenUtils';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export class ApiError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiService {
  private baseURL = API_BASE_URL;
  private token: string | null = null;

  constructor() {
    // Safely initialize token from localStorage
    try {
      this.token = localStorage.getItem('endowcast_token');
    } catch (error) {
      // localStorage might not be available (SSR, etc.)
      this.token = null;
    }
  }

  setToken(token: string | null) {
    this.token = token;
    try {
      if (token) {
        localStorage.setItem('endowcast_token', token);
      } else {
        localStorage.removeItem('endowcast_token');
      }
    } catch (error) {
      // localStorage might not be available
      console.warn('Could not access localStorage:', error);
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    // Check if token is expired before making request
    if (this.token && isTokenExpired(this.token)) {
      console.warn('[API] Token expired, clearing token');
      this.setToken(null);
      throw new ApiError(401, 'Your session has expired. Please log in again.');
    }

    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      console.log('[API] Requesting:', url);
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        console.error('[API] Error response:', response.status, data);
        throw new ApiError(response.status, data.error || 'An error occurred', data);
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('[API] Network error:', error);
      throw new ApiError(0, 'Network error or server unavailable');
    }
  }

  // HTTP method wrappers
  public get(endpoint: string, options: RequestInit = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  public post(endpoint: string, body: any, options: RequestInit = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) });
  }

  public put(endpoint: string, body: any, options: RequestInit = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) });
  }

  public delete(endpoint: string, options: RequestInit = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  // Auth endpoints
  async login(email: string, password: string, rememberMe = false) {
    const response = await this.post('/auth/login', { email, password, rememberMe });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName?: string;
    jobTitle?: string;
  }) {
    const response = await this.post('/auth/register', userData);
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async verifyToken(token?: string) {
    return this.request('/auth/verify-token', {
      method: 'POST',
      body: JSON.stringify({ token: token || this.token }),
    });
  }

  async logout() {
    this.setToken(null);
    // Optionally, call a backend endpoint to invalidate the session/token
    try {
      await this.post('/auth/logout', {});
    } catch (error) {
      console.warn('Logout API call failed, clearing token locally.', error);
    }
  }

  // User endpoints
  async getUserProfile() {
    return this.request('/users/profile');
  }

  async updateUserProfile(userData: {
    firstName?: string;
    lastName?: string;
    jobTitle?: string;
  }) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async getUserUsage() {
    return this.request('/users/usage');
  }

  async deleteAccount() {
    return this.request('/users/account', {
      method: 'DELETE',
    });
  }

  // Organization endpoints
  async getOrganization() {
    return this.request('/organization');
  }

  async updateOrganization(data: {
    name?: string;
    industry?: string;
  }) {
    return this.request('/organization', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getOrganizationUsers() {
    return this.request('/organization/users');
  }

  async getOrganizationUsage() {
    return this.request('/organization/usage');
  }

  async inviteUser(data: {
    email: string;
    role?: 'USER' | 'ADMIN';
  }) {
    return this.request('/organization/invite', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUserRole(userId: string, role: 'USER' | 'ADMIN') {
    return this.request(`/organization/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  // Simulation endpoints
  async getSimulations(params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/simulations${queryString}`);
  }

  async getSimulation(id: string) {
    return this.request(`/simulations/${id}`);
  }

  async createSimulation(simulationData: any) {
    return this.request('/simulations', {
      method: 'POST',
      body: JSON.stringify(simulationData),
    });
  }

  async updateSimulation(id: string, simulationData: any) {
    return this.request(`/simulations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(simulationData),
    });
  }

  async saveSimulationResults(id: string, results: any) {
    return this.request(`/simulations/${id}/run`, {
      method: 'POST',
      body: JSON.stringify({ results }),
    });
  }

  async deleteSimulation(id: string) {
    return this.request(`/simulations/${id}`, {
      method: 'DELETE',
    });
  }

  async executeSimulation(simulationParams: any) {
    return this.request('/simulations/execute', {
      method: 'POST',
      body: JSON.stringify(simulationParams),
    });
  }

  // Payments
  async createCheckoutSession(planType: string, billingCycle: 'MONTHLY' | 'ANNUAL' = 'MONTHLY', paymentMethod: 'card' | 'invoice' = 'card') {
    return this.request('/payments/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ planType, billingCycle, paymentMethod }),
    });
  }

  async requestInvoice(planType: string, billingCycle: string = 'MONTHLY', dueDate?: string) {
    return this.request('/payments/request-invoice', {
      method: 'POST',
      body: JSON.stringify({ planType, billingCycle, dueDate }),
    });
  }
}

// Create a singleton instance of the ApiService
const apiServiceInstance = new ApiService();

/**
 * Composable function to get the singleton instance of the ApiService.
 * This is the preferred way to use the API service in Vue components.
 */
export function useApi() {
  return apiServiceInstance;
}

// Export the instance as default for use in non-component files (e.g., stores)
export default apiServiceInstance;
