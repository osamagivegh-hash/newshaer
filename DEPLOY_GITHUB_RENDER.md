# Deployment Guide

This project is now prepared to run as a single full-stack service on Render with MongoDB Atlas.

## 1. Required environment values

Set these in `server/.env` locally and in Render later:

```env
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://osamagivegh:<db_password>@alshaer.sqs9w7.mongodb.net/?appName=ALSHAER
JWT_SECRET=replace-with-a-long-random-secret
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@alshaerfamily.com
ADMIN_PASSWORD=replace-with-a-strong-password
USE_CLOUDINARY=false
NEWS_FETCH_CRON=*/5 * * * *
NEWS_MAX_ITEMS=50
```

Optional:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=al-shaer-family
SOURCE_MONGODB_URI=
BOOTSTRAP_OVERWRITE=false
```

## 2. Install and verify locally

```bash
npm run install:all
npm run build
```

## 3. Bootstrap the new MongoDB cluster

After placing the real database password in `server/.env`, import the recovered content:

```bash
npm run db:bootstrap
```

This script imports:

- family tree persons from `server/data/recovery/rebuilt-persons-import.json`
- CMS content from `server/data/recovery/latest-recovered-data.json`
- Palestine ticker headlines from `server/data/news_cache.json`

To force a clean re-import:

```bash
BOOTSTRAP_OVERWRITE=true
npm run db:bootstrap
```

## 4. Verify the database state

```bash
npm run deploy:check
```

Or backend only:

```bash
cd server
npm run verify:env
```

## 5. Point Git to the new GitHub repository

The requested repository is:

`https://github.com/osamagivegh-hash/newshaer`

Update the remote if needed:

```bash
git remote set-url origin https://github.com/osamagivegh-hash/newshaer.git
```

Then push:

```bash
git add .
git commit -m "Prepare project for MongoDB Atlas and Render deployment"
git push -u origin main
```

## 6. Deploy on Render

This repository includes `render.yaml`.

Render settings used by the project:

- Service name: `newshaer`
- Build command: `npm ci --prefix server && npm ci --prefix client && npm run build --prefix client`
- Start command: `npm start --prefix server`
- Health check path: `/api/health`

In Render:

1. Create a new Web Service from the GitHub repo.
2. Let Render detect `render.yaml`.
3. Add the required secret environment variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `ADMIN_PASSWORD`
4. Deploy.

## 7. Post-deploy checks

Open these URLs after deployment:

- `/api/health`
- `/`
- `/family-tree`
- `/news`

If the site opens but content is empty, run the bootstrap script locally against the same production cluster and redeploy only if needed.
