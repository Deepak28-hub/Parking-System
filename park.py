from flask import Flask, render_template, request, jsonify, Response
import cv2
import pickle
import numpy as np
import sqlite3

app = Flask(__name__, template_folder="templates", static_folder="static")

# Load parking positions
try:
    with open('parking-app/backend/CarParkPos', 'rb') as f:
        posList = pickle.load(f)
except FileNotFoundError:
    posList = []  # If file is missing, avoid crashing

width, height = 107, 48
video = cv2.VideoCapture("parking-app/backend/carPark.mp4")

# Initialize database
def init_db():
    conn = sqlite3.connect('parking.db')
    cursor = conn.cursor()
    cursor.execute('''CREATE TABLE IF NOT EXISTS bookings (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        slot_id INTEGER UNIQUE,
                        user_id TEXT)''')
    cursor.execute("DELETE FROM bookings")
    conn.commit()
    conn.close()

init_db()

def get_parking_status():
    """
    Process the video frame to determine which parking slots are occupied or available.
    """
    success, img = video.read()
    if not success:
        video.set(cv2.CAP_PROP_POS_FRAMES, 0)  # Restart video if it ends
        return {"error": "Could not process video"}

    imgGray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    imgBlur = cv2.GaussianBlur(imgGray, (3, 3), 1)
    imgThreshold = cv2.adaptiveThreshold(imgBlur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                         cv2.THRESH_BINARY_INV, 25, 16)
    imgMedian = cv2.medianBlur(imgThreshold, 5)
    kernel = np.ones((3, 3), np.uint8)
    imgDilate = cv2.dilate(imgMedian, kernel, iterations=1)

    spaceCounter = 0
    status = {}

    for idx, pos in enumerate(posList):
        x, y = pos
        imgCrop = imgDilate[y:y+height, x:x+width]
        count = cv2.countNonZero(imgCrop)

        if count < 900:
            status[idx] = "free"
            spaceCounter += 1
        else:
            status[idx] = "occupied"

    return {"total": len(posList), "free": spaceCounter, "status": status}

def generate_video_feed():
    """
    Stream the video while drawing parking slots with correct numbering and availability status.
    """
    while True:
        success, img = video.read()
        if not success:
            video.set(cv2.CAP_PROP_POS_FRAMES, 0)  # Restart video to loop
            continue

        imgGray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        imgBlur = cv2.GaussianBlur(imgGray, (3, 3), 1)
        imgThreshold = cv2.adaptiveThreshold(imgBlur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                             cv2.THRESH_BINARY_INV, 25, 16)
        imgMedian = cv2.medianBlur(imgThreshold, 5)
        kernel = np.ones((3, 3), np.uint8)
        imgDilate = cv2.dilate(imgMedian, kernel, iterations=1)

        free_slots = []

        for idx, pos in enumerate(posList):
            x, y = pos
            imgCrop = imgDilate[y:y+height, x:x+width]
            count = cv2.countNonZero(imgCrop)

            # Determine if slot is occupied
            if count < 900:
                color = (0, 255, 0)  # Green for available
                free_slots.append(idx)
            else:
                color = (0, 0, 255)  # Red for occupied

            # Draw the parking slot box and number
            cv2.rectangle(img, (x, y), (x + width, y + height), color, 2)
            cv2.putText(img, str(idx), (x + 10, y + 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)

        ret, buffer = cv2.imencode('.jpg', img)
        frame = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')


@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/parking-status')
def parking_status():
    return jsonify(get_parking_status())

@app.route('/api/book-slot', methods=['POST'])
def book_slot():
    data = request.get_json()
    slot_id = data.get('slot_id')
    user_id = data.get('user_id')

    conn = sqlite3.connect('parking.db')
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO bookings (slot_id, user_id) VALUES (?, ?)", (slot_id, user_id))
    conn.commit()
    conn.close()

    return jsonify({"message": "Slot booked successfully"})

@app.route('/api/bookings')
def get_bookings():
    conn = sqlite3.connect('parking.db')
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM bookings")
    bookings = cursor.fetchall()
    conn.close()

    return jsonify({"bookings": bookings})

@app.route('/api/cancel-booking', methods=['POST'])
def cancel_booking():
    data = request.get_json()
    slot_id = data.get('slot_id')

    conn = sqlite3.connect('parking.db')
    cursor = conn.cursor()
    cursor.execute("DELETE FROM bookings WHERE slot_id = ?", (slot_id,))
    conn.commit()
    conn.close()

    return jsonify({"message": "Booking canceled successfully"})

@app.route('/video_feed')
def video_feed():
    return Response(generate_video_feed(), mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    app.run(debug=True)
