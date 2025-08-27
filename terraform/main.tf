terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
  }

  backend "s3" {
    bucket = "resume-builder-terraform-state"
    key    = "terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "resume-builder"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# VPC and Networking
module "vpc" {
  source = "./modules/vpc"

  environment = var.environment
  vpc_cidr    = var.vpc_cidr
  azs         = var.availability_zones
}

# EKS Cluster
module "eks" {
  source = "./modules/eks"

  environment           = var.environment
  cluster_name          = "resume-builder-${var.environment}"
  vpc_id                = module.vpc.vpc_id
  subnet_ids            = module.vpc.private_subnet_ids
  node_groups           = var.eks_node_groups
  cluster_version       = "1.28"
  enable_irsa           = true
}

# RDS PostgreSQL
module "rds" {
  source = "./modules/rds"

  environment     = var.environment
  cluster_name    = "resume-builder-${var.environment}"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.database_subnet_ids
  instance_class  = var.rds_instance_class
  allocated_storage = var.rds_allocated_storage
  database_name   = "resumebuilder"
  master_username = "postgres"
  backup_retention_period = 7
  multi_az        = var.environment == "production"
}

# ElastiCache Redis
module "redis" {
  source = "./modules/redis"

  environment    = var.environment
  cluster_name   = "resume-builder-${var.environment}"
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.private_subnet_ids
  node_type      = var.redis_node_type
  num_cache_nodes = var.redis_num_nodes
  port           = 6379
}

# S3 Buckets
module "s3" {
  source = "./modules/s3"

  environment = var.environment
  bucket_names = {
    uploads     = "resume-builder-uploads-${var.environment}"
    exports     = "resume-builder-exports-${var.environment}"
    assets      = "resume-builder-assets-${var.environment}"
    backups     = "resume-builder-backups-${var.environment}"
    terraform   = "resume-builder-terraform-state"
  }
}

# Application Load Balancer
module "alb" {
  source = "./modules/alb"

  environment = var.environment
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.public_subnet_ids
  certificate_arn = var.certificate_arn
}

# NATS Streaming Server
module "nats" {
  source = "./modules/nats"

  environment = var.environment
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids
  instance_type = var.nats_instance_type
}

# Secrets Manager
module "secrets" {
  source = "./modules/secrets"

  environment = var.environment
  secrets = {
    database_url = {
      description = "Database connection string"
      secret_string = jsonencode({
        host     = module.rds.endpoint
        port     = 5432
        database = "resumebuilder"
        username = "postgres"
        password = module.rds.master_password
      })
    }
    redis_url = {
      description = "Redis connection string"
      secret_string = jsonencode({
        host = module.redis.endpoint
        port = 6379
      })
    }
    jwt_secret = {
      description = "JWT signing secret"
      secret_string = random_password.jwt_secret.result
    }
    openai_api_key = {
      description = "OpenAI API key"
      secret_string = var.openai_api_key
    }
  }
}

# CloudWatch Logs
module "cloudwatch" {
  source = "./modules/cloudwatch"

  environment = var.environment
  log_groups = [
    "/aws/eks/resume-builder-${var.environment}/application",
    "/aws/eks/resume-builder-${var.environment}/system",
    "/aws/eks/resume-builder-${var.environment}/audit"
  ]
}

# IAM Roles and Policies
module "iam" {
  source = "./modules/iam"

  environment = var.environment
  cluster_name = module.eks.cluster_name
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_provider = module.eks.oidc_provider
}

# Route53 DNS
module "route53" {
  source = "./modules/route53"

  environment = var.environment
  domain_name = var.domain_name
  certificate_arn = var.certificate_arn
  alb_dns_name = module.alb.dns_name
  alb_zone_id = module.alb.zone_id
}

# Random resources
resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

resource "random_password" "database_password" {
  length  = 32
  special = false
}

# Outputs
output "cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "database_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.endpoint
}

output "redis_endpoint" {
  description = "Redis endpoint"
  value       = module.redis.endpoint
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = module.alb.dns_name
}

output "domain_name" {
  description = "Application domain name"
  value       = module.route53.domain_name
}
