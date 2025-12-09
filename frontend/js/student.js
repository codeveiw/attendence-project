// ملف JavaScript خاص بصفحة الطالب

console.log('✅ تم تحميل student.js');

// متغيرات عامة (بدون let لأن shared.js عرّفها)
let studentUser = null;
let studentScanner = null;

// انتظر حتى يتم تحميل الصفحة
document.addEventListener('DOMContentLoaded', function () {
  console.log('📄 تم تحميل DOM للطالب');

  studentUser = checkAuth();
  console.log('👤 المستخدم:', studentUser);

  if (!studentUser || studentUser.role !== 'student') {
    console.warn('⚠️ لا توجد صلاحيات طالب، إعادة التوجيه لـ login');
    window.location.href = 'login.html';
    return;
  }

  // عرض معلومات الطالب
  const studentNameEl = document.getElementById('studentName');
  const studentAvatarEl = document.getElementById('studentAvatar');

  if (studentNameEl) {
    studentNameEl.textContent = studentUser.full_name;
    console.log('✅ تم عرض الاسم:', studentUser.full_name);
  }

  if (studentAvatarEl) {
    studentAvatarEl.textContent = getInitials(studentUser.full_name);
  }

  console.log('✅ تم عرض بيانات الطالب');
});

// التبديل بين التبويبات
// التبديل بين تبويبات الطالب
function showStudentTab(tabName, event) {
  console.log('🔄 التبديل إلى تبويب:', tabName);

  try {
    // استخدام event الممرر أو البحث عن global event
    const evt = event || window.event;
    const target = evt ? (evt.currentTarget || evt.target) : null;

    // إخفاء جميع التبويبات
    document.getElementById('scanTab').classList.add('hidden');
    document.getElementById('recordsTab').classList.add('hidden');
    document.getElementById('myqrTab').classList.add('hidden');

    // إزالة الحالة النشطة من جميع الأزرار
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
    });

    // تفعيل الزر المضغوط
    if (target) {
      target.classList.add('active');
    }

    // عرض التبويب المحدد
    if (tabName === 'scan') {
      document.getElementById('scanTab').classList.remove('hidden');
      console.log('✅ تم عرض تبويب المسح');
    } else if (tabName === 'records') {
      document.getElementById('recordsTab').classList.remove('hidden');
      console.log('✅ تم عرض تبويب السجل');
      loadAttendanceRecords();
    } else if (tabName === 'myqr') {
      document.getElementById('myqrTab').classList.remove('hidden');
      console.log('✅ تم عرض تبويب QR الخاص بي');
      displayMyQRCode();
    }
  } catch (error) {
    console.error('❌ خطأ في التبديل بين التبويبات:', error);
  }
}

// تشغيل الماسح الضوئي
async function startScanner() {
  console.log('📷 تشغيل الماسح الضوئي...');

  if (studentScanner) {
    console.log('⚠️ الماسح يعمل بالفعل، إيقافه أولاً');
    await stopScanner();
  }

  studentScanner = new Html5Qrcode("reader");

  try {
    await studentScanner.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      },
      async (decodedText) => {
        console.log('✅ تم مسح QR Code:', decodedText);
        // إيقاف الماسح مؤقتاً
        await stopScanner();

        // تسجيل الحضور
        try {
          const data = await apiRequest('/attendance/record', 'POST', {
            session_code: decodedText
          });

          console.log('✅ تم تسجيل الحضور:', data);
          showMessage('scanMessage', data.message, 'success');

          // إعادة تشغيل الماسح بعد 3 ثوانٍ
          setTimeout(() => startScanner(), 3000);

        } catch (error) {
          console.error('❌ خطأ في تسجيل الحضور:', error);
          showMessage('scanMessage', error.message, 'error');
          setTimeout(() => startScanner(), 3000);
        }
      }
    );

    console.log('✅ تم تشغيل الماسح');
    showMessage('scanMessage', '📷 الماسح الضوئي يعمل الآن... قم بمسح QR Code للجلسة', 'success');

  } catch (error) {
    console.error('Scanner error:', error);
    showMessage('scanMessage', '❌ فشل تشغيل الماسح الضوئي. تأكد من السماح بالوصول للكاميرا', 'error');
  }
}

// إيقاف الماسح الضوئي
async function stopScanner() {
  if (studentScanner) {
    try {
      await studentScanner.stop();
      studentScanner = null;
      showMessage('scanMessage', 'تم إيقاف الماسح الضوئي', 'success');
      console.log('✅ تم إيقاف الماسح');
    } catch (error) {
      console.error('Error stopping scanner:', error);
    }
  }
}

