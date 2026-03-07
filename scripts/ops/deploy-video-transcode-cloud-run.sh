#!/usr/bin/env bash
set -euo pipefail

service_name="${1:-everlume-video-transcode}"
region="${2:-us-central1}"
project_id="${3:-}"

if [[ -z "${project_id}" ]]; then
  echo "Usage: ./scripts/ops/deploy-video-transcode-cloud-run.sh <service-name> <region> <gcp-project-id>"
  echo "Example: ./scripts/ops/deploy-video-transcode-cloud-run.sh everlume-video-transcode us-central1 my-gcp-project"
  exit 1
fi

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud CLI is required."
  exit 1
fi

image="gcr.io/${project_id}/${service_name}:$(date +%Y%m%d%H%M%S)"

echo "Building image: ${image}"
gcloud builds submit services/video-transcode --tag "${image}" --project "${project_id}"

echo "Deploying Cloud Run service: ${service_name}"
gcloud run deploy "${service_name}" \
  --image "${image}" \
  --platform managed \
  --region "${region}" \
  --project "${project_id}" \
  --allow-unauthenticated

echo "Done. Configure runtime env vars in Cloud Run before production traffic."
