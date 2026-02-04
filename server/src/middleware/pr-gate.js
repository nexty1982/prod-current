const TICKET_PATTERN = /\[FS-\d{1,5}\]/i;

function extractTicketReferences(text) {
    if (!text) return [];
    const matches = text.match(/\[FS-(\d{1,5})\]/gi) || [];
    return matches.map(m => m.match(/\d+/)?.[0]).filter(Boolean);
}

function validatePRTitle(title) {
    if (!title) return { valid: false, error: 'PR title required', tickets: [] };
    const hasRef = TICKET_PATTERN.test(title);
    const tickets = extractTicketReferences(title);
    if (!hasRef) return { valid: false, error: 'PR title must include [FS-XXX]', tickets: [], suggestion: `[FS-XXX] ${title}` };
    return { valid: true, tickets, error: null };
}

function prGateMiddleware(options = {}) {
    const { requireTicket = true, bypassUsers = [], bypassLabels = ['bypass-gate', 'hotfix'] } = options;
    return (req, res, next) => {
        if (req.headers['x-github-event'] !== 'pull_request') return next();
        const pr = req.body.pull_request;
        if (!pr) return next();
        
        const author = pr.user?.login;
        const labels = pr.labels?.map(l => l.name) || [];
        if (bypassUsers.includes(author) || labels.some(l => bypassLabels.includes(l))) {
            req.prGate = { bypassed: true };
            return next();
        }
        
        req.prGate = { validation: validatePRTitle(pr.title), pr: { number: pr.number, title: pr.title } };
        next();
    };
}

function requireTicketReference(options = {}) {
    const { headerName = 'X-Ticket-Reference', queryParam = 'ticket', required = true } = options;
    return (req, res, next) => {
        let ticketRef = req.headers[headerName.toLowerCase()] || req.query[queryParam] || req.body?.ticketReference;
        if (required && !ticketRef) return res.status(400).json({ error: 'Ticket reference required' });
        if (ticketRef) req.ticketReference = ticketRef.replace(/^FS-/i, '');
        next();
    };
}

module.exports = { validatePRTitle, extractTicketReferences, prGateMiddleware, requireTicketReference, TICKET_PATTERN };