// تحميل سجل الحضور
async function loadAttendanceRecords() {
  console.log('📊 تحميل سجل الحضور...');

  try {
    const data = await apiRequest('/attendance/my-records');
    console.log('📥 البيانات المستلمة:', data);

    // عرض الإحصائيات
    const stats = data.statistics;
    const statsGrid = document.getElementById('statsGrid');

    if (statsGrid) {
      statsGrid.innerHTML = `
        <div class="stat-card">
          <div class="stat-value">${stats.total_sessions}</div>
          <div class="stat-label">إجمالي الجلسات</div>
        </div>
        <div class="stat-card" style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);">
          <div class="stat-value">${stats.attended}</div>
          <div class="stat-label">حضرت</div>
        </div>
        <div class="stat-card" style="background: linear-gradient(135deg, #fc8181 0%, #f56565 100%);">
          <div class="stat-value">${stats.absent}</div>
          <div class="stat-label">غبت</div>
        </div>
        <div class="stat-card" style="background: linear-gradient(135deg, #f6ad55 0%, #ed8936 100%);">
          <div class="stat-value">${stats.absence_rate}%</div>
          <div class="stat-label">نسبة الغياب</div>
        </div>
      `;
    }

    // عرض تحذير إذا لزم الأمر
    const warningBox = document.getElementById('warningBox');
    if (warningBox) {
      if (stats.warning_level === 'حرمان') {
        warningBox.innerHTML = `
          <div class="warning-critical">
            ⚠️ تحذير: نسبة غيابك ${stats.absence_rate}% - أنت معرض للحرمان من المادة!
          </div>
        `;
        warningBox.style.display = 'block';
      } else if (stats.warning_level === 'إنذار') {
        warningBox.innerHTML = `
          <div class="warning-alert">
            ⚠️ تنبيه: نسبة غيابك ${stats.absence_rate}% - احرص على الحضور!
          </div>
        `;
        warningBox.style.display = 'block';
      } else {
        warningBox.style.display = 'none';
      }
    }

    // عرض السجلات
    const recordsDiv = document.getElementById('attendanceRecords');

    if (recordsDiv) {
      if (data.records.length === 0) {
        recordsDiv.innerHTML = '<p style="text-align: center; color: #718096;">لا توجد سجلات حضور بعد</p>';
      } else {
        recordsDiv.innerHTML = data.records.map(record => `
          <div class="record-card">
            <div>
              <div class="record-subject">📚 ${record.subject}</div>
              <div class="record-date">${formatDate(record.recorded_at)}</div>
            </div>
            <div class="record-status">✅ حاضر</div>
          </div>
        `).join('');
      }
    }

    console.log('✅ تم تحميل سجل الحضور بنجاح');

  } catch (error) {
    console.error('❌ خطأ في تحميل سجل الحضور:', error);
    showMessage('scanMessage', error.message, 'error');
  }
}

// عرض QR Code الخاص بالطالب
function displayMyQRCode() {
  console.log('🔲 عرض QR Code الخاص بالطالب...');

  const qrCodeDiv = document.getElementById('myQrcode');

  if (!qrCodeDiv) {
    console.error('❌ لم يتم العثور على عنصر myQrcode');
    return;
  }

  // مسح QR Code القديم
  qrCodeDiv.innerHTML = '';

  // كود الطالب
  const studentCode = `STUDENT_${studentUser.id}`;

  // إنشاء QR Code
  new QRCode(qrCodeDiv, {
    text: studentCode,
    width: 256,
    height: 256,
    colorDark: '#667eea',
    colorLight: '#ffffff'
  });

  // عرض كود الطالب
  const codeEl = document.getElementById('myStudentCode');
  if (codeEl) {
    codeEl.textContent = studentCode;
  }

  console.log('✅ تم عرض QR Code');
}

// تسجيل الحضور بإدخال يدوي لكود الجلسة
async function submitManualCode() {
  console.log('📝 محاولة تسجيل حضور بالكود اليدوي');

  const sessionCode = document.getElementById('manualSessionCode').value.trim();

  console.log('📝 كود الجلسة المدخل:', sessionCode);

  if (!sessionCode) {
    console.warn('⚠️ كود الجلسة فارغ');
    showMessage('manualCodeMessage', '❌ يرجى إدخال كود الجلسة', 'error');
    return;
  }

  try {
    console.log('📡 إرسال الطلب للخادم...');
    const data = await apiRequest('/attendance/record', 'POST', {
      session_code: sessionCode
    });

    console.log('✅ تم تسجيل الحضور بنجاح:', data);
    showMessage('manualCodeMessage', data.message, 'success');
    document.getElementById('manualSessionCode').value = '';

    // تحديث سجل الحضور بعد ثانية
    setTimeout(() => loadAttendanceRecords(), 1000);

  } catch (error) {
    console.error('❌ خطأ في تسجيل الحضور:', error);
    showMessage('manualCodeMessage', error.message, 'error');
  }
}

console.log('✅ student.js جاهز');