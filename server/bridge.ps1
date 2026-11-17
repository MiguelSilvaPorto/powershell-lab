$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
$WarningPreference = 'Continue'
$InformationPreference = 'Continue'

try { $PSStyle.OutputRendering = 'PlainText' } catch {}

$utf8 = [System.Text.UTF8Encoding]::new($false)
[Console]::InputEncoding = $utf8
[Console]::OutputEncoding = $utf8

function Write-BridgePayload {
  param([Parameter(Mandatory = $true)] $Payload)
  $json = $Payload | ConvertTo-Json -Compress -Depth 5
  [Console]::Out.WriteLine($json)
  [Console]::Out.Flush()
}

while ($true) {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line) { break }
  if ([string]::IsNullOrWhiteSpace($line)) { continue }

  $id = ''
  try {
    $request = $line | ConvertFrom-Json
    $id = [string]$request.id
    $script = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String([string]$request.script))

    $global:LASTEXITCODE = 0
    $output = @()
    $ok = $true

    try {
      $scriptBlock = [ScriptBlock]::Create($script)
      $output = @(. $scriptBlock *>&1)
      $errorRecords = @($output | Where-Object { $_ -is [System.Management.Automation.ErrorRecord] })
      $ok = $errorRecords.Count -eq 0
    } catch {
      $ok = $false
      $output += $_
    }

    $exitCode = 0
    if ($null -ne $LASTEXITCODE) { $exitCode = [int]$LASTEXITCODE }
    if (-not $ok -and $exitCode -eq 0) { $exitCode = 1 }

    $display = foreach ($item in $output) {
      if ($item -is [System.Management.Automation.ErrorRecord]) {
        $activity = $item.CategoryInfo.Activity
        $message = $item.Exception.Message
        if ($activity) { "$activity`: $message" } else { $message }
      } else {
        $item
      }
    }
    $text = ($display | Out-String -Width 220).TrimEnd()
    if ($text.Length -gt 160000) {
      $text = $text.Substring(0, 160000) + "`n[saída truncada pelo PS Lab]"
    }

    Write-BridgePayload ([ordered]@{
      id       = $id
      ok       = [bool]$ok
      output   = $text
      cwd      = (Get-Location).Path
      exitCode = $exitCode
      kind     = 'result'
    })
  } catch {
    $message = ($_ | Out-String).Trim()
    Write-BridgePayload ([ordered]@{
      id       = $id
      ok       = $false
      output   = ''
      error    = $message
      cwd      = (Get-Location).Path
      exitCode = 1
      kind     = 'bridge-error'
    })
  }
}
