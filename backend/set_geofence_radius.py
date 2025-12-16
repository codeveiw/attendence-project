"""
Simple helper to update the geofence radius in the local SQLite DB.
Run from the `backend` folder (PowerShell example below).

Usage examples (PowerShell):
  cd 'c:\Users\Mohamed Rabea\attendance-system\backend'
  python .\set_geofence_radius.py 15

This will set `radius_m` to 15 for the existing geofence row(s).
"""
import sys
import sqlite3

def set_radius(meters):
    conn = sqlite3.connect('attendance.db')
    c = conn.cursor()
    try:
        c.execute('SELECT COUNT(*) FROM geofence')
        count = c.fetchone()[0]
        if count == 0:
            print('No geofence row found. Insert one using admin UI or via SQL.')
            return
        c.execute('UPDATE geofence SET radius_m = ? WHERE 1=1', (meters,))
        conn.commit()
        print(f'Updated geofence radius to {meters} meters for {count} row(s).')
    except Exception as e:
        print('Error updating geofence:', e)
    finally:
        conn.close()

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: python set_geofence_radius.py <meters>')
        sys.exit(1)
    try:
        meters = int(sys.argv[1])
    except ValueError:
        print('meters must be an integer')
        sys.exit(1)
    set_radius(meters)
