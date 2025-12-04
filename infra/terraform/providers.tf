provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "zero-friction-budget"
      ManagedBy   = "terraform"
      Environment = var.environment
    }
  }
}
