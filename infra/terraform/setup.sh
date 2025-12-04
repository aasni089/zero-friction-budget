#!/bin/bash
# Terraform Setup Script for Zero Friction Budget
# This script helps you get started with Terraform quickly

set -e

echo "🚀 Zero Friction Budget - Terraform Setup"
echo "=========================================="
echo ""

# Check if terraform is installed
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform is not installed!"
    echo ""
    echo "Please install Terraform first:"
    echo "  macOS:        brew install terraform"
    echo "  Ubuntu/Debian: See README.md for instructions"
    echo ""
    exit 1
fi

echo "✅ Terraform is installed: $(terraform --version | head -n1)"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "⚠️  AWS CLI is not installed!"
    echo ""
    echo "Please install AWS CLI first:"
    echo "  macOS:        brew install awscli"
    echo "  Ubuntu/Debian: sudo apt install awscli"
    echo ""
    exit 1
fi

echo "✅ AWS CLI is installed: $(aws --version)"
echo ""

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials are not configured!"
    echo ""
    echo "Please configure AWS credentials first:"
    echo "  aws configure"
    echo ""
    exit 1
fi

echo "✅ AWS credentials are configured"
echo ""

# Prompt for environment
echo "Which environment do you want to setup?"
echo "  1) Development (dev)"
echo "  2) Production (prod)"
read -p "Enter choice [1-2]: " env_choice

if [ "$env_choice" = "1" ]; then
    ENV="dev"
elif [ "$env_choice" = "2" ]; then
    ENV="prod"
else
    echo "❌ Invalid choice!"
    exit 1
fi

echo ""
echo "Setting up $ENV environment..."
echo ""

# Navigate to environment directory
cd "environments/$ENV"

# Check if terraform.tfvars exists
if [ -f "terraform.tfvars" ]; then
    echo "⚠️  terraform.tfvars already exists!"
    read -p "Do you want to overwrite it? [y/N]: " overwrite
    if [ "$overwrite" != "y" ] && [ "$overwrite" != "Y" ]; then
        echo "Skipping terraform.tfvars creation"
    else
        cp terraform.tfvars.example terraform.tfvars
        echo "✅ Created terraform.tfvars from example"
        echo ""
        echo "⚠️  IMPORTANT: Edit terraform.tfvars and add your SSH public key!"
        echo "   vim terraform.tfvars"
    fi
else
    cp terraform.tfvars.example terraform.tfvars
    echo "✅ Created terraform.tfvars from example"
    echo ""
    echo "⚠️  IMPORTANT: Edit terraform.tfvars and add your SSH public key!"
    echo "   vim terraform.tfvars"
fi

echo ""
read -p "Have you updated terraform.tfvars with your SSH key? [y/N]: " updated

if [ "$updated" != "y" ] && [ "$updated" != "Y" ]; then
    echo ""
    echo "Please update terraform.tfvars with your SSH key before continuing"
    echo "Generate SSH key: ssh-keygen -t ed25519 -C \"your_email@example.com\""
    echo "Get public key:   cat ~/.ssh/id_ed25519.pub"
    echo ""
    exit 0
fi

echo ""
echo "Initializing Terraform..."
terraform init

echo ""
echo "Validating Terraform configuration..."
terraform validate

echo ""
echo "Formatting Terraform files..."
terraform fmt -recursive

echo ""
echo "✅ Terraform setup complete!"
echo ""
echo "Next steps:"
echo "  1. Review the plan:  terraform plan"
echo "  2. Apply changes:    terraform apply"
echo "  3. View outputs:     terraform output"
echo ""
echo "For more information, see README.md"
