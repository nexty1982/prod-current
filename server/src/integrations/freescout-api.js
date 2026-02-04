const axios = require('axios');

class FreeScoutAPI {
    constructor(config = {}) {
        this.baseUrl = config.baseUrl || process.env.FREESCOUT_API_URL || 'https://support.orthodoxmetrics.com/api';
        this.apiKey = config.apiKey || process.env.FREESCOUT_API_KEY;
        this.mailboxId = config.mailboxId || process.env.FREESCOUT_MAILBOX_ID || 1;
        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: { 'X-FreeScout-API-Key': this.apiKey, 'Content-Type': 'application/json' },
            timeout: 30000
        });
    }

    async createTicket(ticket) {
        try {
            const payload = {
                type: ticket.type || 'email',
                mailboxId: this.mailboxId,
                subject: ticket.subject,
                customer: { email: ticket.customerEmail, firstName: ticket.customerName?.split(' ')[0] || '' },
                threads: [{ type: 'customer', body: ticket.body, customer: { email: ticket.customerEmail } }],
                status: ticket.status || 'active',
                tags: ticket.tags || []
            };
            const response = await this.client.post('/conversations', payload);
            return { success: true, ticketId: response.data.id, data: response.data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async addReply(conversationId, reply) {
        try {
            const response = await this.client.post(`/conversations/${conversationId}/threads`, {
                type: reply.type || 'note', body: reply.body
            });
            return { success: true, threadId: response.data.id };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getTicket(id) {
        try {
            const response = await this.client.get(`/conversations/${id}`);
            return { success: true, data: response.data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async updateStatus(id, status) {
        try {
            await this.client.put(`/conversations/${id}`, { status });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async createFromGitHubIssue(issue) {
        return this.createTicket({
            subject: `[GitHub #${issue.number}] ${issue.title}`,
            body: `${issue.body || 'No description'}\n\nURL: ${issue.html_url}`,
            customerEmail: `${issue.user?.login}@github.orthodoxmetrics.com`,
            customerName: issue.user?.login,
            tags: ['github', 'auto-created']
        });
    }
}

module.exports = { FreeScoutAPI, freescoutAPI: new FreeScoutAPI() };
