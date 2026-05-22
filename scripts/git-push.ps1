# GitHub(chocoarcher/order-app)로 변경 사항 푸시
# 사용법:
#   .\scripts\git-push.ps1 "커밋 메시지"
#   .\scripts\git-push.ps1                    # 메시지 없으면 프롬프트

param(
    [string]$Message = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

if (-not $Message) {
    $Message = Read-Host "커밋 메시지를 입력하세요"
}
if (-not $Message.Trim()) {
    Write-Host "커밋 메시지가 비어 있어 중단합니다." -ForegroundColor Red
    exit 1
}

git status -sb
$changes = git status --porcelain
if (-not $changes) {
    Write-Host "커밋할 변경 사항이 없습니다. 이미 최신일 수 있습니다." -ForegroundColor Yellow
    git push order-app main
    exit 0
}

git add -A
git commit -m $Message
git push order-app main

Write-Host ""
Write-Host "푸시 완료: https://github.com/chocoarcher/order-app" -ForegroundColor Green
Write-Host "Render에서 Manual Deploy -> Deploy latest commit 을 실행하세요."
