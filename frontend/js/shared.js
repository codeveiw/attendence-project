

// Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ù†Ø¸Ø§Ù…
// API base URL. Prefer same-origin when served over HTTP(S).
// You can override by setting `window.__API_URL__` before this script runs (useful for ngrok testing).
let API_URL = '/api';
try {
  if (window && window.__API_URL__) {
    API_URL = window.__API_URL__;
  } else if (window && window.location && typeof window.location.protocol === 'string' && window.location.protocol.startsWith('http')) {
    // use absolute origin so relative fetches always target the backend serving the frontend
    API_URL = window.location.origin + '/api';
  } else {
    API_URL = '/api';
  }
} catch (e) {
  API_URL = '/api';
}


console.log('ðŸ”§ Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª:', {
  API_URL
});

let html5QrCode = null;

// Ø¯ÙˆØ§Ù„ localStorage Ø¢Ù…Ù†Ø©
function getToken() {
  try {
    return localStorage.getItem('token');
  } catch (e) {
    console.error('Ø®Ø·Ø£ ÙÙŠ Ù‚Ø±Ø§Ø¡Ø© Token:', e);
    return null;
  }
}

function saveToken(token) {
  try {
    localStorage.setItem('token', token);
    // ØªØ­Ø¯ÙŠØ« axios headers
    if (typeof axios !== 'undefined') {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    console.log('âœ… ØªÙ… Ø­ÙØ¸ Token');
  } catch (e) {
    console.error('Ø®Ø·Ø£ ÙÙŠ Ø­ÙØ¸ Token:', e);
  }
}

function getUser() {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    console.error('Ø®Ø·Ø£ ÙÙŠ Ù‚Ø±Ø§Ø¡Ø© User:', e);
    return null;
  }
}

function saveUser(user) {
  try {
    localStorage.setItem('user', JSON.stringify(user));
    console.log('âœ… ØªÙ… Ø­ÙØ¸ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…');
  } catch (e) {
    console.error('Ø®Ø·Ø£ ÙÙŠ Ø­ÙØ¸ User:', e);
  }
}

// Ø¥Ø¹Ø¯Ø§Ø¯ Axios Ø¹Ù†Ø¯ ØªØ­Ù…ÙŠÙ„ Ø§Ù„ØµÙØ­Ø©
const token = getToken();
if (token && typeof axios !== 'undefined') {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  console.log('âœ… ØªÙ… ØªØ¹ÙŠÙŠÙ† Token ÙÙŠ Axios');
}

// Ù…Ø¹Ø±Ù Ø§Ù„Ø¬Ù‡Ø§Ø² Ø§Ù„Ù…Ø­Ù„ÙŠ: Ù†Ø¹Ø·ÙŠ ÙƒÙ„ Ù…ØªØµÙØ­/Ø¬Ù‡Ø§Ø² UUID Ø«Ø§Ø¨Øª ÙŠÙØ³ØªØ®Ø¯Ù… ÙƒØ±Ø£Ø³ X-Device-Id
function getDeviceId() {
  try {
    let did = localStorage.getItem('device_id');
    if (!did) {
      // ØªÙˆÙ„ÙŠØ¯ Ù…Ø¹Ø±Ù Ø¨Ø³ÙŠØ·
      did = 'dev-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
      localStorage.setItem('device_id', did);
      console.log('âœ… ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ device_id Ø¬Ø¯ÙŠØ¯:', did);
    }
    return did;
  } catch (e) {
    console.error('Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø­ØµÙˆÙ„ Ø¹Ù„Ù‰ device_id:', e);
    return null;
  }
}

// Ø£Ø¯Ø®Ù„ Ø±Ø£Ø³ X-Device-Id ÙÙŠ Axios Ø£ÙŠØ¶Ø§Ù‹ Ø¥Ø°Ø§ Ù…ØªØ§Ø­
try {
  const did = getDeviceId();
  if (did && typeof axios !== 'undefined') {
    axios.defaults.headers.common['X-Device-Id'] = did;
    console.log('âœ… ØªÙ… ØªØ¹ÙŠÙŠÙ† X-Device-Id ÙÙŠ Axios');
  }
} catch (e) {}

// Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„
function checkAuth() {
  console.log('ðŸ” Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ù…ØµØ§Ø¯Ù‚Ø©...');
  
  const currentPage = window.location.pathname.split("/").pop();
  console.log('ðŸ“ Ø§Ù„ØµÙØ­Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ©:', currentPage);
  
  // Ø¥Ø¹Ø§Ø¯Ø© Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ù…Ù† localStorage
  let token = getToken();
  let user = getUser();
  
  console.log('ðŸ‘¤ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ù…Ù† localStorage:', user);
  console.log('ðŸ”‘ Token Ù…ÙˆØ¬ÙˆØ¯ØŸ', !!token);

  // Ø¥Ø°Ø§ ÙƒØ§Ù† Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… ÙÙŠ ØµÙØ­Ø© ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ø£Ùˆ Ø§Ù„ØµÙØ­Ø© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©ØŒ Ù„Ø§ Ù†ÙØ¹Ù„ Ø´ÙŠØ¡
  if (
    currentPage === "login.html" ||
    currentPage === "index.html" ||
    currentPage === ""
  ) {
    console.log('âœ… ØµÙØ­Ø© Ø¹Ø§Ù…Ø© - Ù„Ø§ Ø­Ø§Ø¬Ø© Ù„Ù„Ù…ØµØ§Ø¯Ù‚Ø©');
    return user;
  }

  // Ø¥Ø°Ø§ Ù„Ù… ÙŠÙƒÙ† Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ù…Ø³Ø¬Ù„ Ø¯Ø®ÙˆÙ„ØŒ ØªÙˆØ¬ÙŠÙ‡Ù‡ Ù„ØµÙØ­Ø© ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„
  if (!token || !user || !user.role) {
    console.warn('âš ï¸ ØºÙŠØ± Ù…Ø³Ø¬Ù„ Ø¯Ø®ÙˆÙ„ - ØªÙˆØ¬ÙŠÙ‡ Ù„ØµÙØ­Ø© ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„');
    window.location.href = "login.html";
    return null;
  }

  console.log('âœ… Ù…ØµØ§Ø¯Ù‚:', user.username, '-', user.role);

  // Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„ØµÙØ­Ø© Ø§Ù„ØµØ­ÙŠØ­Ø©
  if (user.role === "professor" && currentPage !== "doctor.html") {
    console.log('ðŸ”„ ØªÙˆØ¬ÙŠÙ‡ Ø§Ù„Ø¯ÙƒØªÙˆØ± Ù„ØµÙØ­ØªÙ‡');
    window.location.href = "doctor.html";
  } else if (user.role === "student" && currentPage !== "student.html") {
    console.log('ðŸ”„ ØªÙˆØ¬ÙŠÙ‡ Ø§Ù„Ø·Ø§Ù„Ø¨ Ù„ØµÙØ­ØªÙ‡');
    window.location.href = "student.html";
  } else if (user.role === "admin" && currentPage !== "admin.html") {
    console.log('ðŸ”„ ØªÙˆØ¬ÙŠÙ‡ Ø§Ù„Ù…Ø³Ø¤ÙˆÙ„ Ù„ØµÙØ­ØªÙ‡');
    window.location.href = "admin.html";
  }
  
  return user;
}

// ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø±ÙˆØ¬
function logout() {
  console.log('ðŸ‘‹ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø±ÙˆØ¬');
  stopScanner();
  try {
    // Preserve device_id so users can't bypass device-binding by logging out
    const did = localStorage.getItem('device_id');
    localStorage.clear();
    if (did) localStorage.setItem('device_id', did);
  } catch (e) {
    try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch (e2) {}
  }

  // Ø¥Ø²Ø§Ù„Ø© axios headers but keep X-Device-Id
  if (typeof axios !== 'undefined') {
    delete axios.defaults.headers.common['Authorization'];
    try {
      const did = getDeviceId();
      if (did) axios.defaults.headers.common['X-Device-Id'] = did;
    } catch (e) {}
  }

  window.location.href = "login.html";
}

// Ø¹Ø±Ø¶ Ø±Ø³Ø§Ù„Ø©
function showMessage(elementId, message, type = 'success') {
  console.log(`ðŸ’¬ Ø±Ø³Ø§Ù„Ø© [${type}]:`, message);
  const el = document.getElementById(elementId);
  if (el) {
    el.className = type;
    el.textContent = message;
    el.style.display = 'block';
    
    // Ø¥Ø®ÙØ§Ø¡ Ø§Ù„Ø±Ø³Ø§Ù„Ø© Ø¨Ø¹Ø¯ 5 Ø«ÙˆØ§Ù†Ù
    setTimeout(() => {
      el.style.display = 'none';
    }, 5000);
  }
}

