@echo off
setlocal
cd /d "%~dp0"

rem Kameraadgang virker ikke stabilt, naar index.html aabnes som file://.
rem Start en lille lokal webserver, og aabn derefter den sikre localhost-adresse.
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080/ -TimeoutSec 1 | Out-Null; exit 0 } catch { exit 1 }"
if errorlevel 1 (
  where py >nul 2>nul
  if errorlevel 1 (
    echo Python blev ikke fundet. Installer Python, eller koer: python -m http.server 8080
    pause
    exit /b 1
  )
  start "Lokal server til Haandmatematik" /min py -3 -m http.server 8080 --bind 127.0.0.1
  timeout /t 2 /nobreak >nul
)

set "CHROME_PATH=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if exist "%CHROME_PATH%" (
  start "" "%CHROME_PATH%" "http://localhost:8080/"
) else (
  start "" "http://localhost:8080/"
)

endlocal
