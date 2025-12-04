# Zero Friction Budget - Terraform Infrastructure

This directory contains Terraform configuration for deploying Zero Friction Budget to AWS Lightsail.

## Overview

The infrastructure consists of:
- **Lightsail Instance**: Ubuntu 22.04 with Docker pre-installed
- **Static IP**: Persistent public IP address
- **Firewall Rules**: Ports 22 (SSH), 80 (HTTP), 443 (HTTPS)
- **SSH Key Pair**: For secure access
- **ECR Repositories** (Optional): Container image storage (GHCR recommended instead)

## Cost Estimate

### Development Environment
- Lightsail nano_2_0: **$3.50/month**
  - 512 MB RAM
  - 1 vCPU
  - 20 GB SSD storage
  - 1 TB data transfer
- Static IP: **$0** (free when attached)
- **Total: ~$3.50/month**

### Production Environment
- Lightsail small_2_0: **$5.00/month**
  - 1 GB RAM
  - 1 vCPU
  - 40 GB SSD storage
  - 2 TB data transfer
- Static IP: **$0** (free when attached)
- **Total: ~$5.00/month**

### Optional: ECR (Not Recommended)
- Storage: ~$0.10/GB/month
- Data transfer: ~$0.09/GB out
- **Recommendation**: Use GitHub Container Registry (GHCR) instead - it's free!

## Prerequisites

### 1. Install Required Tools

```bash
# Terraform (>= 1.5.0)
# macOS
brew install terraform

# Ubuntu/Debian
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform

# Verify installation
terraform --version
```

### 2. Configure AWS CLI

```bash
# Install AWS CLI
# macOS
brew install awscli

# Ubuntu/Debian
sudo apt install awscli

# Configure AWS credentials
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Default region: us-east-1
# Default output format: json

# Verify configuration
aws sts get-caller-identity
```

### 3. Generate SSH Key Pair

```bash
# Generate a new ED25519 SSH key (recommended)
ssh-keygen -t ed25519 -C "your_email@example.com" -f ~/.ssh/zfb-lightsail

# Or use RSA (if ED25519 not supported)
ssh-keygen -t rsa -b 4096 -C "your_email@example.com" -f ~/.ssh/zfb-lightsail

# Display your public key (copy this for terraform.tfvars)
cat ~/.ssh/zfb-lightsail.pub
```

## Initial Setup

### Step 1: Configure Environment

Choose your environment (dev or prod):

```bash
# Navigate to the environment directory
cd infra/terraform/environments/dev  # or prod

# Copy and edit terraform.tfvars
cp terraform.tfvars terraform.tfvars.example
vim terraform.tfvars
```

Edit `terraform.tfvars`:

```hcl
# Replace with your actual SSH public key
ssh_public_key = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJq... your_email@example.com"

# For production, optionally set your domain
domain_name = "budget.yourdomain.com"  # optional
```

**IMPORTANT**: Ensure `terraform.tfvars` is in `.gitignore` and never commit it!

### Step 2: Initialize Terraform

```bash
# Initialize Terraform (downloads providers)
terraform init

# Validate configuration
terraform validate

# Format configuration files
terraform fmt -recursive
```

### Step 3: Plan Infrastructure

```bash
# See what will be created
terraform plan

# Save plan to a file (optional)
terraform plan -out=tfplan
```

### Step 4: Deploy Infrastructure

```bash
# Apply the configuration
terraform apply

# Or apply the saved plan
terraform apply tfplan

# When prompted, type 'yes' to confirm
```

### Step 5: Get Output Information

```bash
# Show all outputs
terraform output

# Get specific output
terraform output lightsail_public_ip

# Get SSH command
terraform output ssh_command
```

### Step 6: Connect to Instance

```bash
# SSH into the instance
ssh -i ~/.ssh/zfb-lightsail ubuntu@$(terraform output -raw lightsail_public_ip)

# Verify Docker is installed
docker --version
docker-compose --version
```

## Remote State Backend (Recommended for Teams)

### Bootstrap Remote State

Run this **once** before enabling remote state:

```bash
# Create S3 bucket for state files
aws s3api create-bucket \
  --bucket zero-friction-budget-terraform-state \
  --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket zero-friction-budget-terraform-state \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket zero-friction-budget-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name zero-friction-budget-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region us-east-1
```

### Enable Remote State

After bootstrapping:

1. Uncomment the `backend "s3"` block in `main.tf`
2. Run `terraform init -migrate-state`
3. Confirm migration when prompted

## Common Operations

### Update Infrastructure

```bash
# Make changes to *.tf files or terraform.tfvars
# Plan changes
terraform plan

# Apply changes
terraform apply
```

### View Current State

```bash
# List all resources
terraform state list

# Show specific resource
terraform state show module.lightsail.aws_lightsail_instance.main

# Show outputs
terraform output
```

### Destroy Infrastructure

```bash
# Preview what will be destroyed
terraform plan -destroy

# Destroy all resources (WARNING: This is irreversible!)
terraform destroy

# Type 'yes' when prompted
```

### Refresh State

```bash
# Refresh state from actual infrastructure
terraform refresh

# Or use targeted refresh
terraform apply -refresh-only
```

## Directory Structure

