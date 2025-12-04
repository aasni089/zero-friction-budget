# Terraform Infrastructure Guide

This document provides a quick overview of the Terraform infrastructure for Zero Friction Budget.

## Quick Links

- **Full Documentation**: [terraform/README.md](./terraform/README.md)
- **Setup Script**: Run `./terraform/setup.sh` for guided setup
- **Dev Environment**: [terraform/environments/dev/](./terraform/environments/dev/)
- **Prod Environment**: [terraform/environments/prod/](./terraform/environments/prod/)

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         AWS Lightsail Instance          │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │   Nginx Reverse Proxy (SSL)     │   │
│  └──────────────┬──────────────────┘   │
│                 │                       │
│  ┌──────────────┴──────────────────┐   │
│  │  Frontend (Next.js Container)   │   │
│  │  Port: 3000                      │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Backend (Express Container)    │   │
│  │  Port: 4000                      │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Static IP: xxx.xxx.xxx.xxx            │
│  Ports: 22 (SSH), 80 (HTTP), 443 (SSL) │
└─────────────────────────────────────────┘
              │
              │ External Database
              ▼
    ┌─────────────────────┐
    │  Supabase (PostgreSQL) │
    └─────────────────────┘
```

## Cost Breakdown

| Environment | Instance Type | Cost/Month | Specs                      |
|-------------|---------------|------------|----------------------------|
| Development | nano_2_0      | $3.50      | 512 MB RAM, 1 vCPU, 20 GB |
| Production  | small_2_0     | $5.00      | 1 GB RAM, 1 vCPU, 40 GB   |

**Total Monthly Cost**: ~$3.50-5.00 (for 3-10 users)

## Quick Start

### Prerequisites

1. **Install Terraform** (>= 1.5.0)
   ```bash
   # macOS
   brew install terraform

   # Ubuntu/Debian
   # See terraform/README.md for full instructions
   ```

2. **Configure AWS CLI**
   ```bash
   aws configure
   # Enter your AWS credentials
   ```

3. **Generate SSH Key**
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```

### Deploy Infrastructure

```bash
# Run the setup script
cd infra/terraform
./setup.sh

# Follow the prompts to setup dev or prod environment

# Or manually:
cd infra/terraform/environments/dev
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your SSH key
terraform init
terraform plan
terraform apply
```

## What Gets Created

### Lightsail Resources

1. **Instance** (`aws_lightsail_instance`)
   - Ubuntu 22.04 LTS
   - Docker and Docker Compose pre-installed
   - Automatic security updates enabled

2. **Static IP** (`aws_lightsail_static_ip`)
   - Persistent public IP address
   - Survives instance restarts
   - Free when attached

3. **SSH Key Pair** (`aws_lightsail_key_pair`)
   - Secure SSH access
   - Your public key registered

4. **Firewall Rules** (`aws_lightsail_instance_public_ports`)
   - Port 22: SSH
   - Port 80: HTTP
   - Port 443: HTTPS

### Optional ECR Resources

If enabled (uncomment in main.tf):

1. **Backend Repository** (`aws_ecr_repository.backend`)
2. **Frontend Repository** (`aws_ecr_repository.frontend`)
3. **Lifecycle Policies** (keep last 5 images)

**Note**: ECR costs money. Use GitHub Container Registry (GHCR) for free instead!

## Common Commands

```bash
# Navigate to environment
cd infra/terraform/environments/dev  # or prod

# Initialize
terraform init

# See what will change
terraform plan

# Apply changes
terraform apply

# View outputs
terraform output
terraform output lightsail_public_ip

# Connect via SSH
ssh ubuntu@$(terraform output -raw lightsail_public_ip)

# Destroy everything (careful!)
terraform destroy
```

## Environment Variables

Each environment has its own `terraform.tfvars` file (not committed):

