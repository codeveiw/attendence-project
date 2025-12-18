// ملف JavaScript خاص بصفحة الدكتور

console.log('✅ تم تحميل doctor.js');

let doctorUser = null;
let doctorScanner = null;

// تهيئة صفحة الدكتور
document.addEventListener('DOMContentLoaded', function () {
  console.log('📄 تم تحميل DOM');

  // التحقق من الصلاحيات أولاً
  doctorUser = checkAuth();
  console.log('👤 المستخدم:', doctorUser);

  if (!doctorUser || doctorUser.role !== 'professor') {
    console.warn('⚠️ لا توجد صلاحيات دكتور');
    window.location.href = 'login.html';
    return;
  }

  // عرض معلومات المستخدم
  const profNameEl = document.getElementById("profName");
  const profAvatarEl = document.getElementById("profAvatar");

  if (profNameEl) {
    profNameEl.textContent = doctorUser.full_name;
    console.log('✅ تم عرض الاسم:', doctorUser.full_name);
  }

  if (profAvatarEl) {
    profAvatarEl.textContent = getInitials(doctorUser.full_name);
  }
});

// التبديل بين تبويبات الدكتور
// التبديل بين تبويبات الدكتور
function showProfTab(tab, event) {
  console.log('🔄 التبديل للتبويب:', tab);

  // استخدام event الممرر أو البحث عن global event
  const evt = event || window.event;
  const target = evt ? (evt.currentTarget || evt.target) : null;

  document.querySelectorAll("#professorDashboard .tab").forEach((t) => t.classList.remove("active"));

  if (target) {
    target.classList.add("active");
  }

  document.getElementById("createSessionTab").classList.add("hidden");
  document.getElementById("activeSessionsTab").classList.add("hidden");
  document.getElementById("scanTab").classList.add("hidden");

  if (tab === "create") {
    document.getElementById("createSessionTab").classList.remove("hidden");
  } else if (tab === "active") {
    document.getElementById("activeSessionsTab").classList.remove("hidden");
    loadActiveSessions();
  } else if (tab === "scan") {
    document.getElementById("scanTab").classList.remove("hidden");
    loadActiveSessionsForScan();
  }
}

// إنشاء جلسة جديدة
document.getElementById("createSessionForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    console.log('📡 إنشاء جلسة جديدة...');

    const data = await apiRequest('/sessions/create', 'POST', {
      subject_name: document.getElementById("subjectName").value,
      duration: parseInt(document.getElementById("duration").value)
    });

    console.log('✅ تم إنشاء الجلسة:', data);

    // مسح QR Code القديم
    document.getElementById("qrcode").innerHTML = "";

    // إنشاء QR Code جديد
    new QRCode(document.getElementById("qrcode"), {
      text: data.session_code,
      width: 256,
      height: 256,
      colorDark: "#667eea",
      colorLight: "#ffffff",
    });

    const sessionCode = data.session_code;
    document.getElementById("displaySessionCode").textContent = sessionCode;
    document.getElementById("displaySessionCodeText").textContent = sessionCode;
    document.getElementById("qrDisplay").classList.remove("hidden");

    // تنبيه نجاح
    alert("✅ تم إنشاء الجلسة بنجاح!");
  } catch (error) {
    console.error('❌ خطأ في إنشاء الجلسة:', error);
    alert("❌ حدث خطأ: " + error.message);
  }
});

// نسخ كود الجلسة إلى الحافظة
function copySessionCode() {
  const codeElement = document.getElementById('displaySessionCode');
  const code = codeElement.textContent;

  // استخدام Clipboard API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(() => {
      // تغيير النص مؤقتاً للإشارة إلى النسخ
      const button = event.target;
      const originalText = button.textContent;
      button.textContent = '✅ تم النسخ!';
      button.style.background = '#48bb78';

      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '#667eea';
      }, 2000);
    }).catch(err => {
      console.error('فشل النسخ:', err);
      fallbackCopyTextToClipboard(code);
    });
  } else {
    // استخدام الطريقة القديمة للمتصفحات القديمة
    fallbackCopyTextToClipboard(code);
  }
}

