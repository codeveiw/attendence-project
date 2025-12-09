import sqlite3
import hashlib

conn = sqlite3.connect('attendance.db')
c = conn.cursor()

# فحص جميع المستخدمين
c.execute('SELECT username, password, full_name, role FROM users LIMIT 5')
users = c.fetchall()

print('المستخدمون الموجودون:')
for u in users:
    print(f'Username: {u[0]}, Password Hash: {u[1][:20]}..., Name: {u[2]}, Role: {u[3]}')

# اختبار تجزئة كلمة المرور
print('\n--- اختبار كلمة المرور ---')
test_password = '123456'
test_hash = hashlib.sha256(test_password.encode()).hexdigest()
print(f'كلمة المرور: {test_password}')
print(f'Hash: {test_hash}')

# البحث عن admin
c.execute('SELECT * FROM users WHERE username = ?', ('admin',))
admin = c.fetchone()
if admin:
    print(f'\nAdmin موجود: ID={admin[0]}, Username={admin[1]}')
    admin_hash = hashlib.sha256('admin123'.encode()).hexdigest()
    print(f'Admin Password Hash (expected): {admin_hash}')
    print(f'DB Hash (actual): {admin[2]}')
    print(f'Match: {admin[2] == admin_hash}')

# البحث عن student1
c.execute('SELECT * FROM users WHERE username = ?', ('student1',))
student = c.fetchone()
if student:
    print(f'\nStudent1 موجود: ID={student[0]}, Username={student[1]}')
    student_hash = hashlib.sha256('123456'.encode()).hexdigest()
    print(f'Student Password Hash (expected): {student_hash}')
    print(f'DB Hash (actual): {student[2]}')
    print(f'Match: {student[2] == student_hash}')

conn.close()
print('\n✅ فحص البيانات اكتمل')
