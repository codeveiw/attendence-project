from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import math
import jwt
import datetime
import secrets
import hashlib
from functools import wraps


app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)
app.config['SECRET_KEY'] = 'your-secret-key-change-in-production'


# إنشاء قاعدة البيانات
def init_db():
    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()
    
    # جدول المستخدمين (طلاب ودكاترة وأدمن)
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    
    # جدول الجلسات
    c.execute('''CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_code TEXT UNIQUE NOT NULL,
        professor_id INTEGER NOT NULL,
        subject_name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        is_active INTEGER DEFAULT 1,
        FOREIGN KEY (professor_id) REFERENCES users(id)
    )''')
    
    # جدول الحضور
    c.execute('''CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        session_id INTEGER NOT NULL,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id),
        FOREIGN KEY (session_id) REFERENCES sessions(id),
        UNIQUE(student_id, session_id)
    )''')

    # جدول ربط الجهاز بمستخدم (Device binding)
    c.execute('''CREATE TABLE IF NOT EXISTS device_bindings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )''')

    # جدول أجهزة الأدمن الموثوقة
    c.execute('''CREATE TABLE IF NOT EXISTS admin_devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )''')

    # جدول الأجهزة الموثوقة (تسمح لأي حساب بالدخول من هذا الجهاز)
    c.execute('''CREATE TABLE IF NOT EXISTS trusted_devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT UNIQUE NOT NULL,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')

    # جدول الجيوفينس (قواعد المساحة المسموحة)
    c.execute('''CREATE TABLE IF NOT EXISTS geofence (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        radius_m INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    # Add optional columns for rectangle geofence support
    try:
        c.execute("ALTER TABLE geofence ADD COLUMN shape TEXT DEFAULT 'circle'")
    except Exception:
        pass
    try:
        c.execute("ALTER TABLE geofence ADD COLUMN width_m INTEGER")
    except Exception:
        pass
    try:
        c.execute("ALTER TABLE geofence ADD COLUMN height_m INTEGER")
    except Exception:
        pass
    
    # إنشاء حساب Admin الافتراضي
    admin_pass = hashlib.sha256('admin123'.encode()).hexdigest()
    try:
        c.execute("INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)",
                 ('admin', admin_pass, 'المسؤول', 'admin'))
        print("✅ تم إنشاء حساب Admin: admin / admin123")
    except:
        pass
    
    conn.commit()
    conn.close()

init_db()

# Decorator للتحقق من JWT
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token مفقود'}), 401
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = data
        except:
            return jsonify({'error': 'Token غير صالح'}), 401
        return f(current_user, *args, **kwargs)
    return decorated

# Decorator للتحقق من صلاحيات Admin
def admin_required(f):
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        # Allow if token role is admin
        if current_user.get('role') == 'admin':
            return f(current_user, *args, **kwargs)

        # Otherwise check if request comes from a trusted admin device
        device_id = request.headers.get('X-Device-Id') or request.json and request.json.get('device_id')
        if device_id:
            try:
                conn = sqlite3.connect('attendance.db')
                c = conn.cursor()
                c.execute('SELECT user_id FROM admin_devices WHERE device_id=?', (device_id,))
                row = c.fetchone()
                conn.close()
                if row:
                    return f(current_user, *args, **kwargs)
            except Exception:
                # if DB error, deny access
                return jsonify({'error': 'تحتاج صلاحيات مسؤول'}), 403

        return jsonify({'error': 'تحتاج صلاحيات مسؤول'}), 403
    return decorated

# Health Check
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'API is running'}), 200

