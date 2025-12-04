# Lightsail Module Outputs

output "instance_id" {
  description = "ID of the Lightsail instance"
  value       = aws_lightsail_instance.main.id
}

output "instance_name" {
  description = "Name of the Lightsail instance"
  value       = aws_lightsail_instance.main.name
}

output "instance_arn" {
  description = "ARN of the Lightsail instance"
  value       = aws_lightsail_instance.main.arn
}

output "instance_public_ip" {
  description = "Public IP address of the Lightsail instance"
  value       = aws_lightsail_static_ip.main.ip_address
}

output "instance_private_ip" {
  description = "Private IP address of the Lightsail instance"
  value       = aws_lightsail_instance.main.private_ip_address
}

output "instance_username" {
  description = "Default username for SSH access"
  value       = "ubuntu"
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh ubuntu@${aws_lightsail_static_ip.main.ip_address}"
}
