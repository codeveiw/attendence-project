// 





// التحقق من تسجيل الدخول
const user = checkAuth();
if (!user || user.role !== 'admin') {
  window.location.href = 'login.html';
}

// عرض معلومات المسؤول
document.getElementById('adminName').textContent = user.full_name;

// متغيرات للرسوم البيانية
let usersChart = null;
let attendanceChart = null;

// تحميل الإحصائيات
async function loadStatistics() {
  try {
    const data = await apiRequest('/admin/statistics');

    const statsGrid = document.getElementById('statsGrid');
    statsGrid.innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${data.students}</div>
        <div class="stat-label">👨‍🎓 الطلاب</div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);">
        <div class="stat-value">${data.professors}</div>
        <div class="stat-label">👨‍🏫 الدكاترة</div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #f6ad55 0%, #ed8936 100%);">
        <div class="stat-value">${data.total_sessions}</div>
        <div class="stat-label">📚 إجمالي الجلسات</div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #fc8181 0%, #f56565 100%);">
        <div class="stat-value">${data.active_sessions}</div>
        <div class="stat-label">🔴 الجلسات النشطة</div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #9f7aea 0%, #805ad5 100%);">
        <div class="stat-value">${data.total_attendance}</div>
        <div class="stat-label">✅ سجلات الحضور</div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);">
        <div class="stat-value">${data.today_attendance}</div>
        <div class="stat-label">📅 حضور اليوم</div>
      </div>
    `;
  } catch (error) {
    console.error('Error loading statistics:', error);
  }
}

// التبديل بين التبويبات
// التبديل بين التبويبات
function showAdminTab(tabName, event) {
  document.getElementById('usersTab').classList.add('hidden');
  document.getElementById('sessionsTab').classList.add('hidden');
  document.getElementById('attendanceTab').classList.add('hidden');
  document.getElementById('studentManagementTab').classList.add('hidden');

  // استخدام event الممرر أو البحث عن global event
  const evt = event || window.event;
  const target = evt ? (evt.currentTarget || evt.target) : null;

  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });

  if (target) {
    target.classList.add('active');
  }

  if (tabName === 'users') {
    document.getElementById('usersTab').classList.remove('hidden');
    loadUsers();
  } else if (tabName === 'sessions') {
    document.getElementById('sessionsTab').classList.remove('hidden');
    loadSessions();
  } else if (tabName === 'attendance') {
    document.getElementById('attendanceTab').classList.remove('hidden');
    loadAttendance();
  } else if (tabName === 'student-management') {
    document.getElementById('studentManagementTab').classList.remove('hidden');
  }
}

// تحميل المستخدمين
async function loadUsers() {
  try {
    const role = document.getElementById('roleFilter').value;
    const url = role ? `/admin/users?role=${role}` : '/admin/users';
    const data = await apiRequest(url);

    window.allUsers = data.users;
    displayUsers(data.users);

  } catch (error) {
    console.error('Error loading users:', error);
    alert('خطأ في تحميل المستخدمين');
  }
}

// عرض المستخدمين
function displayUsers(users) {
  const usersList = document.getElementById('usersList');

  if (users.length === 0) {
    usersList.innerHTML = '<p style="text-align: center; color: #718096; padding: 40px;">لا يوجد مستخدمين</p>';
    return;
  }

  usersList.innerHTML = `
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>اسم المستخدم</th>
            <th>الاسم الكامل</th>
            <th>النوع</th>
            <th>تاريخ الإنشاء</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          ${users.map((u, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${u.username}</td>
              <td>${u.full_name}</td>
              <td>
                <span class="badge badge-${u.role}">
                  ${getRoleLabel(u.role)}
                </span>
              </td>
              <td>${formatDate(u.created_at)}</td>
              <td>
                <div style="display: flex; gap: 8px; justify-content: center;">
                  <button onclick='editUser(${JSON.stringify(u)})' 
                          class="btn-icon btn-edit" title="تعديل">
                    ✏️
                  </button>
                  <button onclick="deleteUser(${u.id}, '${u.full_name}')" 
                          class="btn-icon btn-delete" title="حذف">
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// فتح نافذة إضافة مستخدم
function showAddUserModal() {
  document.getElementById('modalTitle').textContent = 'إضافة مستخدم جديد';
  document.getElementById('userForm').reset();
  document.getElementById('userId').value = '';
  document.getElementById('username').disabled = false;
  document.getElementById('password').placeholder = 'كلمة المرور الافتراضية: 123456';
  document.getElementById('userModal').classList.remove('hidden');
}

// فتح نافذة تعديل مستخدم
function editUser(user) {
  document.getElementById('modalTitle').textContent = 'تعديل المستخدم';
  document.getElementById('userId').value = user.id;
  document.getElementById('username').value = user.username;
  document.getElementById('username').disabled = true;
  document.getElementById('fullName').value = user.full_name;
  document.getElementById('role').value = user.role;
  document.getElementById('password').placeholder = 'اتركه فارغاً للإبقاء على القديم';
  document.getElementById('userModal').classList.remove('hidden');
}

// إغلاق النافذة المنبثقة
function closeUserModal() {
  document.getElementById('userModal').classList.add('hidden');
  document.getElementById('username').disabled = false;
}

// حفظ المستخدم
document.getElementById('userForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const userId = document.getElementById('userId').value;
  const username = document.getElementById('username').value;
  const fullName = document.getElementById('fullName').value;
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value;

  try {
    if (userId) {
      await apiRequest(`/admin/users/${userId}`, 'PUT', {
        full_name: fullName,
        password: password || undefined
      });
      alert('✅ تم تحديث المستخدم بنجاح!');
    } else {
      await apiRequest('/admin/users', 'POST', {
        username,
        full_name: fullName,
        password: password || '123456',
        role
      });
      alert('✅ تم إضافة المستخدم بنجاح!');
    }

    closeUserModal();
    loadUsers();
    loadStatistics();
  } catch (error) {
    alert('❌ ' + error.message);
  }
});

// حذف مستخدم
async function deleteUser(id, name) {
  if (!confirm(`هل أنت متأكد من حذف المستخدم "${name}"؟\nسيتم حذف جميع سجلات الحضور المرتبطة به.`)) {
    return;
  }

  try {
    await apiRequest(`/admin/users/${id}`, 'DELETE');
    alert('✅ تم حذف المستخدم بنجاح!');
    loadUsers();
    loadStatistics();
  } catch (error) {
    alert('❌ ' + error.message);
  }
}

// تحميل الجلسات
async function loadSessions() {
  try {
    const data = await apiRequest('/admin/sessions');
    const filter = document.getElementById('sessionFilter')?.value || 'all';

    let sessions = data.sessions;

    if (filter === 'active') {
      sessions = sessions.filter(s => s.is_active && new Date(s.expires_at) > new Date());
    } else if (filter === 'expired') {
      sessions = sessions.filter(s => !s.is_active || new Date(s.expires_at) <= new Date());
    }

    const sessionsList = document.getElementById('sessionsList');

    if (sessions.length === 0) {
      sessionsList.innerHTML = '<p style="text-align: center; color: #718096; padding: 40px;">لا توجد جلسات</p>';
      return;
    }

    sessionsList.innerHTML = `
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>المادة</th>
              <th>الدكتور</th>
              <th>كود الجلسة</th>
              <th>تاريخ الإنشاء</th>
              <th>تاريخ الانتهاء</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            ${sessions.map((s, index) => {
      const isActive = s.is_active && new Date(s.expires_at) > new Date();
      return `
                <tr>
                  <td>${index + 1}</td>
                  <td>${s.subject_name}</td>
                  <td>${s.professor_name}</td>
                  <td><code class="code-text">${s.session_code}</code></td>
                  <td>${formatDate(s.created_at)}</td>
                  <td>${formatDate(s.expires_at)}</td>
                  <td>
                    <span class="badge ${isActive ? 'badge-active' : 'badge-inactive'}">
                      ${isActive ? '🟢 نشطة' : '🔴 منتهية'}
                    </span>
                  </td>
                </tr>
              `;
    }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    console.error('Error loading sessions:', error);
  }
}

// تحميل سجلات الحضور
async function loadAttendance() {
  try {
    const data = await apiRequest('/admin/attendance');

    window.allAttendance = data.records;

    const attendanceList = document.getElementById('attendanceList');

    if (data.records.length === 0) {
      attendanceList.innerHTML = '<p style="text-align: center; color: #718096; padding: 40px;">لا توجد سجلات حضور</p>';
      return;
    }

    attendanceList.innerHTML = `
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>الطالب</th>
              <th>اسم المستخدم</th>
              <th>المادة</th>
              <th>تاريخ تسجيل الحضور</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${data.records.map((r, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${r.student_name}</td>
                <td>${r.student_username}</td>
                <td>${r.subject}</td>
                <td>${formatDate(r.recorded_at)}</td>
                <td>
                  <button onclick="deleteAttendance(${r.id}, '${r.student_name}')" 
                          class="btn-icon btn-delete" title="حذف">
                    🗑️
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    console.error('Error loading attendance:', error);
  }
}

// حذف سجل حضور
async function deleteAttendance(id, studentName) {
  if (!confirm(`هل أنت متأكد من حذف سجل حضور الطالب "${studentName}"؟`)) {
    return;
  }

  try {
    await apiRequest(`/admin/attendance/${id}`, 'DELETE');
    alert('✅ تم حذف سجل الحضور بنجاح!');
    loadAttendance();
    loadStatistics();
  } catch (error) {
    alert('❌ ' + error.message);
  }
}

// === وظائف إدارة الطلاب الجديدة ===

// البحث عن طالب
async function searchStudent() {
  const searchTerm = document.getElementById('studentSearch').value.trim();

  if (!searchTerm) {
    showMessage('studentSearchMessage', '❌ يرجى إدخال اسم المستخدم أو الرقم الجامعي', 'error');
    return;
  }

  try {
    const data = await apiRequest('/admin/users?role=student');
    const student = data.users.find(u =>
      u.username.toLowerCase() === searchTerm.toLowerCase() ||
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!student) {
      showMessage('studentSearchMessage', '❌ لم يتم العثور على الطالب', 'error');
      document.getElementById('studentDetails').classList.add('hidden');
      return;
    }

    // عرض تفاصيل الطالب
    await displayStudentDetails(student);
    showMessage('studentSearchMessage', '✅ تم العثور على الطالب', 'success');

  } catch (error) {
    showMessage('studentSearchMessage', '❌ خطأ في البحث: ' + error.message, 'error');
  }
}

// عرض تفاصيل الطالب
async function displayStudentDetails(student) {
  try {
    // الحصول على سجلات الحضور
    const attendanceData = await apiRequest('/admin/attendance');
    const studentRecords = attendanceData.records.filter(r => r.student_username === student.username);

    // الحصول على الجلسات
    const sessionsData = await apiRequest('/admin/sessions');
    const totalSessions = sessionsData.sessions.length;

    const attendedCount = studentRecords.length;
    const absentCount = totalSessions - attendedCount;
    const absenceRate = totalSessions > 0 ? ((absentCount / totalSessions) * 100).toFixed(2) : 0;

    // تحديد حالة الطالب
    let statusClass = 'badge-active';
    let statusText = '✅ جيد';
    if (absenceRate > 25) {
      statusClass = 'badge-inactive';
      statusText = '⚠️ حرمان';
    } else if (absenceRate > 10) {
      statusClass = 'badge';
      statusText = '⚠️ إنذار';
    }

    // حفظ البيانات للاستخدام لاحقاً
    window.currentStudent = {
      ...student,
      records: studentRecords,
      totalSessions,
      attendedCount,
      absentCount,
      absenceRate
    };

    // عرض التفاصيل
    document.getElementById('studentDetails').innerHTML = `
      <div class="student-info-card">
        <div class="student-header">
          <div class="student-avatar">${student.full_name.charAt(0)}</div>
          <div>
            <h3>${student.full_name}</h3>
            <p style="color: #666;">اسم المستخدم: ${student.username}</p>
            <p style="color: #666;">تاريخ التسجيل: ${formatDate(student.created_at)}</p>
          </div>
        </div>
        
        <div class="stats-mini-grid">
          <div class="stat-mini">
            <div class="stat-mini-value">${totalSessions}</div>
            <div class="stat-mini-label">إجمالي الجلسات</div>
          </div>
          <div class="stat-mini" style="background: #d4edda;">
            <div class="stat-mini-value">${attendedCount}</div>
            <div class="stat-mini-label">الحضور</div>
          </div>
          <div class="stat-mini" style="background: #f8d7da;">
            <div class="stat-mini-value">${absentCount}</div>
            <div class="stat-mini-label">الغياب</div>
          </div>
          <div class="stat-mini" style="background: #fff3cd;">
            <div class="stat-mini-value">${absenceRate}%</div>
            <div class="stat-mini-label">نسبة الغياب</div>
          </div>
        </div>
        
        <div style="text-align: center; margin: 20px 0;">
          <span class="badge ${statusClass}" style="font-size: 16px; padding: 10px 20px;">
            ${statusText}
          </span>
        </div>
        
        <div class="action-buttons">
          <button onclick="showAddAttendanceModal()" class="btn-primary">
            ➕ إضافة حضور
          </button>
          <button onclick="viewStudentRecords()" class="btn-secondary">
            📋 عرض السجلات
          </button>
        </div>
      </div>
    `;

    document.getElementById('studentDetails').classList.remove('hidden');

  } catch (error) {
    console.error('Error displaying student details:', error);
  }
}

// عرض سجلات الطالب
async function viewStudentRecords() {
  if (!window.currentStudent) return;

  const records = window.currentStudent.records;

  if (records.length === 0) {
    document.getElementById('studentRecordsList').innerHTML =
      '<p style="text-align: center; padding: 20px; color: #666;">لا توجد سجلات حضور</p>';
    document.getElementById('studentRecordsModal').classList.remove('hidden');
    return;
  }

  document.getElementById('studentRecordsList').innerHTML = `
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>المادة</th>
            <th>تاريخ الحضور</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          ${records.map((r, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${r.subject}</td>
              <td>${formatDate(r.recorded_at)}</td>
              <td>
                <button onclick="deleteAttendance(${r.id}, '${window.currentStudent.full_name}')" 
                        class="btn-icon btn-delete" title="حذف">
                  🗑️
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('studentRecordsModal').classList.remove('hidden');
}

// إغلاق نافذة السجلات
function closeRecordsModal() {
  document.getElementById('studentRecordsModal').classList.add('hidden');
}

// فتح نافذة إضافة حضور
async function showAddAttendanceModal() {
  if (!window.currentStudent) return;

  try {
    // تحميل الجلسات
    const data = await apiRequest('/admin/sessions');
    const sessions = data.sessions;

    const select = document.getElementById('sessionSelect');
    select.innerHTML = '<option value="">اختر الجلسة...</option>';

    sessions.forEach(s => {
      const option = document.createElement('option');
      option.value = s.id;
      option.textContent = `${s.subject_name} - ${s.professor_name} - ${formatDate(s.created_at)}`;
      select.appendChild(option);
    });

    document.getElementById('addAttendanceModal').classList.remove('hidden');
  } catch (error) {
    alert('❌ خطأ في تحميل الجلسات: ' + error.message);
  }
}

// إغلاق نافذة إضافة حضور
function closeAddAttendanceModal() {
  document.getElementById('addAttendanceModal').classList.add('hidden');
  document.getElementById('addAttendanceForm').reset();
}

// حفظ الحضور الجديد
document.getElementById('addAttendanceForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!window.currentStudent) return;

  const sessionId = document.getElementById('sessionSelect').value;

  if (!sessionId) {
    alert('❌ يرجى اختيار جلسة');
    return;
  }

  try {
    await apiRequest('/admin/attendance', 'POST', {
      student_id: window.currentStudent.id,
      session_id: parseInt(sessionId)
    });

    alert('✅ تم إضافة الحضور بنجاح!');
    closeAddAttendanceModal();

    // إعادة تحميل تفاصيل الطالب
    await displayStudentDetails(window.currentStudent);
    loadStatistics();

  } catch (error) {
    alert('❌ ' + error.message);
  }
});

// دوال مساعدة
function getRoleLabel(role) {
  const labels = {
    'student': '👨‍🎓 طالب',
    'professor': '👨‍🏫 دكتور',
    'admin': '👑 مسؤول'
  };
  return labels[role] || role;
}

function getRoleIcon(role) {
  const icons = {
    'student': '👨‍🎓',
    'professor': '👨‍🏫',
    'admin': '👑'
  };
  return icons[role] || '👤';
}

// فتح modal إضافة مستخدم
function showAddUserModal() {
  console.log('📝 فتح نموذج إضافة مستخدم');
  document.getElementById('addUserModal').classList.remove('hidden');
  document.getElementById('addUserForm').reset();
  document.getElementById('addUserMessage').innerHTML = '';
}

// إغلاق modal إضافة مستخدم
function closeAddUserModal() {
  console.log('🔐 إغلاق نموذج إضافة مستخدم');
  document.getElementById('addUserModal').classList.add('hidden');
}

// معالج إرسال نموذج إضافة مستخدم
document.addEventListener('DOMContentLoaded', function() {
  const addUserForm = document.getElementById('addUserForm');
  if (addUserForm) {
    addUserForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log('📤 إرسال نموذج إضافة مستخدم');

      const username = document.getElementById('newUsername').value.trim();
      const full_name = document.getElementById('newFullName').value.trim();
      const password = document.getElementById('newPassword').value.trim();
      const role = document.getElementById('newUserRole').value;

      if (!username || !full_name || !password || !role) {
        showMessage('addUserMessage', '❌ يرجى ملء جميع الحقول', 'error');
        return;
      }

      try {
        console.log('📡 إرسال الطلب للخادم...');
        const response = await apiRequest('/admin/users', 'POST', {
          username: username,
          full_name: full_name,
          password: password,
          role: role
        });

        console.log('✅ تم إضافة المستخدم:', response);
        showMessage('addUserMessage', '✅ تم إضافة المستخدم بنجاح!', 'success');

        // إعادة تحميل قائمة المستخدمين بعد ثانية
        setTimeout(() => {
          closeAddUserModal();
          loadUsers();
        }, 1500);

      } catch (error) {
        console.error('❌ خطأ:', error);
        showMessage('addUserMessage', '❌ ' + (error.message || 'فشل إضافة المستخدم'), 'error');
      }
    });
  }
});

// تحميل البيانات عند فتح الصفحة
loadStatistics();
loadUsers();