@echo off
echo Starting Python application in minimized window...
start /min "" python "C:\Users\18071\Desktop\Dashboard\backend\app.py"

echo Waiting for application to start...
timeout /t 5 /nobreak >nul

echo Opening browser...
start "" "http://127.0.0.1:5050"

exit