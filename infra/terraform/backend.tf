# Backend Configuration for Terraform State
#
# This file configures remote state storage using S3 and DynamoDB for state locking.
#
# IMPORTANT: Before using this backend, you must:
# 1. Create the S3 bucket and DynamoDB table (see bootstrap script below)
# 2. Uncomment the backend configuration block
# 3. Run `terraform init` to migrate local state to remote
#
# Bootstrap Script:
# Run this once to create the required AWS resources:
#
# aws s3api create-bucket \
#   --bucket zero-friction-budget-terraform-state \
#   --region us-east-1 \
#   --create-bucket-configuration LocationConstraint=us-east-1
#
# aws s3api put-bucket-versioning \
#   --bucket zero-friction-budget-terraform-state \
#   --versioning-configuration Status=Enabled
#
# aws s3api put-bucket-encryption \
#   --bucket zero-friction-budget-terraform-state \
#   --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
#
# aws dynamodb create-table \
#   --table-name zero-friction-budget-terraform-locks \
#   --attribute-definitions AttributeName=LockID,AttributeType=S \
#   --key-schema AttributeName=LockID,KeyType=HASH \
#   --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
#   --region us-east-1

# Uncomment this block after bootstrapping:
# terraform {
#   backend "s3" {
#     bucket         = "zero-friction-budget-terraform-state"
#     key            = "terraform.tfstate"
#     region         = "us-east-1"
#     dynamodb_table = "zero-friction-budget-terraform-locks"
#     encrypt        = true
#   }
# }
