# Script para aplicar a correção RLS via Supabase Management API
$sql = Get-Content -Path "fix_technical_responsibles_rls.sql" -Raw

Write-Host "Aplicando correção RLS para technical_responsibles..."
Write-Host ""
Write-Host "Por favor, execute este SQL manualmente no Supabase Dashboard:"
Write-Host "https://supabase.com/dashboard/project/ymuzggvvslpxaabozmck/sql/new"
Write-Host ""
Write-Host "SQL a ser executado:"
Write-Host "===================="
Write-Host $sql
Write-Host "===================="
Write-Host ""
Write-Host "Pressione qualquer tecla para copiar o SQL para a área de transferência..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Set-Clipboard -Value $sql
Write-Host "SQL copiado para a área de transferência! Cole no SQL Editor do Supabase."