```
infra/terraform/
├── backend.tf                    # Remote state configuration
├── providers.tf                  # AWS provider configuration
├── versions.tf                   # Provider version constraints
├── README.md                     # This file
├── environments/
│   ├── dev/                      # Development environment
│   │   ├── main.tf              # Dev environment config
│   │   ├── variables.tf         # Dev variables
│   │   ├── outputs.tf           # Dev outputs
│   │   └── terraform.tfvars     # Dev values (DO NOT COMMIT)
│   └── prod/                     # Production environment
│       ├── main.tf              # Prod environment config
│       ├── variables.tf         # Prod variables
│       ├── outputs.tf           # Prod outputs
│       └── terraform.tfvars     # Prod values (DO NOT COMMIT)
└── modules/
    ├── lightsail/               # Lightsail instance module
    │   ├── main.tf             # Lightsail resources
    │   ├── variables.tf        # Module inputs
    │   └── outputs.tf          # Module outputs
    └── ecr/                     # ECR repositories (optional)
        ├── main.tf             # ECR resources
        ├── variables.tf        # Module inputs
        └── outputs.tf          # Module outputs
```

## Available Lightsail Bundles

| Bundle ID    | Price/Month | RAM    | vCPU | Storage | Transfer | Use Case        |
|--------------|-------------|--------|------|---------|----------|-----------------|
| nano_2_0     | $3.50       | 512 MB | 1    | 20 GB   | 1 TB     | Dev/Testing     |
| micro_2_0    | $5.00       | 1 GB   | 1    | 40 GB   | 2 TB     | Small Prod      |
| small_2_0    | $10.00      | 2 GB   | 1    | 60 GB   | 3 TB     | Medium Prod     |
| medium_2_0   | $20.00      | 4 GB   | 2    | 80 GB   | 4 TB     | Large Prod      |

**Recommendation for 3-10 users**: nano_2_0 ($3.50) or micro_2_0 ($5.00)

## Troubleshooting

### Issue: "Error: InvalidInput: The provided key material is not valid"

**Solution**: Ensure your SSH public key is correctly formatted in `terraform.tfvars`:

```hcl
# Correct format
ssh_public_key = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJq... email@example.com"

# NOT like this (no file path)
ssh_public_key = "~/.ssh/id_ed25519.pub"
```

### Issue: "Error: error creating Lightsail Instance: InvalidInput"

**Solution**: Check availability zone is valid for your region:

```bash
# List available zones
aws lightsail get-regions --query 'regions[?name==`us-east-1`].availabilityZones'

# Update terraform.tfvars with valid zone
availability_zone = "us-east-1a"  # or us-east-1b, us-east-1c, etc.
```

### Issue: "Error: error creating Lightsail Static IP: QuotaExceededException"

**Solution**: Check your Lightsail static IP quota:

```bash
# List existing static IPs
aws lightsail get-static-ips

# Delete unused static IPs
aws lightsail release-static-ip --static-ip-name unused-ip-name
```

### Issue: Cannot connect via SSH

**Solution**:

```bash
# 1. Verify instance is running
terraform output deployment_info

# 2. Check SSH key permissions
chmod 600 ~/.ssh/zfb-lightsail

# 3. Try connecting with verbose output
ssh -v -i ~/.ssh/zfb-lightsail ubuntu@<instance-ip>

# 4. Check security group rules
aws lightsail get-instance-port-states --instance-name zfb-dev
```

### Issue: Docker not installed on instance

**Solution**: User data script may have failed. SSH into instance and check logs:

```bash
# View user data execution log
sudo cat /var/log/user-data.log

# View cloud-init logs
sudo cat /var/log/cloud-init-output.log

# Manually install Docker if needed
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### Issue: Terraform state is locked

**Solution**:

```bash
# Force unlock (use with caution!)
terraform force-unlock <lock-id>

# Lock ID is shown in the error message
```

### Issue: "Error: Backend initialization required"

**Solution**:

```bash
# Reinitialize backend
terraform init -reconfigure

# Or migrate state
terraform init -migrate-state
```

## Security Best Practices

1. **Never commit `terraform.tfvars`**: Add to `.gitignore`
2. **Use strong SSH keys**: ED25519 or RSA 4096-bit
3. **Enable remote state encryption**: S3 with AES256
4. **Restrict SSH access**: Update firewall rules to allow only your IP
5. **Regular updates**: Keep Terraform and providers updated
6. **State locking**: Always use DynamoDB for state locking
7. **Least privilege**: Use IAM users with minimal required permissions

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Terraform Plan

on:
  pull_request:
    paths:
      - 'infra/terraform/**'

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2
        with:
          terraform_version: 1.5.0

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Terraform Init
        run: terraform init
        working-directory: infra/terraform/environments/prod

      - name: Terraform Plan
        run: terraform plan
        working-directory: infra/terraform/environments/prod
```

## Next Steps

After infrastructure is provisioned:

1. **Deploy Application**: Use GitHub Actions to deploy Docker containers
2. **Configure DNS**: Point your domain to the Lightsail static IP
3. **Setup SSL**: Use Certbot in docker-compose for HTTPS
4. **Configure Monitoring**: Setup CloudWatch alarms
5. **Backup Strategy**: Configure automated snapshots

## Additional Resources

- [Terraform AWS Provider Docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS Lightsail Docs](https://docs.aws.amazon.com/lightsail/)
- [Terraform Best Practices](https://www.terraform-best-practices.com/)
- [AWS CLI Reference](https://docs.aws.amazon.com/cli/latest/reference/)

## Support

For issues or questions:
- Project Issues: [GitHub Issues](https://github.com/aasni089/zero-friction-budget/issues)
- Terraform Issues: Check troubleshooting section above
- AWS Support: [AWS Support Center](https://console.aws.amazon.com/support/)
