import path from 'node:path';

// Signed-in browser state per role, written once per run by auth.setup.ts
// and loaded by the donorPage/partnerPage fixtures. Gitignored - it holds
// live session cookies.
const authDir = path.join(__dirname, '..', '..', '.auth');

export const DONOR_AUTH = path.join(authDir, 'donor.json');
export const PARTNER_AUTH = path.join(authDir, 'partner.json');
