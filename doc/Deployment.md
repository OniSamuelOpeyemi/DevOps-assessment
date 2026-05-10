# Deployment Guide - DevOps Assessment

## Prerequisites

- AWS Account with appropriate permissions
- Jenkins server configured with:
  - Docker installed
  - AWS CLI configured
  - Required plugins: Docker Pipeline, AWS Steps
- Terraform v1.0+
- Git

## Step 1: Infrastructure Setup

### 1.1 Configure AWS Credentials

```bash
aws configure
# Enter AWS Access Key ID
# Enter AWS Secret Access Key
# Region: us-east-1
```

### 1.2 Create S3 Bucket for Terraform State

```bash
aws s3api create-bucket \
    --bucket devops-assessment-terraform-state121 \
    --region us-east-1

aws s3api put-bucket-versioning \
    --bucket devops-assessment-terraform-state121 \
    --versioning-configuration Status=Enabled
```

> Note: In PowerShell, use the single-line commands below instead of backslash continuation:
>
> ```powershell
> aws s3api create-bucket --bucket devops-assessment-terraform-state121 --region us-east-1
> aws s3api put-bucket-versioning --bucket devops-assessment-terraform-state121 --versioning-configuration Status=Enabled
> ```

### 1.3 Deploy Infrastructure with Terraform

```bash
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Create terraform.tfvars
cat > terraform.tfvars << EOF
aws_region  = "us-east-1"
environment = "production"
app_name    = "devops-assessment"
db_username = "admin"
db_password = "YourSecurePassword123!"  # Change this!
EOF

# Plan
terraform plan

# Apply
terraform apply -auto-approve
```

**Expected Output:**
- VPC with public/private subnets
- ECS Cluster
- Application Load Balancer
- RDS PostgreSQL instance
- ECR repositories
- CloudWatch dashboards and alarms

### 1.4 Save Outputs

```bash
terraform output > ../outputs.txt

# Important outputs:
# - alb_dns_name: Application URL
# - ecr_frontend_repository_url
# - ecr_backend_repository_url
```

## Step 2: Jenkins Setup

### 2.1 Install Required Plugins

In Jenkins UI:
1. Manage Jenkins → Manage Plugins
2. Install:
   - Docker Pipeline
   - AWS Steps
   - Pipeline
   - Git

### 2.2 Configure AWS Credentials

1. Manage Jenkins → Manage Credentials
2. Add Credentials:
   - Kind: AWS Credentials
   - ID: aws-credentials
   - Access Key ID: [Your AWS Access Key]
   - Secret Access Key: [Your AWS Secret Key]

### 2.3 Create Jenkins Pipeline

1. New Item → Pipeline
2. Name: `devops-assessment-pipeline`
3. Pipeline → Definition: Pipeline script from SCM
4. SCM: Git
5. Repository URL: [Your Git Repo]
6. Script Path: `Jenkinsfile`
7. Save

### 2.4 Set Environment Variables

In Pipeline Configuration → Build Environment:

### AWS_ACCOUNT_ID: [Your AWS Account ID]
### AWS_REGION: [*I configure us-east-1*]

## Step 3: Initial Deployment

### 3.1 Build and Push Initial Images

```bash
# Get ECR login
aws ecr get-login-password --region us-east-1 | \
    docker login --username AWS --password-stdin \
    [YOUR_ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com

# Build and push backend
cd application/backend
docker build -f ../../ci-cd/docker/Dockerfile.backend -t devops-assessment/backend:latest ../..
docker tag devops-assessment/backend:latest \
    [ECR_BACKEND_URL]:latest
docker push [ECR_BACKEND_URL]:latest

# Build and push frontend
cd ../frontend
docker build -f ../../ci-cd/docker/Dockerfile.frontend -t devops-assessment/frontend:latest ../..
docker tag devops-assessment/frontend:latest \
    [ECR_FRONTEND_URL]:latest
docker push [ECR_FRONTEND_URL]:latest
```

### 3.2 Trigger Jenkins Pipeline

1. Go to Jenkins
2. Select `devops-assessment-pipeline`
3. Click "Build Now"

Pipeline will:
- ✅ Run tests
- ✅ Build Docker images
- ✅ Security scan with Trivy
- ✅ Push to ECR
- ✅ Deploy to ECS
- ✅ Health checks

## Step 4: Verify Deployment

### 4.1 Check ECS Services

```bash
aws ecs describe-services \
    --cluster devops-assessment-cluster \
    --services devops-assessment-backend-service devops-assessment-frontend-service \
    --region us-east-1
```

### 4.2 Test Application

```bash
# Get ALB DNS
ALB_DNS=$(terraform output -raw alb_dns_name)

# Test backend health
curl http://$ALB_DNS/health

# Test frontend
curl http://$ALB_DNS/

# Open in browser
echo "Application URL: http://$ALB_DNS"
```

### 4.3 Access CloudWatch Dashboard

```bash
# Get dashboard URL
terraform output cloudwatch_dashboard_url

# Or navigate to:
# AWS Console → CloudWatch → Dashboards → devops-assessment-dashboard
```

## Step 5: Monitoring & Alerts

### 5.1 Subscribe to SNS Alerts

```bash
aws sns subscribe \
    --topic-arn arn:aws:sns:us-east-1:[ACCOUNT_ID]:devops-assessment-alerts \
    --protocol email \
    --notification-endpoint your-email@example.com
    
# Confirm subscription via email
```

### 5.2 View Logs

```bash
# Backend logs
aws logs tail /ecs/devops-assessment/backend --follow

# Frontend logs
aws logs tail /ecs/devops-assessment/frontend --follow
```

## Troubleshooting

### ECS Tasks Not Starting

```bash
# Check task status
aws ecs describe-tasks \
    --cluster devops-assessment-cluster \
    --tasks [TASK_ARN]

# Check logs
aws logs get-log-events \
    --log-group-name /ecs/devops-assessment/backend \
    --log-stream-name [STREAM_NAME]
```

### Database Connection Issues

```bash
# Verify RDS is accessible
aws rds describe-db-instances \
    --db-instance-identifier devops-assessment-db

# Check security groups
# Backend ECS tasks should have access to RDS security group
```

### ALB Not Responding

```bash
# Check target health
aws elbv2 describe-target-health \
    --target-group-arn [TARGET_GROUP_ARN]

# Unhealthy targets: Check task logs
```

## Cleanup

To destroy all resources:

```bash
cd infrastructure/terraform
terraform destroy -auto-approve

# Delete ECR images
aws ecr batch-delete-image \
    --repository-name devops-assessment/frontend \
    --image-ids imageTag=latest

aws ecr batch-delete-image \
    --repository-name devops-assessment/backend \
    --image-ids imageTag=latest
```

## Cost Optimization

Estimated monthly cost: ~$50-80
- ECS Fargate: ~$30
- RDS t3.micro: ~$15
- ALB: ~$20
- NAT Gateway: ~$30

To reduce costs:
- Use single NAT Gateway
- Reduce RDS instance size
- Scale down ECS tasks during off-hours