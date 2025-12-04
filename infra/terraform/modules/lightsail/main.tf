# Lightsail Module for Zero Friction Budget
#
# This module provisions:
# - Lightsail instance with Docker pre-installed
# - Static IP address
# - SSH key pair
# - Firewall rules for HTTP/HTTPS/SSH

# SSH Key Pair
resource "aws_lightsail_key_pair" "main" {
  name       = "${var.instance_name}-key"
  public_key = var.ssh_public_key
}

# Lightsail Instance
resource "aws_lightsail_instance" "main" {
  name              = var.instance_name
  availability_zone = var.availability_zone
  blueprint_id      = var.blueprint_id
  bundle_id         = var.bundle_id
  key_pair_name     = aws_lightsail_key_pair.main.name

  user_data = <<-EOF
    #!/bin/bash
    set -e

    # Update system
    apt-get update
    apt-get upgrade -y

    # Install Docker
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh

    # Install Docker Compose
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose

    # Add ubuntu user to docker group
    usermod -aG docker ubuntu

    # Enable Docker service
    systemctl enable docker
    systemctl start docker

    # Install useful tools
    apt-get install -y git curl wget vim htop unzip

    # Create deployment directory
    mkdir -p /home/ubuntu/app
    chown -R ubuntu:ubuntu /home/ubuntu/app

    # Log completion
    echo "User data script completed at $(date)" >> /var/log/user-data.log
  EOF

  tags = var.tags
}

# Static IP
resource "aws_lightsail_static_ip" "main" {
  name = "${var.instance_name}-ip"
}

# Attach Static IP to Instance
resource "aws_lightsail_static_ip_attachment" "main" {
  static_ip_name = aws_lightsail_static_ip.main.name
  instance_name  = aws_lightsail_instance.main.name
}

# Firewall Rules
resource "aws_lightsail_instance_public_ports" "main" {
  instance_name = aws_lightsail_instance.main.name

  # SSH
  port_info {
    protocol  = "tcp"
    from_port = 22
    to_port   = 22
    cidrs     = ["0.0.0.0/0"]
  }

  # HTTP
  port_info {
    protocol  = "tcp"
    from_port = 80
    to_port   = 80
    cidrs     = ["0.0.0.0/0"]
  }

  # HTTPS
  port_info {
    protocol  = "tcp"
    from_port = 443
    to_port   = 443
    cidrs     = ["0.0.0.0/0"]
  }
}