# تسجيل الدخول
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    device_id = data.get('device_id')
    user_lat = data.get('lat')
    user_lng = data.get('lng')
    
    if not username or not password:
        return jsonify({'error': 'اسم المستخدم وكلمة المرور مطلوبة'}), 400
    
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    
    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()

    c.execute("SELECT id, username, full_name, role FROM users WHERE username=? AND password=?",
             (username, password_hash))
    user = c.fetchone()

    if not user:
        conn.close()
        return jsonify({'error': 'اسم المستخدم أو كلمة المرور غير صحيحة'}), 401

    # (geofence/device-location feature disabled) -- do not record device locations here

    # Geofence enforcement disabled (login allowed regardless of geofence)

    # If device_id provided, enforce device binding (unless device is trusted)
    if device_id:
        try:
            c.execute("SELECT id FROM trusted_devices WHERE device_id=?", (device_id,))
            trusted = c.fetchone()

            if not trusted:
                # check existing binding
                c.execute("SELECT user_id FROM device_bindings WHERE device_id=?", (device_id,))
                bound = c.fetchone()
                if bound:
                    bound_user_id = bound[0]
                    if bound_user_id != user[0]:
                        # device already bound to another user - deny login
                        conn.close()
                        return jsonify({'error': 'هذا الجهاز مرتبط بحساب آخر. اطلب من المسؤول فك الربط إذا لزم الأمر.'}), 403
                else:
                    # bind device to this user
                    try:
                        c.execute("INSERT OR IGNORE INTO device_bindings (device_id, user_id) VALUES (?, ?)",
                                  (device_id, user[0]))
                        conn.commit()
                    except Exception:
                        pass
            else:
                # If device is trusted and the user logging in is admin, ensure device is recorded in admin_devices too
                try:
                    if user[3] == 'admin':
                        c.execute('INSERT OR IGNORE INTO admin_devices (device_id, user_id) VALUES (?, ?)', (device_id, user[0]))
                        conn.commit()
                except Exception:
                    pass
        except Exception:
            # On DB error, be conservative and deny access
            conn.close()
            return jsonify({'error': 'خطأ بالخادم أثناء التحقق من الجهاز'}), 500

    conn.close()
    token = jwt.encode({
        'user_id': user[0],
        'username': user[1],
        'role': user[3],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, app.config['SECRET_KEY'], algorithm="HS256")

    return jsonify({
        'token': token,
        'user': {
            'id': user[0],
            'username': user[1],
            'full_name': user[2],
            'role': user[3]
        }
    })

# ==================== Admin APIs ====================

# الحصول على جميع المستخدمين (Admin)
@app.route('/api/admin/users', methods=['GET'])
@token_required
@admin_required
def get_all_users(current_user):
    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()
    
    role = request.args.get('role')  # filter by role
    
    if role:
        c.execute("SELECT id, username, full_name, role, created_at FROM users WHERE role=? ORDER BY created_at DESC", (role,))
    else:
        c.execute("SELECT id, username, full_name, role, created_at FROM users ORDER BY created_at DESC")
    
    users = c.fetchall()
    conn.close()
    
    return jsonify({
        'users': [{
            'id': u[0],
            'username': u[1],
            'full_name': u[2],
            'role': u[3],
            'created_at': u[4]
        } for u in users]
    })

# إضافة مستخدم جديد (Admin)
@app.route('/api/admin/users', methods=['POST'])
@token_required
@admin_required
def create_user(current_user):
    data = request.json
    username = data.get('username')
    password = data.get('password', '123456')
    full_name = data.get('full_name')
    role = data.get('role')
    
    if not username or not full_name or not role:
        return jsonify({'error': 'جميع الحقول مطلوبة'}), 400
    
    if role not in ['student', 'professor', 'admin']:
        return jsonify({'error': 'نوع المستخدم غير صالح'}), 400
    
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    
    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()
    
    try:
        c.execute("INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)",
                 (username, password_hash, full_name, role))
        user_id = c.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': 'تم إضافة المستخدم بنجاح',
            'user': {
                'id': user_id,
                'username': username,
                'full_name': full_name,
                'role': role
            }
        }), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'اسم المستخدم موجود بالفعل'}), 400

# تحديث مستخدم (Admin)
@app.route('/api/admin/users/<int:user_id>', methods=['PUT'])
@token_required
@admin_required
def update_user(current_user, user_id):
    data = request.json
    full_name = data.get('full_name')
    password = data.get('password')
    
    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()
    
    if password:
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        c.execute("UPDATE users SET full_name=?, password=? WHERE id=?",
                 (full_name, password_hash, user_id))
    else:
        c.execute("UPDATE users SET full_name=? WHERE id=?",
                 (full_name, user_id))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'تم تحديث المستخدم بنجاح'})

