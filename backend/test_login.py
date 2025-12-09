import sqlite3
import hashlib

# الاتصال بقاعدة البيانات
conn = sqlite3.connect('attendance.db')
c = conn.cursor()

print("🔍 اختبار قاعدة البيانات...")
print("="*50)

# التحقق من وجود الجداول
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = c.fetchall()
print(f"\n📋 الجداول الموجودة: {[t[0] for t in tables]}")

# التحقق من المستخدمين
c.execute("SELECT username, role FROM users")
users = c.fetchall()
print(f"\n👥 المستخدمين الموجودين ({len(users)}):")
for u in users:
    print(f"  - {u[0]} ({u[1]})")

# اختبار تسجيل الدخول
print("\n🧪 اختبار تسجيل الدخول...")
print("="*50)

test_users = [
    ('admin', 'admin123'),
    ('prof1', '123456'),
    ('student1', '123456')
]

for username, password in test_users:
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    
    c.execute("SELECT id, username, full_name, role, password FROM users WHERE username=?", (username,))
    user = c.fetchone()
    
    if user:
        stored_hash = user[4]
        match = stored_hash == password_hash
        
        status = "✅ نجح" if match else "❌ فشل"
        print(f"\n{status} {username}:")
        print(f"  الاسم: {user[2]}")
        print(f"  الدور: {user[3]}")
        print(f"  Hash المخزن: {stored_hash[:20]}...")
        print(f"  Hash المحسوب: {password_hash[:20]}...")
        print(f"  المطابقة: {match}")
    else:
        print(f"\n❌ {username}: المستخدم غير موجود")

conn.close()
print("\n" + "="*50)
print("✅ انتهى الاختبار")