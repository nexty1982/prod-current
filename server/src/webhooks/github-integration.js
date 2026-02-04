const crypto = require('crypto');
const express = require('express');
const router = express.Router();

const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;
let freescoutAPI = null;
try { freescoutAPI = require('../integrations/freescout-api').freescoutAPI; } catch (e) {}

function verifySignature(payload, signature) {
    if (!GITHUB_WEBHOOK_SECRET) return true;
    if (!signature) return false;
    const hmac = crypto.createHmac('sha256', GITHUB_WEBHOOK_SECRET);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

function extractTicketRef(title) {
    const match = title.match(/\[FS-(\d+)\]/i);
    return match ? match[1] : null;
}

router.post('/github', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['x-hub-signature-256'];
    const event = req.headers['x-github-event'];
    const payload = req.body.toString();

    if (!verifySignature(payload, signature)) {
        return res.status(401).json({ error: 'Invalid signature' });
    }

    let data;
    try { data = JSON.parse(payload); } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON' });
    }

    console.log(`[GitHub Webhook] ${event} event received`);

    if (event === 'pull_request') {
        const pr = data.pull_request;
        const ticketRef = extractTicketRef(pr.title);
        if (!ticketRef) console.warn(`PR #${pr.number} missing [FS-XXX] reference`);
        return res.json({ success: true, pr: pr.number, ticketRef });
    }

    if (event === 'issues' && data.action === 'opened' && freescoutAPI) {
        await freescoutAPI.createFromGitHubIssue({ ...data.issue, repository: data.repository.full_name });
    }

    res.json({ success: true, event });
});

router.get('/github/health', (req, res) => {
    res.json({ status: 'ok', webhookSecretConfigured: !!GITHUB_WEBHOOK_SECRET });
});

module.exports = router;
