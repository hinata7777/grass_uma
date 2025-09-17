const API_BASE_URL = 'http://localhost:3001';

class ApiService {
  constructor() {
    this.sessionId = null;
  }

  setSessionId(sessionId) {
    this.sessionId = sessionId;
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (this.sessionId) {
      headers['Authorization'] = `Bearer ${this.sessionId}`;
    }

    return headers;
  }

  async fetchUserInfo() {
    const response = await fetch(`${API_BASE_URL}/api/user`, {
      headers: this.getHeaders()
    });
    return response.json();
  }

  async syncContributions() {
    const response = await fetch(`${API_BASE_URL}/api/sync`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    return response.json();
  }

  async getUmaDiscoveries() {
    const response = await fetch(`${API_BASE_URL}/api/uma/discoveries`, {
      headers: this.getHeaders()
    });
    return response.json();
  }

  async getUmaSpecies() {
    const response = await fetch(`${API_BASE_URL}/api/uma/species`);
    return response.json();
  }

  async discoverUma() {
    const response = await fetch(`${API_BASE_URL}/api/uma/discover`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    return response.json();
  }

  async feedUma(umaId, feedAmount = 10) {
    const response = await fetch(`${API_BASE_URL}/api/uma/feed`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        uma_id: umaId,
        feed_amount: feedAmount
      })
    });
    return response.json();
  }

  async addTestPoints(points = 50) {
    const response = await fetch(`${API_BASE_URL}/api/debug/add_points?points=${points}`, {
      headers: this.getHeaders()
    });
    return response.json();
  }

  // レスポンス処理のヘルパー
  async handleResponse(apiCall) {
    try {
      const response = await apiCall();
      if (response.ok !== undefined) {
        return { success: response.ok, data: response };
      }
      return { success: true, data: response };
    } catch (error) {
      console.error('API Error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new ApiService();