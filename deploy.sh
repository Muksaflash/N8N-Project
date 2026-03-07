#!/bin/bash

# Configuration
SERVICE_NAME="n8n-serverless"
REGION="us-central1" # Change this to your preferred Google Cloud region
IMAGE_NAME="gcr.io/$(gcloud config get-value project)/$SERVICE_NAME:latest"

# 1. Load Environment Variables from .env file
# Ensure .env exists
if [ ! -f .env ]; then
  echo "Error: .env file not found. Please create one based on .env.example."
  exit 1
fi

# Load variables safely supporting passwords with spaces and ignoring comments correctly
set -a
source .env
set +a

# 2. Build and Push the Docker Image using Google Cloud Build
echo "Building and pushing the Docker image..."
gcloud builds submit --tag $IMAGE_NAME

# 3. Initial Deployment to Cloud Run
# Deploying first to get the dynamically generated URL, which n8n needs for the WEBHOOK_URL.
# We set the memory and CPU requests, allow unauthenticated access (since n8n has its own auth),
# and set the necessary environment variables for the database and encryption.
echo "Deploying to Cloud Run (Initial pass to get URL)..."

gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --region $REGION \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 1 \
  --port 8080 \
  --set-env-vars="DB_TYPE=$DB_TYPE,DB_POSTGRESDB_DATABASE=$DB_POSTGRESDB_DATABASE,DB_POSTGRESDB_HOST=$DB_POSTGRESDB_HOST,DB_POSTGRESDB_PORT=$DB_POSTGRESDB_PORT,DB_POSTGRESDB_USER=$DB_POSTGRESDB_USER,DB_POSTGRESDB_PASSWORD=$DB_POSTGRESDB_PASSWORD,N8N_ENCRYPTION_KEY=$N8N_ENCRYPTION_KEY,EXECUTIONS_DATA_PRUNE=$EXECUTIONS_DATA_PRUNE,EXECUTIONS_DATA_MAX_AGE=$EXECUTIONS_DATA_MAX_AGE"

# 4. Get the Assigned Cloud Run URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')

echo "Cloud Run Service URL: $SERVICE_URL"

# 5. Update the Deployment with the Correct WEBHOOK_URL
echo "Updating deployment with WEBHOOK_URL=$SERVICE_URL..."

gcloud run services update $SERVICE_NAME \
  --region $REGION \
  --update-env-vars="WEBHOOK_URL=$SERVICE_URL"

echo "=================================================="
echo "Deployment successful!"
echo "Access your n8n instance at: $SERVICE_URL"
echo "Note: If this is your first time deploying, you will be prompted to create an admin account."
echo "=================================================="
