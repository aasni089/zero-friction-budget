# ECR Module Variables

variable "project_name" {
  description = "Name of the project (used as prefix for repository names)"
  type        = string
}

variable "scan_on_push" {
  description = "Enable image scanning on push"
  type        = bool
  default     = true
}

variable "image_retention_count" {
  description = "Number of tagged images to retain"
  type        = number
  default     = 5
}

variable "untagged_retention_days" {
  description = "Number of days to retain untagged images"
  type        = number
  default     = 7
}

variable "tags" {
  description = "Tags to apply to ECR resources"
  type        = map(string)
  default     = {}
}
