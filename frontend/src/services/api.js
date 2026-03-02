
class apiClient{
    constructor(baseURL = '/api') {
        this.baseURL = baseURL;             

    }
    async request(endpoint, options = {}){
        const url = `${this.baseURL}${endpoint}`;
        const headers = { 'Content-Type': 'application/json', ...options.headers };
        const res = await fetch(url, { ...options, headers });
        return res.json();
    }
    async get(url){
        return this.request(url, { method: 'GET' });
    }
    async post(url, data){
        return this.request(url, { method: 'POST', body: JSON.stringify(data) });
    }



}

const api = new apiClient();
export default api;