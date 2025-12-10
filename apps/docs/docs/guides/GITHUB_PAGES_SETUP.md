# GitHub Pages Setup Guide

This guide explains how to enable GitHub Pages for automatic documentation deployment.

## Prerequisites

- Repository pushed to GitHub
- GitHub Actions workflow file committed (`.github/workflows/deploy-docs.yml`)
- Main branch with documentation code

## Setup Steps

### 1. Enable GitHub Pages

1. Navigate to your repository on GitHub:
   ```
   https://github.com/linnefromice/prototype-hono-drizzle-codex
   ```

2. Go to **Settings** > **Pages** (in the left sidebar)

3. Under **Source**, select:
   - Source: **GitHub Actions**

   ![GitHub Pages Source Selection](https://docs.github.com/assets/cb-47267/mw-1440/images/help/pages/publishing-source-drop-down.webp)

4. Save the settings

### 2. Verify Workflow Permissions

Ensure the workflow has the necessary permissions:

1. Go to **Settings** > **Actions** > **General**

2. Scroll to **Workflow permissions**

3. Select:
   - ✅ **Read and write permissions**
   - ✅ **Allow GitHub Actions to create and approve pull requests**

4. Click **Save**

### 3. Trigger First Deployment

Option A: **Merge to main branch**
```bash
# From your local repository
git checkout main
git merge topic/docs
git push origin main
```

Option B: **Manual workflow trigger**
1. Go to **Actions** tab
2. Select **Deploy Documentation** workflow
3. Click **Run workflow** > **Run workflow**

### 4. Monitor Deployment

1. Go to **Actions** tab
2. Click on the latest **Deploy Documentation** workflow run
3. Monitor the build and deploy jobs
4. Wait for both jobs to complete (usually 2-3 minutes)

### 5. Access Documentation

Once deployed, your documentation will be available at:
```
https://linnefromice.github.io/prototype-hono-drizzle-codex/
```

## Automatic Deployment Triggers

The workflow automatically triggers on push to `main` branch when changes are made to:

- `packages/openapi/**` - OpenAPI specification updates
- `apps/backend/src/routes/__snapshots__/**` - Snapshot test updates
- `apps/docs/**` - Documentation content updates
- `.github/workflows/deploy-docs.yml` - Workflow configuration updates

## Troubleshooting

### Deployment Fails with "Permission denied"

**Solution**: Check workflow permissions in Settings > Actions > General

### Build Succeeds but Pages Don't Update

**Possible causes**:
1. **Cache issue**: Clear browser cache or try incognito mode
2. **Workflow not triggered**: Verify changes touched one of the trigger paths
3. **Deploy job failed**: Check Actions tab for deployment errors

### "404 Not Found" on Documentation Site

**Possible causes**:
1. **Base URL mismatch**: Verify `base` in `.vitepress/config.ts` matches repository name
2. **Deployment incomplete**: Check that both build and deploy jobs succeeded
3. **GitHub Pages not enabled**: Verify source is set to "GitHub Actions"

### YAML Syntax Error

**Solution**: Use a YAML validator to check `.github/workflows/deploy-docs.yml`
```bash
# Online validator: https://www.yamllint.com/
# Or use a local tool
npx yaml-lint .github/workflows/deploy-docs.yml
```

## Workflow Details

### Build Job

1. **Checkout**: Clones repository code
2. **Setup Node.js**: Installs Node.js 20 with npm cache
3. **Install dependencies**: Runs `npm ci` to install exact dependencies
4. **Build documentation**: Runs `npm run build --workspace docs`
   - Copies OpenAPI spec
   - Generates API reference HTML
   - Generates snapshot documentation
   - Builds VitePress site
5. **Setup Pages**: Configures GitHub Pages settings
6. **Upload artifact**: Uploads built site from `apps/docs/docs/.vitepress/dist`

### Deploy Job

1. Waits for build job to complete
2. Deploys artifact to GitHub Pages
3. Provides deployment URL in outputs

## Manual Local Testing

Before pushing changes, test the build locally:

```bash
# From repository root
npm run build --workspace docs

# Preview the built site
npm run serve --workspace docs
```

Navigate to `http://localhost:4173/prototype-hono-drizzle-codex/` to preview.

## Rollback Procedure

If a deployment introduces issues:

1. Go to **Actions** tab
2. Find the last successful deployment
3. Click **Re-run all jobs**

Or revert the problematic commit:
```bash
git revert <commit-hash>
git push origin main
```

## Custom Domain (Optional)

To use a custom domain:

1. Add a `CNAME` file to `apps/docs/docs/public/`:
   ```
   docs.yourdomain.com
   ```

2. Configure DNS records with your domain provider:
   ```
   Type: CNAME
   Name: docs
   Value: linnefromice.github.io
   ```

3. Update `base` in `.vitepress/config.ts`:
   ```typescript
   base: '/', // Remove repository name
   ```

4. In GitHub Settings > Pages, add your custom domain

## Monitoring

### Check Deployment Status

Visit the Actions tab to see deployment history:
```
https://github.com/linnefromice/prototype-hono-drizzle-codex/actions
```

### View Deployment Logs

1. Click on a workflow run
2. Click on **build** or **deploy** job
3. Expand steps to view detailed logs

### Deployment Badge (Optional)

Add a badge to your README:

```markdown
[![Deploy Documentation](https://github.com/linnefromice/prototype-hono-drizzle-codex/actions/workflows/deploy-docs.yml/badge.svg)](https://github.com/linnefromice/prototype-hono-drizzle-codex/actions/workflows/deploy-docs.yml)
```

## Next Steps

After successful deployment:

1. ✅ Verify all pages load correctly
2. ✅ Test navigation and links
3. ✅ Check API reference display
4. ✅ Verify snapshot pages render properly
5. ✅ Test on mobile devices
6. 🔄 Set up monitoring/alerts for failed deployments (optional)
7. 📝 Update main README with documentation link

## Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [VitePress Deployment Guide](https://vitepress.dev/guide/deploy#github-pages)
- [Actions Deploy Pages](https://github.com/marketplace/actions/deploy-github-pages-site)

## Support

For issues with:
- **GitHub Pages setup**: Check GitHub's status page or community forums
- **Workflow configuration**: Review GitHub Actions documentation
- **Documentation content**: Open an issue in this repository
