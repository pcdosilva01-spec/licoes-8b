@echo off
setlocal
chcp 65001 >nul

echo ================================================
echo   Lições da Turma — instalação do 8º B
echo ================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js não foi encontrado. Instale Node.js 22 ou superior e tente novamente.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo npm não foi encontrado. Reinstale o Node.js com npm incluído.
  pause
  exit /b 1
)

echo Instalando dependências do projeto...
npm install
if errorlevel 1 (
  echo A instalação falhou. Verifique sua conexão e tente novamente.
  pause
  exit /b 1
)

echo.
echo Dependências instaladas. Iniciando o servidor do 8º B...
npm run dev

endlocal
