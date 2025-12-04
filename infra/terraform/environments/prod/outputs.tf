# Production Environment Outputs

output "lightsail_instance_id" {
  description = "ID of the Lightsail instance"
  value       = module.lightsail.instance_id
}

output "lightsail_instance_name" {
  description = "Name of the Lightsail instance"
  value       = module.lightsail.instance_name
}

output "lightsail_public_ip" {
  description = "Public IP address of the Lightsail instance"
  value       = module.lightsail.instance_public_ip
}

output "lightsail_private_ip" {
  description = "Private IP address of the Lightsail instance"
  value       = module.lightsail.instance_private_ip
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = module.lightsail.ssh_command
}

output "deployment_info" {
  description = "Deployment information"
  value = {
    environment = "prod"
    public_ip   = module.lightsail.instance_public_ip
    ssh_user    = module.lightsail.instance_username
    instance    = module.lightsail.instance_name
    domain      = var.domain_name != "" ? var.domain_name : "not configured"
  }
}

output "dns_configuration" {
  description = "DNS configuration instructions"
  value = var.domain_name != "" ? "Configure your DNS A record: ${var.domain_name} -> ${module.lightsail.instance_public_ip}" : "No domain configured"
}

# Uncomment if using ECR module
# output "ecr_backend_repository" {
#   description = "Backend ECR repository URL"
#   value       = module.ecr.backend_repository_url
# }
#
# output "ecr_frontend_repository" {
#   description = "Frontend ECR repository URL"
#   value       = module.ecr.frontend_repository_url
# }
#
# output "ecr_login_command" {
#   description = "Docker login command for ECR"
#   value       = module.ecr.docker_login_command
#   sensitive   = true
# }