# حذف مستخدم (Admin)
@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_user(current_user, user_id):
    # منع حذف حساب الأدمن نفسه
    if user_id == current_user['user_id']:
        return jsonify({'error': 'لا يمكنك حذف حسابك الخاص'}), 400
    
    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()
    
    # حذف سجلات الحضور أولاً
    c.execute("DELETE FROM attendance WHERE student_id=?", (user_id,))
    # حذف المستخدم
    c.execute("DELETE FROM users WHERE id=?", (user_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'تم حذف المستخدم بنجاح'})


# فك ربط جهاز (Admin)
@app.route('/api/admin/device-unbind', methods=['POST'])
@token_required
@admin_required
def admin_unbind_device(current_user):
    data = request.json
    device_id = data.get('device_id')
    user_id = data.get('user_id')

    if not device_id and not user_id:
        return jsonify({'error': 'device_id أو user_id مطلوب'}), 400

    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()

    if device_id:
        c.execute('DELETE FROM device_bindings WHERE device_id=?', (device_id,))
    if user_id:
        c.execute('DELETE FROM device_bindings WHERE user_id=?', (user_id,))

    conn.commit()
    conn.close()

    return jsonify({'message': 'تم فك ربط الجهاز/المستخدم بنجاح'})


# إدارة أجهزة الأدمن (Admin) - إضافة/حذف/قائمة
@app.route('/api/admin/admin-devices', methods=['GET'])
@token_required
@admin_required
def list_admin_devices(current_user):
    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()
    c.execute('SELECT id, device_id, user_id, created_at FROM admin_devices ORDER BY created_at DESC')
    items = c.fetchall()
    conn.close()
    return jsonify({'devices': [{'id': r[0], 'device_id': r[1], 'user_id': r[2], 'created_at': r[3]} for r in items]})


@app.route('/api/admin/admin-devices', methods=['POST'])
@token_required
@admin_required
def add_admin_device(current_user):
    data = request.json
    device_id = data.get('device_id')
    user_id = data.get('user_id')

    if not device_id or not user_id:
        return jsonify({'error': 'device_id و user_id مطلوبان'}), 400

    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()
    try:
        c.execute('INSERT OR IGNORE INTO admin_devices (device_id, user_id) VALUES (?, ?)', (device_id, user_id))
        conn.commit()
        conn.close()
        return jsonify({'message': 'تم إضافة جهاز الأدمن بنجاح'}), 201
    except Exception as e:
        conn.close()
        return jsonify({'error': 'خطأ أثناء إضافة جهاز الأدمن'}), 500


@app.route('/api/admin/admin-devices', methods=['DELETE'])
@token_required
@admin_required
def remove_admin_device(current_user):
    data = request.json
    device_id = data.get('device_id')
    user_id = data.get('user_id')

    if not device_id and not user_id:
        return jsonify({'error': 'device_id أو user_id مطلوب'}), 400

    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()
    if device_id:
        c.execute('DELETE FROM admin_devices WHERE device_id=?', (device_id,))
    if user_id:
        c.execute('DELETE FROM admin_devices WHERE user_id=?', (user_id,))
    conn.commit()
    conn.close()

    return jsonify({'message': 'تم حذف جهاز الأدمن بنجاح'})


# إدارة الأجهزة الموثوقة (أي حساب يمكن الدخول من هذه الأجهزة)
@app.route('/api/admin/trusted-devices', methods=['GET'])
@token_required
@admin_required
def list_trusted_devices(current_user):
    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()
    c.execute('SELECT id, device_id, note, created_at FROM trusted_devices ORDER BY created_at DESC')
    items = c.fetchall()
    conn.close()
    return jsonify({'devices': [{'id': r[0], 'device_id': r[1], 'note': r[2], 'created_at': r[3]} for r in items]})


