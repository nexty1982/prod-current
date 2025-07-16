# OrthodoxMetrics Script Runner - PowerShell CLI
# This script allows system administrators to execute server scripts via REST API

param(
    [Parameter(Mandatory=$true)]
    [string]$ServerUrl = "http://192.168.1.239:3001",
    
    [Parameter(Mandatory=$true)]
    [string]$ScriptName,
    
    [Parameter(Mandatory=$false)]
    [string]$Username,
    
    [Parameter(Mandatory=$false)]
    [string]$Password,
    
    [Parameter(Mandatory=$false)]
    [switch]$ListScripts,
    
    [Parameter(Mandatory=$false)]
    [switch]$ShowLogs
)

# Available scripts
$AvailableScripts = @(
    "convertOCR",
    "maintenance", 
    "checkPermissions",
    "debugChurches",
    "testApiRoutes",
    "fixDatabaseTables"
)

function Show-Help {
    Write-Host "OrthodoxMetrics Script Runner - PowerShell CLI" -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\RunScript.ps1 -ServerUrl 'http://192.168.1.239:3001' -ScriptName 'maintenance' -Username 'admin@example.com' -Password 'password'"
    Write-Host ""
    Write-Host "Parameters:" -ForegroundColor Yellow
    Write-Host "  -ServerUrl      Base URL of the OrthodoxMetrics server"
    Write-Host "  -ScriptName     Name of the script to execute"
    Write-Host "  -Username       Admin username (email)"
    Write-Host "  -Password       Admin password"
    Write-Host "  -ListScripts    List available scripts"
    Write-Host "  -ShowLogs       Show recent execution logs (super_admin only)"
    Write-Host ""
    Write-Host "Available Scripts:" -ForegroundColor Yellow
    foreach ($script in $AvailableScripts) {
        Write-Host "  - $script" -ForegroundColor Cyan
    }
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  # List available scripts"
    Write-Host "  .\RunScript.ps1 -ServerUrl 'http://192.168.1.239:3001' -ListScripts"
    Write-Host ""
    Write-Host "  # Run database maintenance"
    Write-Host "  .\RunScript.ps1 -ServerUrl 'http://192.168.1.239:3001' -ScriptName 'maintenance' -Username 'admin@example.com' -Password 'password'"
    Write-Host ""
    Write-Host "  # Show execution logs"
    Write-Host "  .\RunScript.ps1 -ServerUrl 'http://192.168.1.239:3001' -ShowLogs -Username 'super@example.com' -Password 'password'"
    Write-Host ""
}