// طريقة بديلة للنسخ
function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.width = '2em';
  textArea.style.height = '2em';
  textArea.style.padding = '0';
  textArea.style.border = 'none';
  textArea.style.outline = 'none';
  textArea.style.boxShadow = 'none';
  textArea.style.background = 'transparent';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    if (successful) {
      alert('✅ تم نسخ الكود بنجاح!');
    } else {
      alert('❌ فشل نسخ الكود. جرب النسخ يدوياً.');
    }
  } catch (err) {
    console.error('فشل النسخ:', err);
    alert('❌ فشل نسخ الكود. جرب النسخ يدوياً.');
  }

  document.body.removeChild(textArea);
}

// تحميل الجلسات النشطة
async function loadActiveSessions() {
  console.log('📚 تحميل الجلسات النشطة...');

  try {
    const data = await apiRequest('/sessions/active');
    console.log('📥 الجلسات:', data);

    const list = document.getElementById("sessionsList");

    if (!data.sessions || data.sessions.length === 0) {
      list.innerHTML = '<p style="text-align: center; color: #666; padding: 30px;">📭 لا توجد جلسات نشطة حالياً</p>';
      return;
    }

    // create grid container
    list.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'sessions-grid';

    data.sessions.forEach((s) => {
      const card = document.createElement('div');
      card.className = 'session-card';

      // top row: subject + status
      const top = document.createElement('div');
      top.className = 'session-top';
      const subj = document.createElement('div');
      subj.className = 'session-subject';
      subj.textContent = s.subject_name;
      const statusWrap = document.createElement('div');
      const statusBadge = document.createElement('span');
      statusBadge.className = 'badge-active';
      statusBadge.textContent = 'نشطة';
      statusWrap.appendChild(statusBadge);
      top.appendChild(subj);
      top.appendChild(statusWrap);

      // body with meta
      const body = document.createElement('div');
      body.className = 'session-body';
      const meta = document.createElement('div');
      meta.className = 'session-meta';
      meta.innerHTML = `📅 تم الإنشاء: ${formatDate(s.created_at)}<br>⏰ تنتهي في: ${formatDate(s.expires_at)}<br><strong>${formatTimeRemaining(s.expires_at)}</strong>`;

      const codeRow = document.createElement('div');
      codeRow.className = 'session-code-row';
      const codeEl = document.createElement('span');
      codeEl.className = 'session-code';
      codeEl.textContent = s.session_code;
      codeRow.appendChild(codeEl);

      body.appendChild(meta);
      body.appendChild(codeRow);

      // qr + actions
      const footer = document.createElement('div');
      footer.style.display = 'flex';
      footer.style.gap = '12px';
      footer.style.alignItems = 'center';

      const qrHolder = document.createElement('div');
      qrHolder.style.minWidth = '160px';
      qrHolder.style.minHeight = '160px';
      qrHolder.id = `qr-${s.id}`;

      const actions = document.createElement('div');
      actions.className = 'session-actions';

      const copyBtn = document.createElement('button');
      copyBtn.className = 'btn btn-secondary';
      copyBtn.textContent = '📋 نسخ الكود';
      copyBtn.addEventListener('click', () => copySessionCodeFromCard(s.session_code));

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-icon btn-delete';
      deleteBtn.title = 'حذف الجلسة';
      deleteBtn.innerHTML = '🗑️';
      deleteBtn.addEventListener('click', async () => {
        if (!confirm('هل أنت متأكد من حذف هذه الجلسة؟ سيتم حذف سجلات الحضور المتعلقة بها.')) return;
        try {
          await deleteSession(s.id);
          showMessage('sessionsList', '✅ تم حذف الجلسة بنجاح', 'success');
          loadActiveSessions();
        } catch (err) {
          console.error('خطأ عند حذف الجلسة:', err);
          showMessage('sessionsList', '❌ خطأ عند حذف الجلسة: ' + err.message, 'error');
        }
      });

      actions.appendChild(copyBtn);
      actions.appendChild(deleteBtn);

      footer.appendChild(qrHolder);
      footer.appendChild(actions);

      card.appendChild(top);
      card.appendChild(body);
      card.appendChild(footer);

      grid.appendChild(card);

      // generate QR
      try {
        // clear any previous
        qrHolder.innerHTML = '';
        new QRCode(qrHolder, {
          text: s.session_code,
          width: 160,
          height: 160,
          colorDark: "#111827",
          colorLight: "#ffffff",
        });
      } catch (e) {
        console.warn('QR generation failed for', s.session_code, e);
      }
    });

    list.appendChild(grid);

    console.log('✅ تم تحميل الجلسات');
  } catch (error) {
    console.error("❌ خطأ في تحميل الجلسات:", error);
    alert("❌ فشل تحميل الجلسات: " + error.message);
  }
}