@app.route('/api/admin/trusted-devices', methods=['POST'])
@token_required
@admin_required
def add_trusted_device(current_user):
    data = request.json
    device_id = data.get('device_id')
    note = data.get('note')

    if not device_id:
        return jsonify({'error': 'device_id مطلوب'}), 400

    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()
    try:
        c.execute('INSERT OR IGNORE INTO trusted_devices (device_id, note) VALUES (?, ?)', (device_id, note))
        conn.commit()
        conn.close()
        return jsonify({'message': 'تم إضافة الجهاز إلى القائمة الموثوقة'}), 201
    except Exception:
        conn.close()
        return jsonify({'error': 'خطأ أثناء إضافة الجهاز'}), 500


@app.route('/api/admin/trusted-devices', methods=['DELETE'])
@token_required
@admin_required
def remove_trusted_device(current_user):
    data = request.json
    device_id = data.get('device_id')

    if not device_id:
        return jsonify({'error': 'device_id مطلوب'}), 400

    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()
    c.execute('DELETE FROM trusted_devices WHERE device_id=?', (device_id,))
    conn.commit()
    conn.close()

    return jsonify({'message': 'تم حذف الجهاز الموثوق بنجاح'})


# إدارة الجيوفينس (تحديد مركز ونطاق السماح)
@app.route('/api/admin/geofence', methods=['GET'])
@token_required
@admin_required
def get_geofence(current_user):
    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()
    c.execute('SELECT id, lat, lng, radius_m, shape, width_m, height_m, created_at FROM geofence ORDER BY created_at DESC LIMIT 1')
    row = c.fetchone()
    conn.close()
    if not row:
        return jsonify({'geofence': None})
    return jsonify({'geofence': {'id': row[0], 'lat': row[1], 'lng': row[2], 'radius_m': row[3], 'shape': row[4], 'width_m': row[5], 'height_m': row[6], 'created_at': row[7]}})


@app.route('/api/admin/geofence', methods=['POST'])
@token_required
@admin_required
def set_geofence(current_user):
    data = request.json
    lat = data.get('lat')
    lng = data.get('lng')
    radius_m = data.get('radius_m')
    shape = data.get('shape', 'circle')
    width_m = data.get('width_m')
    height_m = data.get('height_m')
    # ignore any center_device_id (device-centred geofence disabled)
    # center_device_id = data.get('center_device_id')

    if lat is None or lng is None or radius_m is None:
        return jsonify({'error': 'lat, lng, radius_m مطلوبة'}), 400

    try:
        radius_m = int(radius_m)
    except Exception:
        return jsonify({'error': 'radius_m يجب أن يكون رقم بالميترات'}), 400

    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()
    # اجعل السجل الحالي الوحيد عن طريق الحذف ثم الإدراج (بسيط وفعال هنا)
    c.execute('DELETE FROM geofence')
    c.execute('INSERT INTO geofence (lat, lng, radius_m, shape, width_m, height_m) VALUES (?, ?, ?, ?, ?, ?)', (lat, lng, radius_m, shape, width_m, height_m))
    conn.commit()
    conn.close()
    return jsonify({'message': 'تم تعيين نطاق الجيوفينس بنجاح'})


@app.route('/api/admin/geofence', methods=['DELETE'])
@token_required
@admin_required
def delete_geofence(current_user):
    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()
    c.execute('DELETE FROM geofence')
    conn.commit()
    conn.close()
    return jsonify({'message': 'تم حذف نطاق الجيوفينس'})

# الحصول على جميع الجلسات (Admin)
@app.route('/api/admin/sessions', methods=['GET'])
@token_required
@admin_required
def get_all_sessions(current_user):
    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()
    
    c.execute("""SELECT s.id, s.session_code, s.subject_name, s.created_at, s.expires_at, 
                 u.full_name, s.is_active
                 FROM sessions s
                 JOIN users u ON s.professor_id = u.id
                 ORDER BY s.created_at DESC""")
    
    sessions = c.fetchall()
    conn.close()
    
    return jsonify({
        'sessions': [{
            'id': s[0],
            'session_code': s[1],
            'subject_name': s[2],
            'created_at': s[3],
            'expires_at': s[4],
            'professor_name': s[5],
            'is_active': s[6]
        } for s in sessions]
    })


