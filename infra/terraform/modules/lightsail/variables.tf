# Lightsail Module Variables

variable "instance_name" {
  description = "Name of the Lightsail instance"
  type        = string
}

variable "availability_zone" {
  description = "Availability zone for the Lightsail instance (e.g., us-east-1a)"
  type        = string
}

variable "blueprint_id" {
  description = "Blueprint ID for the Lightsail instance (OS image)"
  type        = string
  default     = "ubuntu_22_04"
}

variable "bundle_id" {
  description = "Bundle ID for the Lightsail instance (size/resources)"
  type        = string
  default     = "nano_2_0" # $3.50/month: 512 MB RAM, 1 vCPU, 20 GB SSD
}

variable "ssh_public_key" {
  description = "SSH public key for accessing the instance"
  type        = string
}

variable "tags" {
  description = "Tags to apply to Lightsail resources"
  type        = map(string)
  default     = {}
}
