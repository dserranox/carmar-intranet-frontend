@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo   CarMar Frontend - ng serve (dev)
echo ============================================
echo.

if not exist node_modules (
  echo No se encontro node_modules, instalando dependencias por primera vez...
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERROR] Fallo npm install. Revisa el mensaje de arriba.
    pause
    exit /b 1
  )
  echo.
)

echo Compilando y levantando en el puerto por defecto del proyecto ^(4400^)...
echo Quedara disponible en: http://localhost:4400
echo El proxy hacia el backend ^(puerto 8090^) ya esta configurado en proxy.conf.json
echo.
echo Para cortar el servidor: Ctrl+C en esta ventana.
echo.

call npm start

echo.
echo El proceso del frontend finalizo (o fallo). Revisa los mensajes de arriba.
pause
endlocal
