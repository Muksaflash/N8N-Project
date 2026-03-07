FROM n8nio/n8n:latest

# Define standard Cloud Run port
ENV N8N_PORT=8080
ENV N8N_LISTEN_ADDRESS=0.0.0.0

# In Cloud Run, the filesystem is read-only by default if configured so,
# or ephemeral. We must ensure the n8n user has write permissions to its home directory
# where it stores the encryption key and temporary files.
USER root

# Create necessary directories and set ownership to the 'node' user
RUN mkdir -p /home/node/.n8n && \
    chown -R node:node /home/node/.n8n

# Switch back to the non-root user
USER node

# Expose the expected port
EXPOSE 8080

# The base image already has an ENTRYPOINT and CMD that starts n8n
