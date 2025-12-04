# Development Environment Configuration

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment after bootstrapping remote state
  # backend "s3" {
  #   bucket         = "zero-friction-budget-terraform-state"
  #   key            = "dev/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "zero-friction-budget-terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "zero-friction-budget"
      Environment = "dev"
      ManagedBy   = "terraform"
    }
  }
}

# Lightsail Instance Module
module "lightsail" {
  source = "../../modules/lightsail"

  instance_name     = var.instance_name
  availability_zone = var.availability_zone
  blueprint_id      = var.blueprint_id
  bundle_id         = var.bundle_id
  ssh_public_key    = var.ssh_public_key

  tags = {
    Environment = "dev"
    Terraform   = "true"
  }
}

# ECR Module (Optional - uncomment if you want to use ECR instead of GHCR)
# module "ecr" {
#   source = "../../modules/ecr"
#
#   project_name            = "zero-friction-budget-dev"
#   scan_on_push            = true
#   image_retention_count   = 3
#   untagged_retention_days = 3
#
#   tags = {
#     Environment = "dev"
#     Terraform   = "true"
#   }
# }
