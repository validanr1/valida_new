# Execute este script para aplicar a criação da tabela assessment_type_items

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "INSTRUÇÕES PARA CRIAR A TABELA" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Acesse o Supabase SQL Editor:" -ForegroundColor White
Write-Host "   https://supabase.com/dashboard/project/ymuzggvvslpxaabozmck/sql/new" -ForegroundColor Green
Write-Host ""
Write-Host "2. Cole o SQL abaixo:" -ForegroundColor White
Write-Host ""

$sql = Get-Content -Path "create_assessment_type_items_table.sql" -Raw
Write-Host $sql -ForegroundColor Gray

Write-Host ""
Write-Host "3. Clique em 'Run' para executar" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pressione qualquer tecla para copiar o SQL..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Set-Clipboard -Value $sql
Write-Host ""
Write-Host "✓ SQL copiado para a área de transferência!" -ForegroundColor Green
Write-Host "  Cole no SQL Editor do Supabase e execute." -ForegroundColor White
Write-Host ""
