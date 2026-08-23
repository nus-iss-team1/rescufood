# CDN + API Gateway Infrastructure Enhancement

## Summary

This PR migrates the RescuFood AWS infrastructure from a publicly-exposed internet-facing ALB to a hardened architecture:

- **CloudFront CDN** serves listing images from S3 via edge caching
- **API Gateway HTTP API** with VPC Link fronts all traffic to an internal ALB

No custom domains are used — the system uses AWS default URLs (`*.cloudfront.net` and `*.execute-api.*.amazonaws.com`).

All components are accurate to the desired infrastructure drawn in `infra-plan.drawio`. Route 53 with custom domain (`rescufood.io`) will be added in a future iteration.

## Files Changed

| File | Change |
|------|--------|
| `security-groups.yaml` | ALB SG restricted to VPC CIDR (10.0.0.0/16) port 80 only |
| `data.yaml` | Added CloudFront distribution, OAC, S3 bucket policy, CDN outputs |
| `ecs.yaml` | ALB internalized, HTTPS removed, env vars conditioned on API Gateway URL, HttpListenerArn exported |
| `api-gateway.yaml` | **New** — HTTP API + VPC Link + $default route + auto-deploy stage |
| `parameters/ecs-dev.json` | Added `ApiGatewayStackName` parameter |
| `parameters/api-gateway-dev.json` | **New** — dev parameter file for api-gateway stack |

## Deploy Order (Team Environment)

Run from `infrastructure/cloudformation/`, sequentially:

```bash
# Step 1: Data stack (deploy CloudFront CDN + OAC + S3 bucket policy)
aws cloudformation deploy --stack-name rescufood-dev-data \
  --template-file data.yaml \
  --parameter-overrides $(cat parameters/data-dev.json | jq -r '.[]')

# Step 2: ECS (internalize ALB, no API Gateway reference yet)
aws cloudformation deploy --stack-name rescufood-dev-ecs \
  --template-file ecs.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides $(cat parameters/ecs-dev.json | jq -r 'map(select(. != "ApiGatewayStackName=rescufood-dev-api-gateway")) | .[]')

# Step 3: API Gateway (after ECS completes)
aws cloudformation deploy --stack-name rescufood-dev-api-gateway \
  --template-file api-gateway.yaml \
  --parameter-overrides ProjectName=rescufood EnvironmentName=dev \
    NetworkStackName=rescufood-core-network \
    EcsStackName=rescufood-dev-ecs \
    SecurityStackName=rescufood-dev-security

# Step 4: ECS update (add API Gateway URL to env vars)
aws cloudformation deploy --stack-name rescufood-dev-ecs \
  --template-file ecs.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides $(cat parameters/ecs-dev.json | jq -r '.[]')

# Step 5: Security groups (tighten ingress to VPC CIDR)
aws cloudformation deploy --stack-name rescufood-dev-security \
  --template-file security-groups.yaml \
  --parameter-overrides ProjectName=rescufood EnvironmentName=dev \
    NetworkStackName=rescufood-core-network
```

## After Deployment: New URLs

After deployment, get the new URLs:

```bash
# API Gateway URL (replaces the old ALB URL)
aws cloudformation describe-stacks --stack-name rescufood-dev-api-gateway \
  --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" --output text

# CDN URL (for listing images)
aws cloudformation describe-stacks --stack-name rescufood-dev-data \
  --query "Stacks[0].Outputs[?OutputKey=='ListingImagesCDNUrl'].OutputValue" --output text
```

## Step 6: Update Local `.env` Files

After all stacks are deployed, update your local `.env` files — the old ALB URL no longer works from outside the VPC:

```bash
# Get the new API Gateway URL
aws cloudformation describe-stacks --stack-name rescufood-dev-api-gateway \
  --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" --output text
```

Then replace the old ALB URL in `web/.env` (and root `.env` if applicable):

```env
PROFILE_API_URL=https://<api-gateway-url>
LISTINGS_API_URL=https://<api-gateway-url>
VITE_PROFILE_API_URL=https://<api-gateway-url>
```

## Next Steps for Engineers

### Backend Engineer (Listings Service)

The CDN is deployed and serving images. To use it:

1. **Add env var** to the listings service: `LISTING_IMAGES_CDN_URL=<CDN URL from stack output>`
2. **Replace presigned URL generation** in `service/listings/src/storage/s3.service.ts`:

```typescript
// Before (presigned S3 URL):
getSignedUrl(key: string): Promise<string> {
  return getSignedUrl(this.client, new GetObjectCommand({...}), {...});
}

// After (CDN URL — simple string concatenation, no AWS SDK call):
getImageUrl(key: string): string {
  return `${this.cdnUrl}/${key}`;
}
```

3. **Uploads and deletes** remain unchanged (still direct S3 via PutObject/DeleteObject)
4. **Verify**: Upload an image via the API, confirm the response returns a CloudFront URL, open it in a browser

### Frontend Engineer

- Image `src` attributes will automatically use CDN URLs once the backend change is made
- No frontend code changes needed unless image URLs are hardcoded somewhere

## Architecture After Migration

```
Browser → API Gateway (*.execute-api) → VPC Link → Internal ALB → ECS Services
Browser → CloudFront (*.cloudfront.net) → S3 (listing images)
```

- ALB is internal — not reachable from the internet
- TLS terminates at API Gateway (no HTTPS listener on ALB)
- Server-to-server calls (PROFILE_API_URL, LISTINGS_API_URL) stay on the internal ALB
- Only browser-facing URLs (AUTH_URL, CORS) use the API Gateway URL
