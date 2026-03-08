const cp = require('child_process');
const crypto = require('crypto');

const projectId = 'n8n-app-' + crypto.randomBytes(3).toString('hex');
console.log('Creating Google Cloud Project:', projectId);

try {
    cp.execSync('gcloud projects create ' + projectId + ' --name="n8n Deploy"', {stdio: 'inherit'});
    console.log('Linking billing account...');
    cp.execSync('gcloud beta billing projects link ' + projectId + ' --billing-account=0183D7-E71084-183ACE', {stdio: 'inherit'});
    console.log('Setting default project...');
    cp.execSync('gcloud config set project ' + projectId, {stdio: 'inherit'});
    console.log('Enabling necessary APIs (Cloud Run, Cloud Build, Artifact Registry)...');
    cp.execSync('gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com', {stdio: 'inherit'});
    console.log('Successfully prepared project:', projectId);
} catch (error) {
    console.error('Failed to setup project:', error.message);
    process.exit(1);
}
