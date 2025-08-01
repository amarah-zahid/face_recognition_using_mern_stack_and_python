import cv2  # type: ignore
import os

# Create folders if they don't exist
if not os.path.exists('dataset'):
    os.makedirs('dataset')
if not os.path.exists('trainer'):
    os.makedirs('trainer')

cam = cv2.VideoCapture(0)
cam.set(3, 640)  # width
cam.set(4, 480)  # height

face_detector = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

# Enter user face ID (match it with MongoDB face_id)
face_id = input('\nEnter numeric user ID (face_id from MongoDB): ')
print("\n[INFO] Initializing face capture. Look at the camera ...")

count = 0
while True:
    ret, img = cam.read()
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_detector.detectMultiScale(gray, 1.3, 5)

    for (x,y,w,h) in faces:
        count += 1
        cv2.imwrite(f"dataset/User.{face_id}.{count}.jpg", gray[y:y+h, x:x+w])
        cv2.rectangle(img, (x,y), (x+w,y+h), (255,0,0), 2)
        cv2.imshow('image', img)

    k = cv2.waitKey(100) & 0xff
    if k == 27:  # ESC to exit
        break
    elif count >= 30:  # Take 30 face samples and stop
        break

print("\n[INFO] Exiting...")
cam.release()
cv2.destroyAllWindows()
