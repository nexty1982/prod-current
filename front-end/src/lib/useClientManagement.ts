// Client Management React Hooks
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clientManagementApi from '@/api/client-management.api';
import type {
    Client,
    CreateClientRequest,
    ClientListResponse,
    ClientStats,
    ChurchInfo,
    ChurchInfoUpdateRequest
} from '@/types/client-management.types';

// ═══════════════════════════════════════════════════════════════
// MAIN PLATFORM HOOKS (For Orthodox Metrics Admin)
// ═══════════════════════════════════════════════════════════════

// Hook to get all clients
export const useClients = (page = 1, limit = 10, search?: string) => {
    return useQuery({
        queryKey: ['clients', page, limit, search],
        queryFn: () => clientManagementApi.getClients(page, limit, search),
        staleTime: 30000, // 30 seconds
    });
};

// Hook to get specific client
export const useClient = (clientId: number) => {
    return useQuery({
        queryKey: ['client', clientId],
        queryFn: () => clientManagementApi.getClient(clientId),
        enabled: !!clientId,
    });
};

// Hook to create new client
export const useCreateClient = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (clientData: CreateClientRequest) => clientManagementApi.createClient(clientData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
        },
    });
};

// Hook to update client
export const useUpdateClient = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ clientId, updates }: { clientId: number; updates: Partial<Client> }) =>
            clientManagementApi.updateClient(clientId, updates),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            queryClient.invalidateQueries({ queryKey: ['client', variables.clientId] });
        },
    });
};

// Hook to delete client
export const useDeleteClient = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (clientId: number) => clientManagementApi.deleteClient(clientId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
        },
    });
};

// Hook to get client statistics
export const useClientStats = (clientId: number) => {
    return useQuery({
        queryKey: ['clientStats', clientId],
        queryFn: () => clientManagementApi.getClientStats(clientId),
        enabled: !!clientId,
    });
};

// Hook to update client status
export const useUpdateClientStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ clientId, status }: { clientId: number; status: 'active' | 'inactive' | 'suspended' }) =>
            clientManagementApi.updateClientStatus(clientId, status),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            queryClient.invalidateQueries({ queryKey: ['client', variables.clientId] });
        },
    });
};

// ═══════════════════════════════════════════════════════════════
// CLIENT-SPECIFIC HOOKS (For Individual Church Sites)
// ═══════════════════════════════════════════════════════════════

// Hook to get church information for a specific client
export const useChurchInfo = (clientSlug: string) => {
    return useQuery({
        queryKey: ['churchInfo', clientSlug],
        queryFn: () => clientManagementApi.getChurchInfo(clientSlug),
        enabled: !!clientSlug,
    });
};

// Hook to update church information
export const useUpdateChurchInfo = (clientSlug: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (updates: ChurchInfoUpdateRequest) =>
            clientManagementApi.updateChurchInfo(clientSlug, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['churchInfo', clientSlug] });
        },
    });
};

// Hook to get client baptism records
export const useClientBaptisms = (clientSlug: string, page = 1, limit = 10) => {
    return useQuery({
        queryKey: ['clientBaptisms', clientSlug, page, limit],
        queryFn: () => clientManagementApi.getClientBaptisms(clientSlug, page, limit),
        enabled: !!clientSlug,
    });
};

// Hook to get client marriage records
export const useClientMarriages = (clientSlug: string, page = 1, limit = 10) => {
    return useQuery({
        queryKey: ['clientMarriages', clientSlug, page, limit],
        queryFn: () => clientManagementApi.getClientMarriages(clientSlug, page, limit),
        enabled: !!clientSlug,
    });
};

// Hook to get client funeral records
export const useClientFunerals = (clientSlug: string, page = 1, limit = 10) => {
    return useQuery({
        queryKey: ['clientFunerals', clientSlug, page, limit],
        queryFn: () => clientManagementApi.getClientFunerals(clientSlug, page, limit),
        enabled: !!clientSlug,
    });
};

// Hook to get client statistics
export const useClientStatistics = (clientSlug: string) => {
    return useQuery({
        queryKey: ['clientStatistics', clientSlug],
        queryFn: () => clientManagementApi.getClientStatistics(clientSlug),
        enabled: !!clientSlug,
    });
};

// Hook to test client connection
export const useTestClientConnection = () => {
    return useMutation({
        mutationFn: (clientSlug: string) => clientManagementApi.testClientConnection(clientSlug),
    });
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATE MANAGEMENT HOOKS
// ═══════════════════════════════════════════════════════════════

// Hook to get available templates
export const useTemplates = () => {
    return useQuery({
        queryKey: ['templates'],
        queryFn: () => clientManagementApi.getTemplates(),
    });
};

// Hook to deploy template
export const useDeployTemplate = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ clientSlug, templateData }: { clientSlug: string; templateData: any }) =>
            clientManagementApi.deployTemplate(clientSlug, templateData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
        },
    });
};

// Hook to clone template
export const useCloneTemplate = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ templateId, clientSlug }: { templateId: string; clientSlug: string }) =>
            clientManagementApi.cloneTemplate(templateId, clientSlug),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
        },
    });
};

// ═══════════════════════════════════════════════════════════════
// UTILITY HOOKS
// ═══════════════════════════════════════════════════════════════

// Hook to manage client selection state
export const useClientSelection = () => {
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [selectedClientSlug, setSelectedClientSlug] = useState<string>('');

    const selectClient = (client: Client) => {
        setSelectedClient(client);
        setSelectedClientSlug(client.slug);
    };

    const clearSelection = () => {
        setSelectedClient(null);
        setSelectedClientSlug('');
    };

    return {
        selectedClient,
        selectedClientSlug,
        selectClient,
        clearSelection,
    };
};

// Hook to manage pagination state
export const usePagination = (initialPage = 1, initialLimit = 10) => {
    const [page, setPage] = useState(initialPage);
    const [limit, setLimit] = useState(initialLimit);

    const nextPage = () => setPage(prev => prev + 1);
    const prevPage = () => setPage(prev => Math.max(1, prev - 1));
    const goToPage = (newPage: number) => setPage(Math.max(1, newPage));
    const changeLimit = (newLimit: number) => {
        setLimit(newLimit);
        setPage(1); // Reset to first page when changing limit
    };

    return {
        page,
        limit,
        setPage,
        setLimit,
        nextPage,
        prevPage,
        goToPage,
        changeLimit,
    };
};
