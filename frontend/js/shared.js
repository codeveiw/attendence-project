// ملف JavaScript مشترك للوظائف العامة

console.log('✅ تم تحميل shared.js');

// إعدادات النظام
const API_URL = "http://127.0.0.1:5000/api";

console.log('🔧 الإعدادات:', {
  API_URL
});

let html5QrCode = null;

// دوال localStorage آمنة
function getToken() {
  try {
    return localStorage.getItem('token');
  } catch (e) {
    console.error('خطأ في قراءة Token:', e);
    return null;
  }
}

function saveToken(token) {
  try {
    localStorage.setItem('token', token);
    // تحديث axios headers
    if (typeof axios !== 'undefined') {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    console.log('✅ تم حفظ Token');
  } catch (e) {
    console.error('خطأ في حفظ Token:', e);
  }
}

function getUser() {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    console.error('خطأ في قراءة User:', e);
    return null;
  }
}

function saveUser(user) {
  try {
    localStorage.setItem('user', JSON.stringify(user));
    console.log('✅ تم حفظ بيانات المستخدم');
  } catch (e) {
    console.error('خطأ في حفظ User:', e);
  }
}

// إعداد Axios عند تحميل الصفحة
const token = getToken();
if (token && typeof axios !== 'undefined') {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  console.log('✅ تم تعيين Token في Axios');
}

// التحقق من تسجيل الدخول
function checkAuth() {
  console.log('🔐 التحقق من المصادقة...');
  
  const currentPage = window.location.pathname.split("/").pop();
  console.log('📍 الصفحة الحالية:', currentPage);
  
  // إعادة قراءة البيانات من localStorage
  let token = getToken();
  let user = getUser();
  
  console.log('👤 المستخدم من localStorage:', user);
  console.log('🔑 Token موجود؟', !!token);

  // إذا كان المستخدم في صفحة تسجيل الدخول أو الصفحة الرئيسية، لا نفعل شيء
  if (
    currentPage === "login.html" ||
    currentPage === "index.html" ||
    currentPage === ""
  ) {
    console.log('✅ صفحة عامة - لا حاجة للمصادقة');
    return user;
  }

  // إذا لم يكن المستخدم مسجل دخول، توجيهه لصفحة تسجيل الدخول
  if (!token || !user || !user.role) {
    console.warn('⚠️ غير مسجل دخول - توجيه لصفحة تسجيل الدخول');
    window.location.href = "login.html";
    return null;
  }

  console.log('✅ مصادق:', user.username, '-', user.role);

  // التحقق من الصفحة الصحيحة
  if (user.role === "professor" && currentPage !== "doctor.html") {
    console.log('🔄 توجيه الدكتور لصفحته');
    window.location.href = "doctor.html";
  } else if (user.role === "student" && currentPage !== "student.html") {
    console.log('🔄 توجيه الطالب لصفحته');
    window.location.href = "student.html";
  } else if (user.role === "admin" && currentPage !== "admin.html") {
    console.log('🔄 توجيه المسؤول لصفحته');
    window.location.href = "admin.html";
  }
  
  return user;
}

// تسجيل الخروج
function logout() {
  console.log('👋 تسجيل الخروج');
  stopScanner();
  localStorage.clear();
  
  // إزالة axios headers
  if (typeof axios !== 'undefined') {
    delete axios.defaults.headers.common['Authorization'];
  }
  
  window.location.href = "login.html";
}

// عرض رسالة
function showMessage(elementId, message, type = 'success') {
  console.log(`💬 رسالة [${type}]:`, message);
  const el = document.getElementById(elementId);
  if (el) {
    el.className = type;
    el.textContent = message;
    el.style.display = 'block';
    
    // إخفاء الرسالة بعد 5 ثوانٍ
    setTimeout(() => {
      el.style.display = 'none';
    }, 5000);
  }
}

// إيقاف ماسح QR
function stopScanner() {
  if (html5QrCode) {
    html5QrCode
      .stop()
      .then(() => {
        html5QrCode = null;
        console.log('📷 تم إيقاف الماسح');
      })
      .catch((err) => {
        console.error('❌ خطأ في إيقاف الماسح:', err);
      });
  }
}

// طلب API مع معالجة الأخطاء (باستخدام fetch)
async function apiRequest(endpoint, method = 'GET', data = null) {
  const token = getToken();
  
  console.log(`📡 API Request: ${method} ${endpoint}`);
  
  if (!token) {
    console.error('❌ Token غير موجود');
    throw new Error('يجب تسجيل الدخول أولاً');
  }
  
  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);
    const result = await response.json();
    
    console.log(`📥 Response: ${response.status}`, result);
    
    if (!response.ok) {
      throw new Error(result.error || 'حدث خطأ في الاتصال');
    }
    
    return result;
  } catch (error) {
    console.error('❌ API Error:', error);
    
    // إذا كان الخطأ 401 (unauthorized)، إعادة التوجيه لصفحة تسجيل الدخول
    if (error.message.includes('401') || error.message.includes('Token')) {
      console.warn('⚠️ Token منتهي الصلاحية - إعادة توجيه');
      localStorage.clear();
      window.location.href = 'login.html';
    }
    
    throw error;
  }
}

// تنسيق التاريخ
function formatDate(dateString) {
  if (!dateString) return 'غير متوفر';
  
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
    console.error('خطأ في تنسيق التاريخ:', e);
    return dateString;
  }
}

// تنسيق الوقت المتبقي
function formatTimeRemaining(expiresAt) {
  try {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires - now;
    
    if (diff <= 0) return 'منتهية';
    
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) {
      return `${minutes} دقيقة متبقية`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} ساعة و ${remainingMinutes} دقيقة متبقية`;
  } catch (e) {
    console.error('خطأ في حساب الوقت المتبقي:', e);
    return 'غير متوفر';
  }
}

// توليد الحرف الأول من الاسم
function getInitials(name) {
  if (!name) return '؟';
  
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return parts[0][0] + parts[1][0];
  }
  return name[0];
}

console.log('✅ shared.js جاهز');