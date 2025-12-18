// ملف JavaScript خاص بصفحة الطالب

console.log('✅ تم تحميل student.js');

// متغيرات عامة (بدون let لأن shared.js عرّفها)
let studentUser = null;
let studentScanner = null;
let studentProcessing = false; // debounce flag for scan handling

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
  console.log('📷 بدء الماسح الضوئي...');

  if (studentScanner) {
    console.log('⚠️ الماسح يعمل بالفعل، إيقافه أولاً');
    await stopScanner();
  }

  studentScanner = new Html5Qrcode("reader");

  try {
    // Prefer explicit back/rear camera when available (better on phones)
    let cameraId = null;
    try {
      const cams = await Html5Qrcode.getCameras();
      if (cams && cams.length) {
        // try to find a back/rear camera by label
        cameraId = cams[0].id;
        for (const c of cams) {
          if (/back|rear|environment/i.test(c.label)) { cameraId = c.id; break; }
        }
        console.log('Available cameras:', cams.map(c=>c.label || c.id));
      }
    } catch (e) {
      console.warn('getCameras failed, falling back to facingMode environment', e);
    }

    const cameraArg = cameraId ? cameraId : { facingMode: "environment" };

    await studentScanner.start(
      cameraArg,
      {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      },
      async (decodedText) => {
        console.log('✅ تم مسح QR Code:', decodedText);
        if (studentProcessing) return;
        studentProcessing = true;

        // تسجيل الحضور: نحاول الحصول على موقع دقيق لكن إن فشلنا نكمل بدون الموقع
        try {
          let lat = null, lng = null, accuracy = null;
          try {
            const best = await getAccuratePosition({samples: 3, perTimeout: 8000, desiredAccuracy: 30});
            lat = best.latitude;
            lng = best.longitude;
            accuracy = best.accuracy;
          } catch (geoErr) {
            // لا نقطع العملية إن رفض المستخدم الموقع أو حدث خطأ؛ نتابع بدون موقع
            console.warn('⚠️ تعذر الحصول على الموقع، سيتم متابعة التسجيل بدون إحداثيات:', geoErr && geoErr.message ? geoErr.message : geoErr);
            showMessage('scanMessage', '⚠️ لم يتم تحديد الموقع — سيتم محاولة التسجيل بدون إحداثيات', 'error');
          }

          // support combined QR format: session_code|session_token
          let session_code = decodedText;
          let session_token = null;
          if (decodedText && decodedText.includes('|')) {
            const parts = decodedText.split('|');
            session_code = parts[0];
            session_token = parts[1] || null;
          }

          const payload = { session_code: session_code };
          if (lat !== null) payload.lat = lat;
          if (lng !== null) payload.lng = lng;
          if (accuracy !== null) payload.accuracy = accuracy;
          if (session_token) payload.session_token = session_token;

          const data = await apiRequest('/attendance/record', 'POST', payload);

          console.log('✅ تم تسجيل الحضور:', data);
          showMessage('scanMessage', data.message, 'success');

          // انتظار قصير قبل قبول عملية مسح أخرى
          setTimeout(() => { studentProcessing = false; }, 1500);

        } catch (error) {
          console.error('❌ خطأ في تسجيل الحضور:', error);
          // إذا كانت رسالة الخطأ تخص انتهاك الربط بالجهاز، أعرضها كما هي
          showMessage('scanMessage', error.message || String(error), 'error');
          // اعادة تمكين المسح بعد مهلة
          setTimeout(() => { studentProcessing = false; }, 3000);
        }
      },
      (errorMessage) => {
        // frequent scanning errors (no code in frame) — show concise message but keep camera
        // console.debug('QR scan error:', errorMessage);
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
    console.log('📡 الحصول على موقع الجهاز... (أخذ عينات لتحسين الدقة)');
    const best = await getAccuratePosition({samples: 3, perTimeout: 8000, desiredAccuracy: 30});
    const lat = best.latitude;
    const lng = best.longitude;
    const accuracy = best.accuracy;

    console.log('📡 إرسال الطلب للخادم مع الموقع...');
    // support manual entry of session_code or session_code|session_token
    let session_code = sessionCode;
    let session_token = null;
    if (sessionCode.includes('|')) {
      const parts = sessionCode.split('|');
      session_code = parts[0];
      session_token = parts[1] || null;
    }
    const payload = { session_code: session_code, lat: lat, lng: lng, accuracy: accuracy };
    if (session_token) payload.session_token = session_token;
    const data = await apiRequest('/attendance/record', 'POST', payload);

    console.log('✅ تم تسجيل الحضور بنجاح:', data);
    showMessage('manualCodeMessage', data.message, 'success');
    document.getElementById('manualSessionCode').value = '';

    // تحديث سجل الحضور بعد ثانية
    setTimeout(() => loadAttendanceRecords(), 1000);

  } catch (error) {
    console.error('❌ خطأ في تسجيل الحضور:', error);
    if (error && error.code === 1) {
      showMessage('manualCodeMessage', '❌ يلزم السماح بمشاركة الموقع لتمييز موقع الحضور', 'error');
    } else {
      showMessage('manualCodeMessage', error.message || String(error), 'error');
    }
  }
}

// مساعدة للحصول على الموقع كـ Promise
function getCurrentPositionPromise(timeout = 10000) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('المتصفح لا يدعم الموقع الجغرافي'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, (err) => reject(err), { enableHighAccuracy: true, timeout: timeout, maximumAge: 0 });
  });
}

// طلب عدة عينات من الموقع ثم إرجاع متوسط مرجح بناءً على دقة كل عينة
async function getAccuratePosition(opts = {}) {
  const samples = opts.samples || 3;
  const perTimeout = opts.perTimeout || 8000;
  const desiredAccuracy = opts.desiredAccuracy || 25; // meters
  const maxAttempts = opts.maxAttempts || (samples * 2);

  const readings = [];

  for (let attempt = 0; attempt < maxAttempts && readings.length < samples; attempt++) {
    try {
      const pos = await getCurrentPositionPromise(perTimeout);
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const acc = pos.coords.accuracy || 9999;
      readings.push({ lat, lng, acc });
      // إذا كانت هذه العينة جيدة بما يكفي وأن لدينا عدد كافٍ من العينات، اكسر
      if (acc <= desiredAccuracy && readings.length >= Math.min(2, samples)) break;
    } catch (err) {
      // تجنب الكسر المباشر، حاول مرة أخرى حتى نصل لعدد محاولات
      console.warn('مشكلة في الحصول على عينة الموقع:', err && err.message ? err.message : err);
      // إذا كانت صلاحية الرفض (المستخدم رفض) أعد رمي الخطأ
      if (err && err.code === 1) throw err;
    }
  }

  if (readings.length === 0) throw new Error('تعذر الحصول على أي بيانات موقع. الرجاء السماح بالوصول للموقع والمحاولة مرة أخرى.');

  // سنحسب متوسطًا مرجحًا بالاعتماد على 1/accuracy كوزن
  let weightSum = 0;
  let latSum = 0;
  let lngSum = 0;
  let accSum = 0;

  for (const r of readings) {
    const w = r.acc > 0 ? 1 / r.acc : 1;
    weightSum += w;
    latSum += r.lat * w;
    lngSum += r.lng * w;
    accSum += r.acc;
  }

  const avgLat = latSum / weightSum;
  const avgLng = lngSum / weightSum;
  const avgAcc = accSum / readings.length;

  return { latitude: avgLat, longitude: avgLng, accuracy: Math.max(5, Math.round(avgAcc)) };
}

console.log('✅ student.js جاهز');

