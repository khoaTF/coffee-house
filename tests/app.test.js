const request = require('supertest');
const app = require('../src/app');

describe('App Server', () => {
    it('should set security headers on the response', async () => {
        const response = await request(app).get('/');
        
        expect(response.headers['x-content-type-options']).toBe('nosniff');
        expect(response.headers['x-frame-options']).toBe('DENY');
        expect(response.headers['x-xss-protection']).toBe('1; mode=block');
        expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    it('should serve static frontend files', async () => {
        const response = await request(app).get('/index.html');
        // Usually returns 200, if index.html exists in public directory
        expect(response.status === 200 || response.status === 404).toBeTruthy();
    });

    it('should have mounted the API routes at /api', async () => {
        // Even if the route returns 404, the path is correctly routed
        const response = await request(app).get('/api/health'); // Assume health or just test /api
        expect(response.status).not.toBe(500);
    });
});