// Ø¥ÙŠÙ‚Ø§Ù Ù…Ø§Ø³Ø­ QR
function stopScanner() {
  if (html5QrCode) {
    html5QrCode
      .stop()
      .then(() => {
        html5QrCode = null;
        console.log('ðŸ“· ØªÙ… Ø¥ÙŠÙ‚Ø§Ù Ø§Ù„Ù…Ø§Ø³Ø­');
      })
      .catch((err) => {
        console.error('âŒ Ø®Ø·Ø£ ÙÙŠ Ø¥ÙŠÙ‚Ø§Ù Ø§Ù„Ù…Ø§Ø³Ø­:', err);
      });
  }
}

// Ø·Ù„Ø¨ API Ù…Ø¹ Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„Ø£Ø®Ø·Ø§Ø¡ (Ø¨Ø§Ø³ØªØ®Ø¯Ø§Ù… fetch)
async function apiRequest(endpoint, method = 'GET', data = null) {
  const token = getToken();
  
  console.log(`ðŸ“¡ API Request: ${method} ${endpoint}`);
  
  if (!token) {
    console.error('âŒ Token ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯');
    throw new Error('ÙŠØ¬Ø¨ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ø£ÙˆÙ„Ø§Ù‹');
  }
  
  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };

  // Ø§Ø¶Ù X-Device-Id Ù„ÙƒÙ„ Ø·Ù„Ø¨ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ (Ø¨Ø¹Ø¶ Ø§Ù„Ù€ endpoints ÙŠØ·Ù„Ø¨ÙˆÙ† Ù‡Ø°Ø§ Ø§Ù„Ø±Ø£Ø³)
  try {
    const did = getDeviceId();
    if (did) options.headers['X-Device-Id'] = did;
  } catch (e) {
    console.warn('âš ï¸ Ù„Ù… Ø£ØªÙ…ÙƒÙ† Ù…Ù† Ø¥Ø¶Ø§ÙØ© X-Device-Id Ù„Ù„Ø·Ù„Ø¨:', e);
  }

  // Ø§Ø¶Ù X-RSSI Ø¥Ø°Ø§ ÙƒØ§Ù†Øª Ù…ØªÙˆÙØ±Ø© (Ù…Ù‚Ø¯Ù…Ø© Ù…Ù† native app Ø£Ùˆ Ø§Ø®ØªØ¨Ø§Ø± Ù…Ø­Ù„ÙŠ Ø¹Ø¨Ø± window.__RSSI__)
  try {
    // window.__RSSI__ can be set by a native wrapper or console for testing
    const rssiOverride = (typeof window !== 'undefined' && window.__RSSI__ !== undefined) ? window.__RSSI__ : null;
    const rssiStored = (typeof localStorage !== 'undefined') ? localStorage.getItem('rssi') : null;
    const rssi = rssiOverride || rssiStored;
    if (rssi !== null && rssi !== undefined) {
      // ensure it's sent as a simple number string
      options.headers['X-RSSI'] = String(rssi);
    }
  } catch (e) {
    console.warn('âš ï¸ Ù„Ù… Ø£ØªÙ…ÙƒÙ† Ù…Ù† Ø¥Ø¶Ø§ÙØ© X-RSSI Ù„Ù„Ø·Ù„Ø¨:', e);
  }
  
  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }
  
  try {
    const url = `${API_URL}${endpoint}`;
    const response = await fetch(url, options);

    // Try to parse JSON; if parsing fails, capture text for debugging
    let result = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      result = await response.json();
    } else {
      // not JSON - read text to show helpful error
      const text = await response.text();
      console.error('âŒ API returned non-JSON response for', url, 'status', response.status);
      console.error('--- response text start ---');
      console.error(text.slice(0, 2000));
      console.error('--- response text end ---');
      // If the response looks like HTML, provide a clearer hint to the user
      const snippet = text.slice(0,200).replace(/\s+/g,' ');
      if (snippet.toLowerCase().includes('<!doctype') || snippet.toLowerCase().includes('<html')) {
        throw new Error(`Server returned HTML instead of JSON for ${url} (status ${response.status}). This usually means the backend is not reachable or the API base URL is incorrect. Response starts with: ${snippet}`);
      }
      throw new Error(`Server returned non-JSON response (status ${response.status}). Response starts with: ${snippet}`);
    }

    console.log(`ðŸ“¥ Response: ${response.status}`, result);

    if (!response.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }

    return result;
  } catch (error) {
    console.error('âŒ API Error:', error);
    // if unauthorized, force re-login
    if (String(error).includes('401') || String(error).toLowerCase().includes('token')) {
      console.warn('âš ï¸ Token Ù…Ù†ØªÙ‡ÙŠ Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ© Ø£Ùˆ Ù…ÙÙ‚ÙˆØ¯ - Ø¥Ø¹Ø§Ø¯Ø© ØªÙˆØ¬ÙŠÙ‡');
      localStorage.clear();
      window.location.href = 'login.html';
    }
    throw error;
  }
}