```hcl
# Required
ssh_public_key    = "ssh-ed25519 AAAAC3..."
aws_region        = "us-east-1"
instance_name     = "zfb-dev"
availability_zone = "us-east-1a"
bundle_id         = "nano_2_0"

# Optional (prod only)
domain_name = "budget.yourdomain.com"
```

## Remote State (Recommended)

For team collaboration, enable remote state:

```bash
# Bootstrap S3 + DynamoDB (once)
cd infra/terraform
# See backend.tf for bootstrap commands

# Enable remote state
# Uncomment backend block in main.tf
terraform init -migrate-state
```

## Security Notes

- ✅ All state files encrypted at rest (AES256)
- ✅ DynamoDB state locking prevents conflicts
- ✅ terraform.tfvars excluded from git
- ✅ SSH keys never stored in Terraform state
- ✅ Automatic security updates enabled on instance
- ⚠️  Restrict SSH access to your IP for production

## Troubleshooting

See [terraform/README.md#troubleshooting](./terraform/README.md#troubleshooting) for detailed troubleshooting guide.

### Quick Checks

```bash
# Verify AWS credentials
aws sts get-caller-identity

# Check instance status
aws lightsail get-instance --instance-name zfb-dev

# View instance logs
aws lightsail get-instance-access-details --instance-name zfb-dev

# SSH with debug
ssh -v ubuntu@<instance-ip>
```

## Next Steps After Infrastructure Deployment

1. **Deploy Application**
   - Use GitHub Actions CI/CD
   - Or manually: `scp` docker-compose.yml and deploy

2. **Configure DNS**
   - Point your domain A record to the static IP
   - Example: `budget.yourdomain.com -> xxx.xxx.xxx.xxx`

3. **Setup SSL**
   - Certbot is configured in docker-compose
   - Run: `docker-compose run certbot`

4. **Configure Environment Variables**
   - Copy `.env.example` files on the instance
   - Add Supabase credentials
   - Set JWT secrets

5. **Start Services**
   ```bash
   ssh ubuntu@<instance-ip>
   cd /home/ubuntu/app
   docker-compose up -d
   ```

## Module Documentation

### Lightsail Module

**Location**: `modules/lightsail/`

**Inputs**:
- `instance_name`: Name for the Lightsail instance
- `availability_zone`: AWS availability zone
- `blueprint_id`: OS image (default: ubuntu_22_04)
- `bundle_id`: Instance size (default: nano_2_0)
- `ssh_public_key`: Your SSH public key
- `tags`: Resource tags

**Outputs**:
- `instance_id`: Lightsail instance ID
- `instance_public_ip`: Static public IP
- `instance_private_ip`: Private IP address
- `ssh_command`: Ready-to-use SSH command

### ECR Module (Optional)

**Location**: `modules/ecr/`

**Inputs**:
- `project_name`: Project name prefix
- `scan_on_push`: Enable vulnerability scanning
- `image_retention_count`: Number of images to keep
- `untagged_retention_days`: Days to keep untagged images
- `tags`: Resource tags

**Outputs**:
- `backend_repository_url`: Backend ECR URL
- `frontend_repository_url`: Frontend ECR URL
- `docker_login_command`: ECR authentication command

## CI/CD Integration

The Terraform configuration is designed to work with:

- **GitHub Actions**: For automated deployments
- **GitLab CI**: Alternative CI/CD platform
- **Manual Deployment**: Via SSH and docker-compose

See Task 6.3 for full CI/CD pipeline setup.

## Resources

- [AWS Lightsail Pricing](https://aws.amazon.com/lightsail/pricing/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Terraform Best Practices](https://www.terraform-best-practices.com/)
- [AWS Lightsail Documentation](https://docs.aws.amazon.com/lightsail/)

## Support

- **Project Issues**: [GitHub Issues](https://github.com/aasni089/zero-friction-budget/issues)
- **Terraform Questions**: Check full README in terraform/
- **AWS Support**: [AWS Support Center](https://console.aws.amazon.com/support/)
