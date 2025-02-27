import sqlite3

# Connect to the database
conn = sqlite3.connect('parking.db')
cursor = conn.cursor()

# Get all tables in the database
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()

print("Tables in Database:")
for table in tables:
    print(f"- {table[0]}")

# Print data from each table
for table in tables:
    print(f"\nData from table: {table[0]}")
    cursor.execute(f"SELECT * FROM {table[0]}")
    rows = cursor.fetchall()
    
    if rows:
        for row in rows:
            print(row)
    else:
        print("No data found.")

# Close the connection
conn.close()
