variable "region" {
  description = "AWS region."
  type        = string
  default     = "eu-central-1"
}

variable "project_name" {
  description = "Used for resource names and tags."
  type        = string
  default     = "rum-demo"
}

variable "instance_type" {
  description = "t3.large, not smaller: the Angular production build inside the Docker image is memory-hungry enough to OOM on 4GB."
  type        = string
  default     = "t3.large"
}

variable "ssh_cidr" {
  description = "CIDR allowed to SSH in, e.g. your public IP as x.x.x.x/32."
  type        = string

  validation {
    condition     = can(cidrhost(var.ssh_cidr, 0)) && var.ssh_cidr != "0.0.0.0/0"
    error_message = "Use a specific CIDR such as your own IP with /32; 0.0.0.0/0 would expose SSH to the internet."
  }
}

variable "app_cidrs" {
  description = "CIDRs allowed to reach Juice Shop (3000), Grafana (3001) and the OTel Collector (4318)."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}
