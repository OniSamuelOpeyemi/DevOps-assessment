variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "devops-assessment"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "db_username" {
  description = "Database username"
  type        = string
  sensitive   = true

  validation {
    condition     = var.db_username != "admin" && var.db_username != "postgres" && var.db_username != "root"
    error_message = "db_username cannot be a reserved username such as admin, postgres, or root. Choose a different user."
  }
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}