@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

set "REPO_URL=https://github.com/pcdosilva01-spec/licoes-8b"
set "BRANCH=master"
set "MESSAGE=Atualiza plataforma do 8o B"

echo.
echo ================================================
echo   Publicar plataforma do 8o B no GitHub
echo ================================================
echo Repositorio: %REPO_URL%
echo Branch: %BRANCH%
echo.
choice /C SN /N /M "Continuar com git push --force? [S/N] "
if errorlevel 2 goto :cancel

where git >nul 2>nul
if errorlevel 1 (
  echo ERRO: Git nao foi encontrado no PATH.
  goto :error
)

if exist ".env" (
  echo ERRO: .env encontrado na raiz. Remova-o antes de continuar.
  goto :error
)
for /r %%F in (.env .env.*) do (
  if exist "%%F" (
    echo ERRO: arquivo de ambiente encontrado: %%F
    goto :error
  )
)

if not exist .git (
  echo Inicializando o repositorio Git local...
  git init
  if errorlevel 1 goto :error
)

git branch -M "%BRANCH%"
git remote get-url origin >nul 2>nul
if errorlevel 1 (
  git remote add origin "%REPO_URL%"
) else (
  git remote set-url origin "%REPO_URL%"
)
if errorlevel 1 goto :error

git add -A
if errorlevel 1 goto :error

for /f "delims=" %%F in ('git diff --cached --name-only ^| findstr /R /I /C:"^\.env$" /C:"/\.env$" /C:"\\.env$" /C:"\.env\."') do (
  echo ERRO DE SEGURANCA: arquivo de ambiente no stage: %%F
  git reset --quiet
  goto :error
)

git diff --cached --quiet
if not errorlevel 1 (
  echo Nenhuma alteracao nova para publicar.
  goto :done
)

git commit -m "%MESSAGE%"
if errorlevel 1 goto :error

echo Enviando para master com push forcado...
git push --force -u origin "%BRANCH%"
if errorlevel 1 (
  echo O push falhou. Verifique o login e as permissoes do repositorio.
  goto :error
)

echo.
echo Push concluido para %REPO_URL% no branch %BRANCH%.
goto :done

:cancel
echo Operacao cancelada.
exit /b 1

:error
echo.
echo Processo interrompido. Nenhum push foi concluido.
exit /b 1

:done
endlocal
exit /b 0
