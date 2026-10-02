output "public_ip" {
  value = aws_instance.this.public_ip
}

output "ssh_command" {
  value = "ssh -i ${local_sensitive_file.ssh_key.filename} ec2-user@${aws_instance.this.public_ip}"
}

output "juice_shop_url" {
  value = "http://${aws_instance.this.public_ip}:3000"
}

output "grafana_url" {
  value = "http://${aws_instance.this.public_ip}:3001"
}