# حذف جلسة (Admin)
@app.route('/api/admin/sessions/<int:session_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_session(current_user, session_id):
    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()
    # حذف سجلات الحضور المتعلقة أولاً
    c.execute('DELETE FROM attendance WHERE session_id=?', (session_id,))
    # ثم حذف الجلسة
    c.execute('DELETE FROM sessions WHERE id=?', (session_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'تم حذف الجلسة بنجاح'})

# الحصول على جميع سجلات الحضور (Admin)
@app.route('/api/admin/attendance', methods=['GET'])
@token_required
@admin_required
def get_all_attendance(current_user):
    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()
    
    c.execute("""SELECT a.id, u.full_name, u.username, s.subject_name, 
                 a.recorded_at, s.created_at
                 FROM attendance a
                 JOIN users u ON a.student_id = u.id
                 JOIN sessions s ON a.session_id = s.id
                 ORDER BY a.recorded_at DESC
                 LIMIT 100""")
    
    records = c.fetchall()
    conn.close()
    
    return jsonify({
        'records': [{
            'id': r[0],
            'student_name': r[1],
            'student_username': r[2],
            'subject': r[3],
            'recorded_at': r[4],
            'session_date': r[5]
        } for r in records]
    })

# تعديل سجل حضور (Admin)
@app.route('/api/admin/attendance/<int:attendance_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_attendance(current_user, attendance_id):
    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()
    c.execute("DELETE FROM attendance WHERE id=?", (attendance_id,))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'تم حذف سجل الحضور بنجاح'})

# إضافة حضور يدوياً (Admin)
@app.route('/api/admin/attendance', methods=['POST'])
@token_required
@admin_required
def add_attendance_manually(current_user):
    data = request.json
    student_id = data.get('student_id')
    session_id = data.get('session_id')
    
    if not student_id or not session_id:
        return jsonify({'error': 'معرف الطالب والجلسة مطلوبان'}), 400
    
    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()
    
    try:
        c.execute("INSERT INTO attendance (student_id, session_id) VALUES (?, ?)",
                 (student_id, session_id))
        conn.commit()
        conn.close()
        return jsonify({'message': 'تم إضافة الحضور بنجاح'}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'الحضور مسجل مسبقاً'}), 400

# إحصائيات عامة (Admin Dashboard)
@app.route('/api/admin/statistics', methods=['GET'])
@token_required
@admin_required
def get_statistics(current_user):
    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()
    
    # عدد المستخدمين
    c.execute("SELECT COUNT(*) FROM users WHERE role='student'")
    total_students = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM users WHERE role='professor'")
    total_professors = c.fetchone()[0]
    
    # عدد الجلسات
    c.execute("SELECT COUNT(*) FROM sessions")
    total_sessions = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM sessions WHERE is_active=1 AND expires_at > datetime('now')")
    active_sessions = c.fetchone()[0]
    
    # عدد سجلات الحضور
    c.execute("SELECT COUNT(*) FROM attendance")
    total_attendance = c.fetchone()[0]
    
    # سجلات الحضور اليوم
    c.execute("SELECT COUNT(*) FROM attendance WHERE date(recorded_at) = date('now')")
    today_attendance = c.fetchone()[0]
    
    conn.close()
    
    return jsonify({
        'students': total_students,
        'professors': total_professors,
        'total_sessions': total_sessions,
        'active_sessions': active_sessions,
        'total_attendance': total_attendance,
        'today_attendance': today_attendance
    })

# ==================== Professor APIs ====================

# إنشاء جلسة جديدة (للدكتور فقط)
@app.route('/api/sessions/create', methods=['POST'])
@token_required
def create_session(current_user):
    if current_user['role'] != 'professor':
        return jsonify({'error': 'غير مصرح لك'}), 403
    
    data = request.json
    subject_name = data.get('subject_name', 'محاضرة')
    duration_minutes = data.get('duration', 60)
    
    session_code = secrets.token_urlsafe(16)
    expires_at = datetime.datetime.now() + datetime.timedelta(minutes=duration_minutes)
    
    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()
    c.execute("""INSERT INTO sessions (session_code, professor_id, subject_name, expires_at) 
                 VALUES (?, ?, ?, ?)""",
             (session_code, current_user['user_id'], subject_name, expires_at.isoformat()))
    session_id = c.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({
        'session_id': session_id,
        'session_code': session_code,
        'subject_name': subject_name,
        'expires_at': expires_at.isoformat()
    })