// Helper: allow setting RSSI override from console for testing
function setRssiOverride(value) {
  try {
    if (typeof window !== 'undefined') window.__RSSI__ = value;
    try { localStorage.setItem('rssi', String(value)); } catch (e) {}
    console.log('âœ… RSSI override set to', value);
  } catch (e) {
    console.warn('âš ï¸ failed to set RSSI override', e);
  }
}

// ØªÙ†Ø³ÙŠÙ‚ Ø§Ù„ØªØ§Ø±ÙŠØ®
function formatDate(dateString) {
  if (!dateString) return 'ØºÙŠØ± Ù…ØªÙˆÙØ±';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    console.error('Ø®Ø·Ø£ ÙÙŠ ØªÙ†Ø³ÙŠÙ‚ Ø§Ù„ØªØ§Ø±ÙŠØ®:', e);
    return dateString;
  }
}

// ØªÙ†Ø³ÙŠÙ‚ Ø§Ù„ÙˆÙ‚Øª Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ
function formatTimeRemaining(expiresAt) {
  try {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires - now;
    
    if (diff <= 0) return 'Ù…Ù†ØªÙ‡ÙŠØ©';
    
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) {
      return `${minutes} Ø¯Ù‚ÙŠÙ‚Ø© Ù…ØªØ¨Ù‚ÙŠØ©`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} Ø³Ø§Ø¹Ø© Ùˆ ${remainingMinutes} Ø¯Ù‚ÙŠÙ‚Ø© Ù…ØªØ¨Ù‚ÙŠØ©`;
  } catch (e) {
    console.error('Ø®Ø·Ø£ ÙÙŠ Ø­Ø³Ø§Ø¨ Ø§Ù„ÙˆÙ‚Øª Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ:', e);
    return 'ØºÙŠØ± Ù…ØªÙˆÙØ±';
  }
}

// ØªÙˆÙ„ÙŠØ¯ Ø§Ù„Ø­Ø±Ù Ø§Ù„Ø£ÙˆÙ„ Ù…Ù† Ø§Ù„Ø§Ø³Ù…
function getInitials(name) {
  if (!name) return 'ØŸ';
  
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return parts[0][0] + parts[1][0];
  }
  return name[0];
}

console.log('âœ… shared.js Ø¬Ø§Ù‡Ø²');

// Theme handling: persist theme in localStorage and apply to <html>
function getSavedTheme() {
  try { return localStorage.getItem('theme') || null; } catch (e) { return null; }
}

function saveTheme(t) {
  try { localStorage.setItem('theme', t); } catch (e) {}
}

function applyTheme(theme) {
  try {
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  } catch (e) { console.warn('applyTheme failed', e); }
}

function toggleTheme() {
  const cur = getSavedTheme();
  const next = cur === 'dark' ? 'light' : 'dark';
  saveTheme(next);
  applyTheme(next === 'dark' ? 'dark' : 'light');
}

// Initialize theme on load
(function() {
  try {
    const saved = getSavedTheme();
    if (saved) applyTheme(saved === 'dark' ? 'dark' : 'light');
    // attach click handlers to any .theme-toggle elements
    document.addEventListener('click', function(e) {
      const t = e.target.closest && e.target.closest('.theme-toggle');
      if (t) {
        e.preventDefault();
        toggleTheme();
      }
    });
  } catch (e) { /* ignore */ }
})()