#!/bin/bash

# Setup Branch Protection for expense-svc
# This script configures branch protection rules for the master branch
# Requires: GitHub CLI (gh) to be installed and authenticated

set -e

echo "🛡️ Setting up branch protection for expense-svc repository..."

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "📥 Please install it from: https://cli.github.com/"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ You are not authenticated with GitHub CLI."
    echo "🔑 Please run: gh auth login"
    exit 1
fi

# Get repository information
REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner')
echo "📁 Repository: $REPO"

# Check if we're in the right repository
if [[ "$REPO" != *"expense-svc"* ]]; then
    echo "⚠️ Warning: This doesn't appear to be the expense-svc repository."
    echo "   Current repo: $REPO"
    read -p "   Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Aborted by user."
        exit 1
    fi
fi

echo "🔧 Configuring branch protection rules for 'master' branch..."

# Configure branch protection rules
gh api repos/{owner}/{repo}/branches/master/protection \
    --method PUT \
    --field required_status_checks='{"strict":true,"contexts":["Code Formatting","Code Linting","Tests and Build","Branch Protection Checks","PR Metadata Check","Validate CI Configuration","Branch Protection Summary"]}' \
    --field enforce_admins=false \
    --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
    --field restrictions=null \
    --field required_linear_history=false \
    --field allow_force_pushes=false \
    --field allow_deletions=false \
    --field block_creations=false \
    --field required_conversation_resolution=true \
    2>/dev/null || {
    
    echo "⚠️ Failed to set protection rules via API. This might be because:"
    echo "   1. You don't have admin permissions on the repository"
    echo "   2. The branch doesn't exist yet"
    echo "   3. Some status checks haven't run yet"
    echo ""
    echo "📝 Manual setup required. Please follow these steps:"
    echo ""
    echo "1. Go to: https://github.com/$REPO/settings/branches"
    echo "2. Click 'Add rule' for the master branch"
    echo "3. Configure the following settings:"
    echo ""
    echo "   ✅ Require a pull request before merging"
    echo "      ✅ Require approvals: 1"
    echo "      ✅ Dismiss stale PR approvals when new commits are pushed"
    echo "      ✅ Require review from code owners"
    echo ""
    echo "   ✅ Require status checks to pass before merging"
    echo "      ✅ Require branches to be up to date before merging"
    echo "      ✅ Required status checks:"
    echo "         - Code Formatting"
    echo "         - Code Linting"
    echo "         - Tests and Build"
    echo "         - Branch Protection Checks"
    echo "         - PR Metadata Check"
    echo "         - Validate CI Configuration"
    echo "         - Branch Protection Summary"
    echo ""
    echo "   ✅ Require conversation resolution before merging"
    echo "   ✅ Restrict pushes that create files larger than 100MB"
    echo "   ✅ Do not allow bypassing the above settings"
    echo ""
    exit 1
}

echo "✅ Branch protection rules configured successfully!"
echo ""
echo "🔒 Master branch is now protected with:"
echo "   ✅ Pull requests required"
echo "   ✅ 1 approval required"
echo "   ✅ Status checks must pass"
echo "   ✅ Code owner reviews required"
echo "   ✅ Conversation resolution required"
echo "   ✅ Force pushes blocked"
echo ""
echo "📋 Next steps:"
echo "   1. Create a test PR to verify protection is working"
echo "   2. Ensure all team members understand the new workflow"
echo "   3. Update any CI/CD scripts that might push directly to master"
echo ""
echo "📖 For more details, see: docs/BRANCH_PROTECTION.md"
echo ""
echo "🎉 Branch protection setup complete!" 