import { http, HttpResponse } from 'msw';
import { Church } from 'src/types/orthodox-metrics.types';

export let churchesList: Church[] = [
    {
        id: 1,
        name: 'St. John Orthodox Church',
        email: 'info@stjohnorthodox.org',
        phone: '+1 (555) 123-4567',
        address: '123 Faith Street',
        city: 'New York',
        state_province: 'NY',
        postal_code: '10001',
        country: 'United States',
        preferred_language: 'en',
        timezone: 'America/New_York',
        currency: 'USD',
        tax_id: '12-3456789',
        website: 'https://stjohnorthodox.org',
        description_multilang: JSON.stringify({
            en: 'A vibrant Orthodox community serving the faithful in New York'
        }),
        settings: JSON.stringify({
            notifications: true,
            calendar_sync: true,
            public_directory: true
        }),
        is_active: true,
        created_at: '2020-01-15T10:30:00.000Z',
        updated_at: '2024-12-01T15:45:00.000Z',
    },
    {
        id: 2,
        name: 'Holy Trinity Greek Orthodox Cathedral',
        email: 'contact@holytrinitychi.org',
        phone: '+1 (555) 234-5678',
        address: '456 Orthodox Ave',
        city: 'Chicago',
        state_province: 'IL',
        postal_code: '60601',
        country: 'United States',
        preferred_language: 'gr',
        timezone: 'America/Chicago',
        currency: 'USD',
        tax_id: '98-7654321',
        website: 'https://holytrinitychi.org',
        description_multilang: JSON.stringify({
            en: 'Historic Greek Orthodox Cathedral in the heart of Chicago',
            gr: 'Ιστορικός Ελληνορθόδοξος Καθεδρικός Ναός στην καρδιά του Σικάγο'
        }),
        settings: JSON.stringify({
            notifications: true,
            calendar_sync: false,
            public_directory: true
        }),
        is_active: true,
        created_at: '2020-02-20T09:15:00.000Z',
        updated_at: '2024-11-28T12:30:00.000Z',
    },
    {
        id: 3,
        name: 'St. Nicholas Russian Orthodox Church',
        address: '789 Russian Hill, San Francisco, CA 94133',
        email: 'office@stnicholassf.org',
        phone: '+1 (555) 345-6789',
        preferred_language: 'ru',
        website: 'https://stnicholassf.org',
        created_at: '2020-03-10T14:20:00.000Z',
        updated_at: '2024-12-05T16:00:00.000Z',
    },
    {
        id: 4,
        name: 'St. Mary Romanian Orthodox Church',
        address: '321 Carpathian Way, Detroit, MI 48201',
        email: 'info@stmaryromanian.org',
        phone: '+1 (555) 456-7890',
        preferred_language: 'ro',
        website: 'https://stmaryromanian.org',
        created_at: '2020-04-05T11:45:00.000Z',
        updated_at: '2024-11-15T13:20:00.000Z',
    },
    {
        id: 5,
        name: 'Christ the Savior Orthodox Church',
        address: '654 Savior Blvd, Miami, FL 33101',
        email: 'contact@christsaviormiami.org',
        phone: '+1 (555) 567-8901',
        preferred_language: 'en',
        website: 'https://christsaviormiami.org',
        created_at: '2020-05-12T08:30:00.000Z',
        updated_at: '2024-10-01T10:15:00.000Z',
    },
];

const getNextId = () => {
    const maxId = Math.max(...churchesList.map((church) => church.id));
    return maxId + 1;
};

// Generate next customer ID
const getNextCustomerId = () => {
    const existingIds = churchesList
        .map(church => church.customer_id)
        .filter(id => id && id.startsWith('CUS-US-'))
        .map(id => parseInt(id!.split('-')[2]))
        .filter(num => !isNaN(num));

    const maxId = Math.max(...existingIds, 0);
    return `CUS-US-${String(maxId + 1).padStart(5, '0')}`;
};