# الحصول على الجلسات النشطة للدكتور
@app.route('/api/sessions/active', methods=['GET'])
@token_required
def get_active_sessions(current_user):
    if current_user['role'] != 'professor':
        return jsonify({'error': 'غير مصرح لك'}), 403
    
    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()
    c.execute("""SELECT id, session_code, subject_name, created_at, expires_at 
                 FROM sessions 
                 WHERE professor_id=? AND is_active=1 AND expires_at > datetime('now')
                 ORDER BY created_at DESC""",
             (current_user['user_id'],))
    sessions = c.fetchall()
    conn.close()
    
    return jsonify({
        'sessions': [{
            'id': s[0],
            'session_code': s[1],
            'subject_name': s[2],
            'created_at': s[3],
            'expires_at': s[4]
        } for s in sessions]
    })

# الحصول على حضور الطلاب لجلسة معينة
@app.route('/api/sessions/<int:session_id>/attendance', methods=['GET'])
@token_required
def get_session_attendance(current_user, session_id):
    if current_user['role'] != 'professor':
        return jsonify({'error': 'غير مصرح لك'}), 403
    
    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()
    
    c.execute("""SELECT u.full_name, u.username, a.recorded_at 
                 FROM attendance a
                 JOIN users u ON a.student_id = u.id
                 WHERE a.session_id=?
                 ORDER BY a.recorded_at DESC""",
             (session_id,))
    students = c.fetchall()
    conn.close()
    
    return jsonify({
        'students': [{
            'name': s[0],
            'username': s[1],
            'recorded_at': s[2]
        } for s in students]
    })

# تسجيل حضور الطالب بواسطة الدكتور (باستخدام QR Code)
@app.route('/api/professor/record-attendance', methods=['POST'])
@token_required
def professor_record_attendance(current_user):
    if current_user['role'] != 'professor':
        return jsonify({'error': 'غير مصرح لك'}), 403
    
    data = request.json
    student_code = data.get('student_code')
    session_code = data.get('session_code')
    
    if not student_code or not session_code:
        return jsonify({'error': 'كود الطالب وكود الجلسة مطلوبان'}), 400
    
    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()
    
    # التحقق من صحة كود الطالب
    if not student_code.startswith('STUDENT_'):
        conn.close()
        return jsonify({'error': 'كود الطالب غير صالح'}), 400
    
    student_id = student_code.replace('STUDENT_', '')
    try:
        student_id = int(student_id)
    except ValueError:
        conn.close()
        return jsonify({'error': 'كود الطالب غير صالح'}), 400
    
    # التحقق من وجود الطالب
    c.execute("SELECT id, full_name FROM users WHERE id=? AND role='student'", (student_id,))
    student = c.fetchone()
    if not student:
        conn.close()
        return jsonify({'error': 'الطالب غير موجود'}), 400
    
    # التحقق من صحة الجلسة
    c.execute("""SELECT id, expires_at FROM sessions 
                 WHERE session_code=? AND professor_id=? AND is_active=1""", 
             (session_code, current_user['user_id']))
    session = c.fetchone()
    
    if not session:
        conn.close()
        return jsonify({'error': 'كود الجلسة غير صالح أو غير مخصص لك'}), 400
    
    session_id = session[0]
    expires_at = datetime.datetime.fromisoformat(session[1])
    
    if datetime.datetime.now() > expires_at:
        conn.close()
        return jsonify({'error': 'انتهت صلاحية الجلسة'}), 400
    
    # التحقق من عدم تسجيل الحضور مسبقاً
    c.execute("SELECT id FROM attendance WHERE student_id=? AND session_id=?",
             (student_id, session_id))
    existing = c.fetchone()
    
    if existing:
        conn.close()
        return jsonify({'error': f'تم تسجيل حضور الطالب {student[1]} مسبقاً لهذه الجلسة'}), 400
    
    # تسجيل الحضور
    c.execute("INSERT INTO attendance (student_id, session_id) VALUES (?, ?)",
             (student_id, session_id))
    conn.commit()
    conn.close()
    
    return jsonify({
        'message': f'تم تسجيل حضور الطالب {student[1]} بنجاح',
        'student_name': student[1]
    })

