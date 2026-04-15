#!/bin/bash
# ============================================================
# Agent Arena V3 - Production Deployment Script
# ============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="deploy/docker-compose.full.yml"
ENV_FILE=".env.prod"
DOMAIN=""
SSL_EMAIL=""

# ============================================================
# Helper Functions
# ============================================================

log_info() { echo "${BLUE}[INFO]${NC} $1"; }
log_success() { echo "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo "${RED}[ERROR]${NC} $1"; }

check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 is not installed. Please install it first."
        exit 1
    fi
}

generate_secret() {
    openssl rand -hex 32
}

# ============================================================
# Environment Setup
# ============================================================

setup_env() {
    log_info "Setting up environment file..."

    if [ -f "$ENV_FILE" ]; then
        log_warning "Environment file already exists: $ENV_FILE"
        read -p "Do you want to regenerate secrets? (y/N): " regenerate
        if [[ ! "$regenerate" =~ ^[Yy]$ ]]; then
            return
        fi
    fi

    # Prompt for required values
    read -p "Enter your domain (e.g., agentarena.example.com): " DOMAIN
    read -p "Enter SSL certificate email: " SSL_EMAIL
    read -p "Enter admin emails (comma-separated): " ADMIN_EMAILS

    # Generate secrets
    NEXTAUTH_SECRET=$(generate_secret)
    ENCRYPTION_KEY=$(generate_secret)
    POSTGRES_PASSWORD=$(generate_secret)
    REDIS_PASSWORD=$(generate_secret)

    # Create env file
    cat > "$ENV_FILE" << EOF
# ============================================================
# Agent Arena V3 - Production Environment
# Generated on $(date)
# ============================================================

# Domain Configuration
DOMAIN=${DOMAIN}
SSL_EMAIL=${SSL_EMAIL}

# NextAuth Configuration
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
NEXTAUTH_URL=https://${DOMAIN}

# Security Keys
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Database
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# Redis
REDIS_PASSWORD=${REDIS_PASSWORD}

# Admin Access
ADMIN_EMAILS=${ADMIN_EMAILS}

# CORS
CORS_ORIGINS=https://${DOMAIN},https://www.${DOMAIN}
EOF

    log_success "Environment file created: $ENV_FILE"
    log_warning "IMPORTANT: Keep this file secure and never commit it to git!"
}

# ============================================================
# SSL Certificate Setup
# ============================================================

setup_ssl() {
    log_info "Setting up SSL certificate..."

    # Create certbot directories
    mkdir -p certbot/conf certbot/www

    # Request initial certificate (dry-run first)
    log_info "Testing certificate request (dry-run)..."
    docker run --rm -v "./certbot/conf:/etc/letsencrypt" -v "./certbot/www:/var/www/certbot" \
        certbot/certbot certonly --webroot -w /var/www/certbot --dry-run \
        -d ${DOMAIN} -d www.${DOMAIN} --email ${SSL_EMAIL} --agree-tos --no-eff-email

    if [ $? -eq 0 ]; then
        log_success "Dry-run successful. Requesting real certificate..."
        docker run --rm -v "./certbot/conf:/etc/letsencrypt" -v "./certbot/www:/var/www/certbot" \
            certbot/certbot certonly --webroot -w /var/www/certbot \
            -d ${DOMAIN} -d www.${DOMAIN} --email ${SSL_EMAIL} --agree-tos --no-eff-email
        log_success "SSL certificate obtained!"
    else
        log_error "Certificate request failed. Check domain DNS configuration."
        exit 1
    fi
}

# ============================================================
# Deployment Functions
# ============================================================

deploy_init() {
    log_info "Initializing production deployment..."

    # Check requirements
    check_command docker
    check_command docker-compose

    # Setup environment
    setup_env

    # Load environment
    source "$ENV_FILE"

    # Setup SSL
    setup_ssl

    # Generate nginx config
    generate_nginx_config

    # Build and start containers
    log_info "Building and starting containers..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build

    # Wait for health checks
    log_info "Waiting for services to be healthy..."
    sleep 30

    # Check status
    check_status

    log_success "Deployment complete!"
    log_info "Your application is now live at: https://${DOMAIN}"
}

deploy_update() {
    log_info "Updating deployment..."

    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file not found. Run with --init first."
        exit 1
    fi

    # Pull latest code (if git repo)
    if [ -d ".git" ]; then
        log_info "Pulling latest code..."
        git pull origin main
    fi

    # Rebuild and restart
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build

    log_success "Update complete!"
}

deploy_stop() {
    log_info "Stopping deployment..."
    docker compose -f "$COMPOSE_FILE" down
    log_success "Deployment stopped."
}

deploy_logs() {
    docker compose -f "$COMPOSE_FILE" logs -f
}

# ============================================================
# Status Check
# ============================================================

check_status() {
    log_info "Checking service status..."
    docker compose -f "$COMPOSE_FILE" ps

    # Health check
    source "$ENV_FILE" 2>/dev/null || true
    if [ -n "$DOMAIN" ]; then
        log_info "Testing application health..."
        curl -s -o /dev/null -w "%{http_code}" https://${DOMAIN}/api/health || log_warning "Health check failed"
    fi
}

# ============================================================
# Nginx Config Generation
# ============================================================

generate_nginx_config() {
    source "$ENV_FILE"

    log_info "Generating nginx configuration..."

    # Substitute domain in template
    sed "s/\${DOMAIN}/${DOMAIN}/g" deploy/nginx.conf.template > deploy/nginx.conf

    log_success "Nginx config generated."
}

# ============================================================
# Backup Functions
# ============================================================

backup_db() {
    log_info "Creating database backup..."

    source "$ENV_FILE"

    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"

    docker exec agent-arena-postgres pg_dump -U agentarena agentarena > "backups/${BACKUP_FILE}"

    log_success "Backup created: backups/${BACKUP_FILE}"
}

restore_db() {
    if [ -z "$1" ]; then
        log_error "Please specify backup file: ./deploy.sh --restore backups/backup_xxx.sql"
        exit 1
    fi

    log_info "Restoring database from $1..."

    source "$ENV_FILE"

    docker exec -i agent-arena-postgres psql -U agentarena agentarena < "$1"

    log_success "Database restored from $1"
}

# ============================================================
# Main Script
# ============================================================

mkdir -p backups

case "${1:-}" in
    --init)
        deploy_init
        ;;
    --update)
        deploy_update
        ;;
    --stop)
        deploy_stop
        ;;
    --logs)
        deploy_logs
        ;;
    --status)
        check_status
        ;;
    --backup)
        backup_db
        ;;
    --restore)
        restore_db "$2"
        ;;
    --help|*)
        echo "Agent Arena V3 - Deployment Script"
        echo ""
        echo "Usage: ./deploy.sh [command]"
        echo ""
        echo "Commands:"
        echo "  --init      Initialize and deploy (first time setup)"
        echo "  --update    Update and redeploy"
        echo "  --stop      Stop all containers"
        echo "  --logs      View all logs"
        echo "  --status    Check service status"
        echo "  --backup    Create database backup"
        echo "  --restore   Restore database from backup file"
        echo "  --help      Show this help message"
        ;;
esac