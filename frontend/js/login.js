// ملف JavaScript خاص بصفحة تسجيل الدخول

console.log('✅ تم تحميل ملف login.js');

// انتظر حتى يتم تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
  console.log('📄 تم تحميل DOM');
  
  const loginForm = document.getElementById('loginForm');
  
  if (!loginForm) {
    console.error('❌ لم يتم العثور على نموذج تسجيل الدخول');
    return;
  }
  
  console.log('✅ تم العثور على نموذج تسجيل الدخول');
  
  // معالج الإرسال
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    console.log('🔐 تم الضغط على زر تسجيل الدخول');
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    console.log('📝 بيانات الإدخال:', { username, passwordLength: password.length });
    
    if (!username || !password) {
      console.warn('⚠️ يرجى ملء جميع الحقول');
      showMessage('loginMessage', '❌ يرجى ملء جميع الحقول', 'error');
      return;
    }
    
    // تعطيل الزر
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ جاري تسجيل الدخول...';
    }
    
    try {
      console.log('📡 إرسال الطلب إلى:', API_URL + '/login');
      
      const response = await fetch(API_URL + '/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: username,
          password: password
        })
      });
      
      console.log('📥 تم الحصول على رد:', response.status);
      
      const data = await response.json();
      console.log('📦 البيانات المستلمة:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'فشل تسجيل الدخول');
      }
      
      // حفظ البيانات
      console.log('💾 حفظ Token والمستخدم...');
      saveToken(data.token);
      saveUser(data.user);
      
      console.log('✅ تم حفظ البيانات في localStorage');
      console.log('👤 المستخدم:', data.user.username);
      console.log('👥 الدور:', data.user.role);
      
      // عرض رسالة النجاح
      showMessage('loginMessage', '✅ تم تسجيل الدخول بنجاح! جاري التوجيه...', 'success');
      
      // التوجيه بعد ثانية واحدة
      setTimeout(() => {
        console.log('🚀 جاري التوجيه...');
        
        if (data.user.role === 'admin') {
          console.log('📍 التوجيه إلى admin.html');
          window.location.href = 'admin.html';
        } else if (data.user.role === 'professor') {
          console.log('📍 التوجيه إلى doctor.html');
          window.location.href = 'doctor.html';
        } else if (data.user.role === 'student') {
          console.log('📍 التوجيه إلى student.html');
          window.location.href = 'student.html';
        } else {
          console.error('❌ دور غير معروف:', data.user.role);
          showMessage('loginMessage', '❌ دور المستخدم غير معروف', 'error');
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ حدث خطأ:', error);
      
      let errorMessage = 'فشل تسجيل الدخول';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      showMessage('loginMessage', '❌ ' + errorMessage, 'error');
      
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'تسجيل الدخول';
      }
    }
  });
  
  // التحقق من تسجيل الدخول المسبق
  const existingToken = getToken();
  const existingUser = getUser();
  
  if (existingToken && existingUser && existingUser.role) {
    console.log('✅ وجدت جلسة سابقة:', existingUser.username, '-', existingUser.role);
    
    if (existingUser.role === 'admin') {
      console.log('🚀 التوجيه إلى صفحة المسؤول');
      window.location.href = 'admin.html';
    } else if (existingUser.role === 'professor') {
      console.log('🚀 التوجيه إلى صفحة الدكتور');
      window.location.href = 'doctor.html';
    } else if (existingUser.role === 'student') {
      console.log('🚀 التوجيه إلى صفحة الطالب');
      window.location.href = 'student.html';
    }
  } else {
    console.log('✅ لا توجد جلسة سابقة - البقاء في صفحة تسجيل الدخول');
  }
});

console.log('✅ login.js جاهز');