# ==================== Student APIs ====================

# تسجيل الحضور (للطالب)
@app.route('/api/attendance/record', methods=['POST'])
@token_required
def record_attendance(current_user):
    if current_user['role'] != 'student':
        return jsonify({'error': 'غير مصرح لك'}), 403
    
    data = request.json
    session_code = data.get('session_code')
    user_lat = data.get('lat')
    user_lng = data.get('lng')
    
    if not session_code:
        return jsonify({'error': 'كود الجلسة مطلوب'}), 400
    
    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()
    
    # التحقق من صلاحية الجلسة
    c.execute("""SELECT id, expires_at FROM sessions 
                 WHERE session_code=? AND is_active=1""", (session_code,))
    session = c.fetchone()
    
    if not session:
        conn.close()
        return jsonify({'error': 'كود الجلسة غير صالح'}), 400
    
    session_id = session[0]
    expires_at = datetime.datetime.fromisoformat(session[1])
    
    if datetime.datetime.now() > expires_at:
        conn.close()
        return jsonify({'error': 'انتهت صلاحية الجلسة'}), 400
    
    # التحقق من عدم تسجيل الحضور مسبقاً
    c.execute("SELECT id FROM attendance WHERE student_id=? AND session_id=?",
             (current_user['user_id'], session_id))
    existing = c.fetchone()
    
    if existing:
        conn.close()
        return jsonify({'error': 'تم تسجيل حضورك مسبقاً لهذه الجلسة'}), 400

    # Geofence enforcement disabled for attendance (attendance allowed regardless of geofence)
    
    # تسجيل الحضور
    c.execute("INSERT INTO attendance (student_id, session_id) VALUES (?, ?)",
             (current_user['user_id'], session_id))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'تم تسجيل الحضور بنجاح'})

# الحصول على سجل الحضور للطالب
@app.route('/api/attendance/my-records', methods=['GET'])
@token_required
def get_my_attendance(current_user):
    if current_user['role'] != 'student':
        return jsonify({'error': 'غير مصرح لك'}), 403
    
    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()
    
    # الحصول على سجل الحضور
    c.execute("""SELECT s.subject_name, a.recorded_at, s.created_at 
                 FROM attendance a
                 JOIN sessions s ON a.session_id = s.id
                 WHERE a.student_id=?
                 ORDER BY a.recorded_at DESC
                 LIMIT 20""",
             (current_user['user_id'],))
    records = c.fetchall()
    
    # حساب نسبة الغياب
    c.execute("SELECT COUNT(*) FROM sessions WHERE is_active=1")
    total_sessions = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM attendance WHERE student_id=?",
             (current_user['user_id'],))
    attended_sessions = c.fetchone()[0]
    
    conn.close()
    
    absence_rate = 0
    if total_sessions > 0:
        absence_rate = ((total_sessions - attended_sessions) / total_sessions) * 100
    
    warning_level = None
    if absence_rate > 25:
        warning_level = 'حرمان'
    elif absence_rate > 10:
        warning_level = 'إنذار'
    
    return jsonify({
        'records': [{
            'subject': r[0],
            'recorded_at': r[1],
            'session_date': r[2]
        } for r in records],
        'statistics': {
            'total_sessions': total_sessions,
            'attended': attended_sessions,
            'absent': total_sessions - attended_sessions,
            'absence_rate': round(absence_rate, 2),
            'warning_level': warning_level
        }
    })


# Serve frontend index
@app.route('/')
def index():
    return app.send_static_file('index.html')


if __name__ == '__main__':
    # app.run(debug=True, port=5000)
    app.run(debug=True, host="0.0.0.0", port=5000)



