# new-content.ps1 - Create new content
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("post", "project", "experiment")]
    [string]$Type,
    
    [Parameter(Mandatory=$true)]
    [string]$Title,
    
    [switch]$OpenInVSCode
)

$slug = $Title.ToLower() -replace '[^\w\s-]', '' -replace '\s+', '-'

$path = switch ($Type) {
    "post" { "content/make/words/$slug.md" }
    "project" { "content/learn/built/$slug.md" }
    "experiment" { "content/make/visuals/$slug.md" }
}

hugo new $path

if ($OpenInVSCode) {
    code $path
}

Write-Host "Created: $path" -ForegroundColor Green