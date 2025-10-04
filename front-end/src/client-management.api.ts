// Client Management API Service
import type {
    Client,
    CreateClientRequest,
    ClientListResponse,
    ClientApiResponse,
    ClientStats,
    ChurchInfo,
    ChurchInfoUpdateRequest
} from '../types/client-management.types';
import { apiClient } from './utils/axiosInstance';

class ClientManagementApi {
    // Wrapper method to maintain API compatibility while using shared axios instance
    private async request<T>(
        endpoint: string,
        options: { method?: string; body?: string } = {}
    ): Promise<ClientApiResponse<T>> {
        try {
            let result;
            const data = options.body ? JSON.parse(options.body) : undefined;

            switch (options.method) {
                case 'POST':
                    result = await apiClient.post(endpoint, data);
                    break;
                case 'PUT':
                    result = await apiClient.put(endpoint, data);
                    break;
                case 'PATCH':
                    result = await apiClient.patch(endpoint, data);
                    break;
                case 'DELETE':
                    result = await apiClient.delete(endpoint);
                    break;
                default:
                    result = await apiClient.get(endpoint);
                    break;
            }

            // Wrap result to match expected ClientApiResponse format
            return {
                success: true,
                data: result,
                message: 'Operation completed successfully'
            };
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CLIENT MANAGEMENT (MAIN PLATFORM)
    // ═══════════════════════════════════════════════════════════════

    // Get all clients
    async getClients(page = 1, limit = 10, search?: string): Promise<ClientApiResponse<ClientListResponse>> {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            ...(search && { search })
        });

        return this.request<ClientListResponse>(`/clients?${params}`);
    }

    // Get specific client
    async getClient(clientId: number): Promise<ClientApiResponse<Client>> {
        return this.request<Client>(`/clients/${clientId}`);
    }

    // Create new client
    async createClient(clientData: CreateClientRequest): Promise<ClientApiResponse<Client>> {
        return this.request<Client>('/clients', {
            method: 'POST',
            body: JSON.stringify(clientData),
        });
    }

    // Update client
    async updateClient(clientId: number, updates: Partial<Client>): Promise<ClientApiResponse<Client>> {
        return this.request<Client>(`/clients/${clientId}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    }

    // Delete client
    async deleteClient(clientId: number): Promise<ClientApiResponse<void>> {
        return this.request<void>(`/clients/${clientId}`, {
            method: 'DELETE',
        });
    }

    // Get client statistics
    async getClientStats(clientId: number): Promise<ClientApiResponse<ClientStats>> {
        return this.request<ClientStats>(`/clients/${clientId}/stats`);
    }

    // Activate/Deactivate client
    async updateClientStatus(clientId: number, status: 'active' | 'inactive' | 'suspended'): Promise<ClientApiResponse<Client>> {
        return this.request<Client>(`/clients/${clientId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // CLIENT-SPECIFIC API METHODS (FOR CLIENT SITES)
    // ═══════════════════════════════════════════════════════════════

    // Get church information for a specific client
    async getChurchInfo(clientSlug: string): Promise<ClientApiResponse<ChurchInfo>> {
        return this.request<ChurchInfo>(`/client/${clientSlug}/api/church-info`);
    }

    // Update church information for a specific client
    async updateChurchInfo(clientSlug: string, updates: ChurchInfoUpdateRequest): Promise<ClientApiResponse<ChurchInfo>> {
        return this.request<ChurchInfo>(`/client/${clientSlug}/api/church-info`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    }

    // Get client-specific baptism records
    async getClientBaptisms(clientSlug: string, page = 1, limit = 10): Promise<ClientApiResponse<any>> {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });

        return this.request(`/client/${clientSlug}/api/baptisms?${params}`);
    }

    // Get client-specific marriage records
    async getClientMarriages(clientSlug: string, page = 1, limit = 10): Promise<ClientApiResponse<any>> {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });

        return this.request(`/client/${clientSlug}/api/marriages?${params}`);
    }

    // Get client-specific funeral records
    async getClientFunerals(clientSlug: string, page = 1, limit = 10): Promise<ClientApiResponse<any>> {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });

        return this.request(`/client/${clientSlug}/api/funerals?${params}`);
    }

    // Get client statistics
    async getClientStatistics(clientSlug: string): Promise<ClientApiResponse<ClientStats>> {
        return this.request<ClientStats>(`/client/${clientSlug}/api/stats`);
    }

    // Test client database connection
    async testClientConnection(clientSlug: string): Promise<ClientApiResponse<{ connected: boolean }>> {
        return this.request<{ connected: boolean }>(`/client/${clientSlug}/api/test-connection`);
    }

    // ═══════════════════════════════════════════════════════════════
    // TEMPLATE DEPLOYMENT METHODS
    // ═══════════════════════════════════════════════════════════════

    // Deploy ssppoc template for a new client
    async deployTemplate(clientSlug: string, templateData: any): Promise<ClientApiResponse<any>> {
        return this.request(`/client/${clientSlug}/api/deploy-template`, {
            method: 'POST',
            body: JSON.stringify(templateData),
        });
    }

    // Get available templates
    async getTemplates(): Promise<ClientApiResponse<any[]>> {
        return this.request<any[]>('/templates');
    }

    // Clone ssppoc template
    async cloneTemplate(templateId: string, clientSlug: string): Promise<ClientApiResponse<any>> {
        return this.request(`/templates/${templateId}/clone`, {
            method: 'POST',
            body: JSON.stringify({ clientSlug }),
        });
    }
}

export const clientManagementApi = new ClientManagementApi();
export default clientManagementApi;
