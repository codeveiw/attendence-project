import sqlite3
import hashlib
from datetime import datetime, timedelta

# حذف قاعدة البيانات القديمة وإنشاء واحدة جديدة
def setup_database():
    print("🔧 جاري إعداد قاعدة البيانات...")
    
    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()
    
    # حذف الجداول القديمة إن وجدت
    c.execute('DROP TABLE IF EXISTS attendance')
    c.execute('DROP TABLE IF EXISTS sessions')
    c.execute('DROP TABLE IF EXISTS users')
    
    print("✅ تم حذف الجداول القديمة")
    
    # إنشاء جدول المستخدمين
    c.execute('''CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    
    # إنشاء جدول الجلسات
    c.execute('''CREATE TABLE sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_code TEXT UNIQUE NOT NULL,
        professor_id INTEGER NOT NULL,
        subject_name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        is_active INTEGER DEFAULT 1,
        FOREIGN KEY (professor_id) REFERENCES users(id)
    )''')
    
    # إنشاء جدول الحضور
    c.execute('''CREATE TABLE attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        session_id INTEGER NOT NULL,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id),
        FOREIGN KEY (session_id) REFERENCES sessions(id),
        UNIQUE(student_id, session_id)
    )''')
    
    print("✅ تم إنشاء الجداول الجديدة")
    
    # إضافة المستخدمين
    users_data = [
        # Admin
        ('admin', 'admin123', 'المسؤول', 'admin'),
        
        # Professors
        ('prof1', '123456', 'د. أحمد محمد علي', 'professor'),
        ('prof2', '123456', 'د. فاطمة حسن إبراهيم', 'professor'),
        ('prof3', '123456', 'د. محمد عبد الرحمن', 'professor'),
        ('prof4', '123456', 'د. نورا سعد الدين', 'professor'),
        ('prof5', '123456', 'د. خالد محمود أحمد', 'professor'),
        ('prof6', '123456', 'د. مريم علي حسن', 'professor'),
        ('prof7', '123456', 'د. عمر يوسف محمد', 'professor'),
        ('prof8', '123456', 'د. سارة أحمد محمود', 'professor'),
        ('prof9', '123456', 'د. عبد الله خالد علي', 'professor'),
        ('prof10', '123456', 'د. لينا محمد حسن', 'professor'),
        
        # Students
        ('student1', '123456', 'أحمد محمد علي', 'student'),
        ('student2', '123456', 'فاطمة حسن إبراهيم', 'student'),
        ('student3', '123456', 'محمد عبد الرحمن', 'student'),
        ('student4', '123456', 'نورا سعد الدين', 'student'),
        ('student5', '123456', 'خالد محمود أحمد', 'student'),
        ('student6', '123456', 'مريم علي حسن', 'student'),
        ('student7', '123456', 'عمر يوسف محمد', 'student'),
        ('student8', '123456', 'سارة أحمد محمود', 'student'),
        ('student9', '123456', 'عبد الله خالد علي', 'student'),
        ('student10', '123456', 'لينا محمد حسن', 'student'),
    ]
    
    print("\n👥 جاري إضافة المستخدمين...")
    for username, password, full_name, role in users_data:
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        c.execute("INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)",
                 (username, password_hash, full_name, role))
        print(f"  ✓ {full_name} ({username})")
    
    print("\n✅ تم إضافة جميع المستخدمين")
    
    # إضافة بعض الجلسات التجريبية
    print("\n📚 جاري إضافة جلسات تجريبية...")
    
    sessions_data = [
        (2, 'برمجة 1', datetime.now() - timedelta(days=5), datetime.now() + timedelta(hours=2)),
        (2, 'قواعد البيانات', datetime.now() - timedelta(days=4), datetime.now() + timedelta(hours=3)),
        (3, 'الخوارزميات', datetime.now() - timedelta(days=3), datetime.now() + timedelta(hours=1)),
        (3, 'هندسة البرمجيات', datetime.now() - timedelta(days=2), datetime.now() + timedelta(hours=4)),
        (4, 'الذكاء الاصطناعي', datetime.now() - timedelta(days=1), datetime.now() + timedelta(hours=5)),
    ]
    
    for prof_id, subject, created, expires in sessions_data:
        # توليد كود جلسة بسيط
        session_code = f"SESSION_{subject.replace(' ', '_')}_{created.strftime('%Y%m%d')}"
        c.execute("""INSERT INTO sessions (session_code, professor_id, subject_name, created_at, expires_at, is_active) 
                     VALUES (?, ?, ?, ?, ?, 1)""",
                 (session_code, prof_id, subject, created.isoformat(), expires.isoformat()))
        print(f"  ✓ {subject}")
    
    print("\n✅ تم إضافة الجلسات التجريبية")
    
    # إضافة بعض سجلات الحضور التجريبية
    print("\n✅ جاري إضافة سجلات حضور تجريبية...")
    
    attendance_data = [
        (12, 1),  # student1 حضر الجلسة 1
        (12, 2),  # student1 حضر الجلسة 2
        (13, 1),  # student2 حضر الجلسة 1
        (14, 1),  # student3 حضر الجلسة 1
        (14, 2),  # student3 حضر الجلسة 2
        (14, 3),  # student3 حضر الجلسة 3
        (15, 2),  # student4 حضر الجلسة 2
        (16, 1),  # student5 حضر الجلسة 1
    ]
    
    for student_id, session_id in attendance_data:
        try:
            c.execute("INSERT INTO attendance (student_id, session_id) VALUES (?, ?)",
                     (student_id, session_id))
        except:
            pass  # تجاهل الأخطاء إذا كان السجل موجود
    
    print("  ✓ تم إضافة سجلات الحضور")
    
    conn.commit()
    conn.close()
    
    print("\n" + "="*50)
    print("🎉 تم إعداد قاعدة البيانات بنجاح!")
    print("="*50)
    print("\n📋 الحسابات المتاحة:")
    print("\n👑 المسؤول:")
    print("   Username: admin")
    print("   Password: admin123")
    print("\n👨‍🏫 الدكاترة:")
    print("   Username: prof1 إلى prof10")
    print("   Password: 123456")
    print("\n👨‍🎓 الطلاب:")
    print("   Username: student1 إلى student10")
    print("   Password: 123456")
    print("\n" + "="*50)
    print("✅ يمكنك الآن تسجيل الدخول!")
    print("="*50 + "\n")

if __name__ == '__main__':
    setup_database()