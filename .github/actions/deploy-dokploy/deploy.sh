#!/usr/bin/env bash

set -euo pipefail

for name in DOKPLOY_URL DOKPLOY_API_KEY APPLICATION_ID; do
    if [[ -z "${!name:-}" ]]; then
        echo "::error::${name} is not set; add it to the production environment of the repository."
        exit 1
    fi
done

API="${DOKPLOY_URL%/}/api"
TIMEOUT="${TIMEOUT:-1200}"
POLL_INTERVAL="${POLL_INTERVAL:-10}"
COMMIT="${GITHUB_SHA:-unknown}"

# Calls the Dokploy API and prints the answer; fails on a network error or a status other than 2xx.
call() {
    curl --silent --show-error --fail-with-body --header 'accept: application/json' --header "x-api-key: ${DOKPLOY_API_KEY}" "$@"
}

# Prints the identifier, status and error message of the application's latest deployment, separated by tabs.
latest() {
    call "${API}/deployment.all?applicationId=${APPLICATION_ID}" | jq -r '(if type == "array" then . else (.deployments // []) end) | if length == 0 then "\t\t" else max_by(.createdAt // "") | [.deploymentId // "", .status // "", .errorMessage // ""] | @tsv end'
}

# The deployment already there, so the new one can be told apart from it.
if ! previous="$(latest)"; then
    echo "::error::Could not read the deployments from ${API}; check the address and the API key."
    exit 1
fi
previous="${previous%%$'\t'*}"

payload="$(jq -nc --arg applicationId "$APPLICATION_ID" --arg title "GitHub Actions" --arg description "${GITHUB_WORKFLOW:-Manual} #${GITHUB_RUN_NUMBER:-0} on ${COMMIT:0:7}" '{applicationId: $applicationId, title: $title, description: $description}')"

if ! answer="$(call --request POST --header 'Content-Type: application/json' --data "$payload" "${API}/application.deploy")"; then
    echo "::error::Dokploy refused the deployment: ${answer}"
    exit 1
fi

echo "Dokploy accepted the deployment of application ${APPLICATION_ID}."

deadline=$((SECONDS + TIMEOUT))
followed=""

while ((SECONDS < deadline)); do
    sleep "$POLL_INTERVAL"

    if ! line="$(latest)"; then
        echo "Could not read the deployments, trying again."
        continue
    fi

    IFS=$'\t' read -r id status message <<< "$line"

    if [[ -z "$id" || "$id" == "$previous" ]]; then
        continue
    fi

    if [[ "$id" != "$followed" ]]; then
        echo "Following deployment ${id}."
        followed="$id"
    fi

    case "$status" in
        done)
            echo "Deployment ${id} succeeded."
            exit 0
            ;;
        error | cancelled)
            echo "::error::Deployment ${id} ended with the status ${status}. ${message}"
            exit 1
            ;;
    esac
done

echo "::error::The deployment did not finish within ${TIMEOUT} seconds."
exit 1