function Get-AuthSession {
    param($ServerUrl, $Username, $Password)
    
    try {
        $loginBody = @{
            email = $Username
            password = $Password
        } | ConvertTo-Json
        
        $loginResponse = Invoke-RestMethod -Uri "$ServerUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -SessionVariable 'session'
        
        if ($loginResponse.success) {
            Write-Host "✅ Authentication successful" -ForegroundColor Green
            return $session
        } else {
            throw "Authentication failed: $($loginResponse.error)"
        }
    } catch {
        Write-Host "❌ Authentication failed: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

function Get-AvailableScripts {
    param($ServerUrl, $Session)
    
    try {
        $response = Invoke-RestMethod -Uri "$ServerUrl/api/scripts" -Method GET -WebSession $Session
        
        if ($response.success) {
            Write-Host "📋 Available Scripts:" -ForegroundColor Green
            Write-Host "===================" -ForegroundColor Green
            
            foreach ($script in $response.scripts) {
                Write-Host ""
                Write-Host "Script ID: $($script.id)" -ForegroundColor Cyan
                Write-Host "Name: $($script.name)" -ForegroundColor Yellow
                Write-Host "Description: $($script.description)" -ForegroundColor Gray
                Write-Host "Timeout: $([math]::Round($script.timeout / 1000))s" -ForegroundColor Gray
            }
            
            Write-Host ""
            Write-Host "Total: $($response.count) scripts available" -ForegroundColor Green
        } else {
            throw "Failed to list scripts: $($response.error)"
        }
    } catch {
        Write-Host "❌ Failed to list scripts: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Invoke-Script {
    param($ServerUrl, $Session, $ScriptName)
    
    try {
        Write-Host "🚀 Executing script: $ScriptName" -ForegroundColor Yellow
        
        $requestBody = @{
            scriptName = $ScriptName
            args = @()
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$ServerUrl/api/run-script" -Method POST -Body $requestBody -ContentType "application/json" -WebSession $Session
        
        if ($response.success) {
            Write-Host "✅ Script executed successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Script: $($response.scriptName)" -ForegroundColor Cyan
            Write-Host "Execution Time: $($response.executionTime)" -ForegroundColor Gray
            Write-Host ""
            
            if ($response.stdout) {
                Write-Host "📄 Output:" -ForegroundColor Yellow
                Write-Host "----------" -ForegroundColor Yellow
                Write-Host $response.stdout -ForegroundColor White
            }
            
            if ($response.stderr) {
                Write-Host "⚠️  Error Output:" -ForegroundColor Red
                Write-Host "----------------" -ForegroundColor Red
                Write-Host $response.stderr -ForegroundColor Red
            }
        } else {
            throw "Script execution failed: $($response.error)"
        }
    } catch {
        Write-Host "❌ Script execution failed: $($_.Exception.Message)" -ForegroundColor Red
        
        # Try to parse error response
        if ($_.Exception.Response) {
            try {
                $errorStream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($errorStream)
                $errorBody = $reader.ReadToEnd() | ConvertFrom-Json
                
                if ($errorBody.error) {
                    Write-Host "Error Details: $($errorBody.error)" -ForegroundColor Red
                }
                if ($errorBody.code) {
                    Write-Host "Error Code: $($errorBody.code)" -ForegroundColor Red
                }
            } catch {
                # Ignore JSON parsing errors
            }
        }
    }
}

function Get-ExecutionLogs {
    param($ServerUrl, $Session)
    
    try {
        $response = Invoke-RestMethod -Uri "$ServerUrl/api/script-logs?limit=10" -Method GET -WebSession $Session
        
        if ($response.success) {
            Write-Host "📜 Recent Execution Logs:" -ForegroundColor Green
            Write-Host "========================" -ForegroundColor Green
            
            if ($response.logs.Count -eq 0) {
                Write-Host "No execution logs found" -ForegroundColor Gray
            } else {
                foreach ($log in $response.logs) {
                    Write-Host $log.rawLine -ForegroundColor White
                }
                
                Write-Host ""
                Write-Host "Total: $($response.count) log entries" -ForegroundColor Green
            }
        } else {
            throw "Failed to retrieve logs: $($response.error)"
        }
    } catch {
        Write-Host "❌ Failed to retrieve logs: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Main execution
if (-not $ListScripts -and -not $ShowLogs -and -not $ScriptName) {
    Show-Help
    exit 1
}

# Validate script name if provided
if ($ScriptName -and $ScriptName -notin $AvailableScripts) {
    Write-Host "❌ Invalid script name: $ScriptName" -ForegroundColor Red
    Write-Host "Available scripts: $($AvailableScripts -join ', ')" -ForegroundColor Yellow
    exit 1
}

# Get credentials if not provided
if ((-not $Username -or -not $Password) -and (-not $ListScripts)) {
    if (-not $Username) {
        $Username = Read-Host "Enter username (email)"
    }
    if (-not $Password) {
        $securePassword = Read-Host "Enter password" -AsSecureString
        $Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword))
    }
}

# Authenticate if credentials provided
$session = $null
if ($Username -and $Password) {
    $session = Get-AuthSession -ServerUrl $ServerUrl -Username $Username -Password $Password
    
    if (-not $session) {
        Write-Host "❌ Cannot proceed without authentication" -ForegroundColor Red
        exit 1
    }
}

# Execute requested action
if ($ListScripts) {
    if ($session) {
        Get-AvailableScripts -ServerUrl $ServerUrl -Session $session
    } else {
        Write-Host "📋 Available Scripts (from configuration):" -ForegroundColor Green
        Write-Host "==========================================" -ForegroundColor Green
        foreach ($script in $AvailableScripts) {
            Write-Host "  - $script" -ForegroundColor Cyan
        }
    }
} elseif ($ShowLogs) {
    if ($session) {
        Get-ExecutionLogs -ServerUrl $ServerUrl -Session $session
    } else {
        Write-Host "❌ Authentication required to view execution logs" -ForegroundColor Red
        exit 1
    }
} elseif ($ScriptName) {
    if ($session) {
        Invoke-Script -ServerUrl $ServerUrl -Session $session -ScriptName $ScriptName
    } else {
        Write-Host "❌ Authentication required to execute scripts" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Script execution completed." -ForegroundColor Green
