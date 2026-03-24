#!/usr/bin/env bash
set -euo pipefail

APP_NAME="nodejs-capture"
REPO_URL="https://github.com/simplicateca/nodejs-capture"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITE_DIRECTORY="$SCRIPT_DIR"
WEB_DIRECTORY="$SCRIPT_DIR/public"
ENTRYPOINT="$WEB_DIRECTORY/index.js"

ensure_env() {
    cd "$SITE_DIRECTORY"

    if [ ! -f .env ]; then
        echo "Creating .env"
        cat > .env <<EOF
CAPTURE_PORT=3000
CAPTURE_TOKEN=$(openssl rand -base64 24)
EOF
    fi
}

deploy_app() {
    echo "Deploying $APP_NAME..."

    rm -rf "$WEB_DIRECTORY"
    git clone "$REPO_URL" "$WEB_DIRECTORY"

    cd "$WEB_DIRECTORY"
    npm install

    ensure_env

    pm2 delete "$APP_NAME" 2>/dev/null || true
    pm2 start "$ENTRYPOINT" --name "$APP_NAME" --update-env

    echo "🚀 Application deployed!"
}

start_app() {
    echo "Starting $APP_NAME..."

    cd "$WEB_DIRECTORY"
    ensure_env

    if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
        pm2 start "$APP_NAME"
    else
        pm2 start "$ENTRYPOINT" --name "$APP_NAME" --update-env
    fi

    echo "✅ Application started!"
}

stop_app() {
    echo "Stopping $APP_NAME..."
    pm2 stop "$APP_NAME"
    echo "🛑 Application stopped!"
}

restart_app() {
    echo "Restarting $APP_NAME..."
    pm2 restart "$APP_NAME" --update-env
    echo "🔄 Application restarted!"
}

update_app() {
    echo "Updating $APP_NAME..."

    cd "$WEB_DIRECTORY"

    pm2 stop "$APP_NAME" 2>/dev/null || true

    git fetch origin
    git reset --hard origin/main
    npm install

    pm2 start "$APP_NAME" 2>/dev/null || \
        pm2 start "$ENTRYPOINT" --name "$APP_NAME" --update-env

    pm2 restart "$APP_NAME" --update-env

    echo "⬆️ Application updated!"
}

case "${1:-}" in
    deploy) deploy_app ;;
    start) start_app ;;
    stop) stop_app ;;
    restart) restart_app ;;
    update) update_app ;;
    *)
        echo "Usage: $0 {deploy|start|stop|restart|update}"
        exit 1
        ;;
esac