// حذف جلسة (نداء إلى API)
async function deleteSession(sessionId) {
  return apiRequest(`/sessions/${sessionId}`, 'DELETE');
}

function copySessionCodeFromCard(code) {
  if (!code) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(() => {
      alert('✅ تم نسخ كود الجلسة');
    }).catch(() => {
      alert('❌ فشل النسخ');
    });
  } else {
    fallbackCopyTextToClipboard(code);
  }
}

// تحميل الجلسات النشطة للاختيار من بينها في مسح QR
async function loadActiveSessionsForScan() {
  console.log('📋 تحميل الجلسات للمسح...');

  try {
    const data = await apiRequest('/sessions/active');
    const select = document.getElementById("activeSessionSelect");

    // مسح الخيارات القديمة
    select.innerHTML = '<option value="">اختر جلسة...</option>';

    if (data.sessions.length === 0) {
      select.innerHTML += '<option value="" disabled>لا توجد جلسات نشطة</option>';
      return;
    }

    // إضافة الجلسات النشطة
    data.sessions.forEach((session) => {
      const option = document.createElement("option");
      option.value = session.session_code;
      option.textContent = `${session.subject_name} - ${session.session_code}`;
      select.appendChild(option);
    });

    console.log('✅ تم تحميل الجلسات للمسح');
  } catch (error) {
    console.error("❌ خطأ في تحميل الجلسات:", error);
    alert("❌ فشل تحميل الجلسات: " + error.message);
  }
}

// بدء ماسح QR للدكتور
function startScanner() {
  const selectedSession = document.getElementById("activeSessionSelect").value;

  if (!selectedSession) {
    showMessage("scanMessage", "❌ يرجى اختيار جلسة نشطة أولاً", "error");
    return;
  }

  if (doctorScanner) {
    console.log("الماسح يعمل بالفعل");
    return;
  }

  doctorScanner = new Html5Qrcode("reader");

  doctorScanner.start(
    { facingMode: "environment" },
    {
      fps: 10,
      qrbox: { width: 250, height: 250 },
    },
    async (decodedText) => {
      console.log("تم مسح الكود:", decodedText);
      stopScanner();

      try {
        // محاولة تسجيل حضور للطالب باستخدام QR Code الخاص به
        const data = await apiRequest('/professor/record-attendance', 'POST', {
          student_code: decodedText,
          session_code: selectedSession
        });

        showMessage("scanMessage", `✅ ${data.message}`, "success");

        setTimeout(() => {
          document.getElementById("scanMessage").innerHTML = "";
          startScanner();
        }, 3000);
      } catch (error) {
        console.error('❌ خطأ في تسجيل الحضور:', error);
        showMessage("scanMessage", "❌ " + error.message, "error");

        setTimeout(() => {
          document.getElementById("scanMessage").innerHTML = "";
          startScanner();
        }, 3000);
      }
    },
    (errorMessage) => {
      // يتم تجاهل أخطاء المسح العادية
    }
  ).catch((err) => {
    console.error("خطأ في تشغيل الكاميرا:", err);
    showMessage("scanMessage", "❌ فشل تشغيل الكاميرا. تأكد من السماح بالوصول للكاميرا.", "error");
  });
}

// إيقاف الماسح
function stopScanner() {
  if (doctorScanner) {
    doctorScanner.stop().then(() => {
      doctorScanner = null;
      console.log('✅ تم إيقاف الماسح');
    }).catch(err => {
      console.error('❌ خطأ في إيقاف الماسح:', err);
    });
  }
}

console.log('✅ doctor.js جاهز');