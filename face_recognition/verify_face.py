import cv2 # type: ignore
import numpy as np # type: ignore
import requests # type: ignore
import time

# Initialize recognizer
recognizer = cv2.face.LBPHFaceRecognizer_create()
recognizer.read('trainer/trainer.yml')

# Load face detector
cascadePath = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
faceCascade = cv2.CascadeClassifier(cascadePath)

# Open webcam
cam = cv2.VideoCapture(0)
cam.set(3, 640)
cam.set(4, 480)

font = cv2.FONT_HERSHEY_SIMPLEX

# Define minimum window size to be recognized as a face
minW = 0.1 * cam.get(3)
minH = 0.1 * cam.get(4)

print("[INFO] Starting face recognition. Press ESC to exit...")

matched = False  # Track if a face was matched

while True:
    ret, img = cam.read()
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    faces = faceCascade.detectMultiScale(
        gray,
        scaleFactor = 1.2,
        minNeighbors = 5,
        minSize = (int(minW), int(minH))
    )

    for (x, y, w, h) in faces:
        face_id, confidence = recognizer.predict(gray[y:y+h, x:x+w])

        if confidence < 50:  # Lower means more confident
            text = f"ID: {face_id} ({round(100 - confidence)}%)"
            print(f"[MATCH ✅] Face ID: {face_id}, Confidence: {round(100 - confidence)}%")

            # Optional: Call your Node.js API with face_id
            try:
                res = requests.post('http://localhost:5000/api/verify-face', json={"face_id": face_id})
                if res.status_code == 200:
                    print("[✅] Face verified and attendance marked.")
                else:
                    print("[❌] Server rejected the face ID.")
            except Exception as e:
                print(f"[ERROR] Exception occurred: {e}")
            matched = True
            time.sleep(2)  # Prevent spamming
            cam.release()
            cv2.destroyAllWindows()
            exit()

        else:
            text = "Unknown Face"
            print(f"[NO MATCH ❌] Confidence: {round(100 - confidence)}%")

        # Draw box and show text
        cv2.rectangle(img, (x,y), (x+w,y+h), (0,255,0), 2)
        cv2.putText(img, text, (x+5,y-5), font, 0.8, (255,255,255), 2)

    cv2.imshow('camera', img)

    k = cv2.waitKey(10) & 0xff
    if k == 27:  # ESC
        break

cam.release()
cv2.destroyAllWindows()
if matched:
    print("Face matched")
else:
    print("Face not matched")
