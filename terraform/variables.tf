variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be either 'staging' or 'production'."
  }
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "eks_node_groups" {
  description = "EKS node groups configuration"
  type = map(object({
    instance_types = list(string)
    capacity_type  = string
    min_size       = number
    max_size       = number
    desired_size   = number
    disk_size      = number
  }))
  default = {
    general = {
      instance_types = ["t3.medium"]
      capacity_type  = "ON_DEMAND"
      min_size       = 1
      max_size       = 3
      desired_size   = 2
      disk_size      = 20
    }
    workers = {
      instance_types = ["t3.large"]
      capacity_type  = "ON_DEMAND"
      min_size       = 1
      max_size       = 5
      desired_size   = 2
      disk_size      = 50
    }
  }
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "redis_node_type" {
  description = "Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_nodes" {
  description = "Number of Redis nodes"
  type        = number
  default     = 1
}

variable "nats_instance_type" {
  description = "NATS instance type"
  type        = string
  default     = "t3.small"
}

variable "certificate_arn" {
  description = "SSL certificate ARN"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
}

variable "openai_api_key" {
  description = "OpenAI API key"
  type        = string
  sensitive   = true
}

# Production overrides
locals {
  is_production = var.environment == "production"
  
  production_overrides = {
    rds_instance_class = "db.t3.small"
    rds_allocated_storage = 100
    redis_node_type = "cache.t3.small"
    redis_num_nodes = 2
    nats_instance_type = "t3.medium"
    eks_node_groups = {
      general = {
        instance_types = ["t3.large"]
        capacity_type  = "ON_DEMAND"
        min_size       = 2
        max_size       = 5
        desired_size   = 3
        disk_size      = 50
      }
      workers = {
        instance_types = ["t3.xlarge"]
        capacity_type  = "ON_DEMAND"
        min_size       = 2
        max_size       = 10
        desired_size   = 3
        disk_size      = 100
      }
    }
  }
  
  staging_overrides = {
    rds_instance_class = "db.t3.micro"
    rds_allocated_storage = 20
    redis_node_type = "cache.t3.micro"
    redis_num_nodes = 1
    nats_instance_type = "t3.small"
    eks_node_groups = {
      general = {
        instance_types = ["t3.medium"]
        capacity_type  = "ON_DEMAND"
        min_size       = 1
        max_size       = 3
        desired_size   = 2
        disk_size      = 20
      }
      workers = {
        instance_types = ["t3.large"]
        capacity_type  = "ON_DEMAND"
        min_size       = 1
        max_size       = 5
        desired_size   = 2
        disk_size      = 50
      }
    }
  }
  
  config = local.is_production ? local.production_overrides : local.staging_overrides
}
