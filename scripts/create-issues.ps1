# Creates GitHub labels and issues from the planned TODO items.
#
# Prerequisites:
#   1. Install GitHub CLI:  winget install --id GitHub.cli
#   2. Authenticate:        gh auth login
#
# Usage (from repo root):
#   Preview without creating anything:
#     powershell -ExecutionPolicy Bypass -File .\scripts\create-issues.ps1 -DryRun
#   Actually create the labels and issues:
#     powershell -ExecutionPolicy Bypass -File .\scripts\create-issues.ps1

param([switch]$DryRun)

$ErrorActionPreference = "Stop"

function New-IssueSafe {
    param([string]$Title, [string]$Body, [string[]]$Labels)
    $labelArg = ($Labels -join ",")
    if ($DryRun) {
        Write-Host "[dry-run] $Title  (labels: $labelArg)"
        return
    }
    gh issue create --title $Title --body $Body --label $labelArg
}

# --- Labels ---------------------------------------------------------------
# Create labels (ignore errors if they already exist)
$labels = @(
    @{ name = "frontend";        color = "1d76db"; desc = "React / UI work" },
    @{ name = "backend";         color = "0e8a16"; desc = ".NET API work" },
    @{ name = "enhancement";     color = "a2eeef"; desc = "New feature or improvement" },
    @{ name = "refactor";        color = "fbca04"; desc = "Code cleanup / restructuring" },
    @{ name = "good first issue"; color = "7057ff"; desc = "Good for newcomers" }
)
foreach ($l in $labels) {
    if ($DryRun) {
        Write-Host "[dry-run] label: $($l.name)"
        continue
    }
    try { gh label create $l.name --color $l.color --description $l.desc 2>$null } catch {}
}

# --- Frontend issues ------------------------------------------------------
New-IssueSafe "Add client-side form validation (non-admin pages)" "Add client-side form validation to stop invalid data from reaching the backend. Admin side (menu, categories, staff, tables, reports) is already done; cover the remaining pages." @("frontend","enhancement")
New-IssueSafe "Cashier: add a detailed transactions view section" "Add a section on the Cashier page to view detailed transactions." @("frontend","enhancement")
New-IssueSafe "Cashier: fix the statistics cards" "The stat cards on the Cashier page need fixing." @("frontend")
New-IssueSafe "Reports: fill in the Reports page content" "The Reports page is currently empty; populate it with real reporting content." @("frontend","enhancement")
New-IssueSafe "Add a dedicated profile page" "There is no profile section yet; add a dedicated profile page." @("frontend","enhancement")
New-IssueSafe "POS: fix action buttons (e.g. Confirm)" "Action buttons such as Confirm on the POS page do not work correctly." @("frontend")
New-IssueSafe "POS: remove payment section and integrate with Cashier" "Remove the payment-taking section from the POS page and integrate it with the Cashier page." @("frontend","refactor")
New-IssueSafe "POS: make the page fully mobile-responsive" "The POS page UI is not mobile-friendly; make it fully responsive." @("frontend","enhancement")
New-IssueSafe "POS: fix non-working trash icon under the New tab" "The trash icon under the 'New' tab in the orders section does not work." @("frontend","good first issue")
New-IssueSafe "POS: reposition the Back to Tables icon" "The 'Back to Tables' icon is in an awkward position; review its placement." @("frontend","good first issue")
New-IssueSafe "Replace two-state status selects with on/off sliders" "Where a status has only two states, replace the select with an on/off slider." @("frontend","enhancement","good first issue")
New-IssueSafe "Add a configurable VAT-rate field" "Add a configurable VAT-rate setting." @("frontend","enhancement")
New-IssueSafe "Review page/folder organization" "Review front-end page/folder structure (e.g. single-file AdminPage vs. multi-file Kitchen)." @("frontend","refactor")

# --- Backend issues -------------------------------------------------------
New-IssueSafe "Review and complete backend validation rules" "Review existing backend validation rules and implement the missing business rules." @("backend")
New-IssueSafe "Move from anemic model toward a rich domain model" "Refactor entities from an anemic model toward a richer domain model." @("backend","refactor")
New-IssueSafe "Add more domain exception types" "Add more domain exception types and broaden coverage." @("backend","refactor")
New-IssueSafe "Review and optimize DTOs and AutoMapper configs" "Review incoming DTOs and AutoMapper configurations and optimize them." @("backend","refactor")
New-IssueSafe "Introduce a lightweight RestaurantDto for name-only needs" "Currently the full restaurant entity is sent just to render the header. Introduce a lightweight RestaurantDto for name-only needs." @("backend","refactor")
New-IssueSafe "Rename generic Update to UpdateTable in table operations" "Rename the generic Update method in table operations to UpdateTable for naming consistency." @("backend","refactor","good first issue")
New-IssueSafe "Optimize DeleteCategoryCommandHandler logic" "Review and optimize the business logic inside DeleteCategoryCommandHandler." @("backend","refactor")
New-IssueSafe "Guarantee restaurantId via JWT middleware in query handlers" "Guarantee restaurantId through JWT middleware and remove the 'restaurantId <= 0' checks from query handlers." @("backend","refactor")
New-IssueSafe "Review the overall caching strategy" "Review the overall backend caching strategy." @("backend","refactor")
New-IssueSafe "Cashier: model tip as a separate transaction field" "Handle the tip as a separate field in the transaction model." @("backend","enhancement")
New-IssueSafe "Order: validate per-item status changes on the backend" "Per-item order status changes should also be validated on the backend." @("backend")
New-IssueSafe "Notify & redirect user when admin changes their role" "When an admin changes a logged-in user's role, notify and redirect that user to the login page." @("backend","frontend","enhancement")

Write-Host "Done. Visit https://github.com/fatihkayaci/RestaurantBill/issues"
