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
        """
        set_geofence_radius.py: removed. Geofence feature disabled.
        """
        print('Error updating geofence:', e)