export const ChurchHandlers = [

    // GET /api/churches - Get all churches with filters
    http.get("/api/churches", ({ request }) => {
        try {
            const url = new URL(request.url);
            const page = parseInt(url.searchParams.get('page') || '1');
            const limit = parseInt(url.searchParams.get('limit') || '10');
            const search = url.searchParams.get('search');
            const language = url.searchParams.get('language');
            const is_active = url.searchParams.get('is_active');

            let filteredChurches = [...churchesList];

            // Apply filters
            if (search) {
                filteredChurches = filteredChurches.filter(church =>
                    church.name.toLowerCase().includes(search.toLowerCase()) ||
                    church.email.toLowerCase().includes(search.toLowerCase()) ||
                    church.diocese?.toLowerCase().includes(search.toLowerCase()) ||
                    church.priest_name?.toLowerCase().includes(search.toLowerCase())
                );
            }

            if (language) {
                filteredChurches = filteredChurches.filter(church => church.preferred_language === language);
            }

            if (is_active !== null && is_active !== undefined) {
                const activeFilter = is_active === 'true';
                filteredChurches = filteredChurches.filter(church => church.is_active === activeFilter);
            }

            // Apply pagination
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedChurches = filteredChurches.slice(startIndex, endIndex);

            return HttpResponse.json({
                data: paginatedChurches,
                pagination: {
                    page,
                    limit,
                    total: filteredChurches.length,
                    totalPages: Math.ceil(filteredChurches.length / limit),
                },
            });
        } catch (error) {
            return HttpResponse.json({
                status: 500,
                message: "Internal server error",
                error,
            }, { status: 500 });
        }
    }),

    // GET /api/churches/:id - Get church by ID
    http.get("/api/churches/:id", ({ params }) => {
        try {
            const id = parseInt(params.id as string);
            console.log('MSW: Fetching church with ID:', id);
            const church = churchesList.find(ch => ch.id === id);

            if (!church) {
                console.log('MSW: Church not found for ID:', id);
                return HttpResponse.json({
                    status: 404,
                    message: "Church not found",
                }, { status: 404 });
            }

            console.log('MSW: Returning church:', church);
            return HttpResponse.json(church);
        } catch (error) {
            console.error('MSW: Error in getChurchById handler:', error);
            return HttpResponse.json({
                status: 500,
                message: "Internal server error",
                error,
            }, { status: 500 });
        }
    }),

    // POST /api/churches - Create new church
    http.post("/api/churches", async ({ request }) => {
        try {
            const newChurchData = await request.json() as any;
            const newChurch: Church = {
                id: getNextId(),
                customer_id: getNextCustomerId(), // Auto-generate customer ID
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                upload_capacity_mb: 250, // Default capacity
                is_active: true, // New churches are active by default
                ...newChurchData,
            };

            churchesList.push(newChurch);
            console.log('MSW: Created new church:', newChurch);
            return HttpResponse.json(newChurch);
        } catch (error) {
            console.error('MSW: Error creating church:', error);
            return HttpResponse.json({
                status: 500,
                message: "Internal server error",
                error,
            }, { status: 500 });
        }
    }),

    // PUT /api/churches/:id - Update church
    http.put("/api/churches/:id", async ({ params, request }) => {
        try {
            const id = parseInt(params.id as string);
            const updates = await request.json() as any;
            const churchIndex = churchesList.findIndex(ch => ch.id === id);

            if (churchIndex === -1) {
                return HttpResponse.json({
                    status: 404,
                    message: "Church not found",
                }, { status: 404 });
            }

            churchesList[churchIndex] = {
                ...churchesList[churchIndex],
                ...updates,
                updated_at: new Date().toISOString(),
            };

            console.log('MSW: Updated church:', churchesList[churchIndex]);
            return HttpResponse.json(churchesList[churchIndex]);
        } catch (error) {
            return HttpResponse.json({
                status: 500,
                message: "Internal server error",
                error,
            }, { status: 500 });
        }
    }),

    // DELETE /api/churches/:id - Delete church (soft delete)
    http.delete("/api/churches/:id", ({ params }) => {
        try {
            const id = parseInt(params.id as string);
            const churchIndex = churchesList.findIndex(ch => ch.id === id);

            if (churchIndex === -1) {
                return HttpResponse.json({
                    status: 404,
                    message: "Church not found",
                }, { status: 404 });
            }

            // Soft delete - mark as inactive
            churchesList[churchIndex] = {
                ...churchesList[churchIndex],
                is_active: false,
                updated_at: new Date().toISOString(),
            };

            return HttpResponse.json({
                message: "Church deleted successfully",
                church: churchesList[churchIndex]
            });
        } catch (error) {
            return HttpResponse.json({
                status: 500,
                message: "Internal server error",
                error,
            }, { status: 500 });
        }
    }),

    // POST /api/churches/:id/approve - Approve church
    http.post("/api/churches/:id/approve", async ({ params, request }) => {
        try {
            const id = parseInt(params.id as string);
            const { notes } = await request.json() as { notes?: string };
            const churchIndex = churchesList.findIndex(ch => ch.id === id);

            if (churchIndex === -1) {
                return HttpResponse.json({
                    status: 404,
                    message: "Church not found",
                }, { status: 404 });
            }

            churchesList[churchIndex] = {
                ...churchesList[churchIndex],
                is_active: true,
                updated_at: new Date().toISOString(),
            };

            return HttpResponse.json({
                message: "Church approved successfully",
                notes,
            });
        } catch (error) {
            return HttpResponse.json({
                status: 500,
                message: "Internal server error",
                error,
            }, { status: 500 });
        }
    }),

    // POST /api/churches/:id/suspend - Suspend church
    http.post("/api/churches/:id/suspend", async ({ params, request }) => {
        try {
            const id = parseInt(params.id as string);
            const { reason } = await request.json() as { reason?: string };
            const churchIndex = churchesList.findIndex(ch => ch.id === id);

            if (churchIndex === -1) {
                return HttpResponse.json({
                    status: 404,
                    message: "Church not found",
                }, { status: 404 });
            }

            churchesList[churchIndex] = {
                ...churchesList[churchIndex],
                is_active: false,
                updated_at: new Date().toISOString(),
            };

            return HttpResponse.json({
                message: "Church suspended successfully",
                reason,
            });
        } catch (error) {
            return HttpResponse.json({
                status: 500,
                message: "Internal server error",
                error,
            }, { status: 500 });
        }
    }),

    // POST /api/churches/:id/activate - Activate church
    http.post("/api/churches/:id/activate", ({ params }) => {
        try {
            const id = parseInt(params.id as string);
            const churchIndex = churchesList.findIndex(ch => ch.id === id);

            if (churchIndex === -1) {
                return HttpResponse.json({
                    status: 404,
                    message: "Church not found",
                }, { status: 404 });
            }

            churchesList[churchIndex] = {
                ...churchesList[churchIndex],
                is_active: true,
                updated_at: new Date().toISOString(),
            };

            return HttpResponse.json({
                message: "Church activated successfully",
            });
        } catch (error) {
            return HttpResponse.json({
                status: 500,
                message: "Internal server error",
                error,
            }, { status: 500 });
        }
    }),
];
