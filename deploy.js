const fs = require('fs');
const cp = require('child_process');

const SERVICE_NAME = "n8n-serverless";
const REGION = "europe-west3";

// 1. Load .env
const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
        let [key, ...val] = line.split('=');
        if (key && val) {
            let value = val.join('=').trim();
            if (value.includes(' #')) value = value.split(' #')[0].trim();
            envVars[key.trim()] = value;
        }
    }
});

// Force Cloud Run required ports since we bypassed the custom Dockerfile
envVars['N8N_PORT'] = '8080';
envVars['N8N_LISTEN_ADDRESS'] = '0.0.0.0';

// 2. Write env.yaml to bypass Windows CMD special character limitations mapping
console.log('Generating n8n-env.yaml...');
let yamlContent = '';
for (const [k, v] of Object.entries(envVars)) {
    // Escape string for yaml
    yamlContent += `${k}: "${v.replace(/"/g, '\\"')}"\n`;
}
fs.writeFileSync('n8n-env.yaml', yamlContent, 'utf8');

const IMAGE_NAME = `docker.io/n8nio/n8n:latest`;

console.log('Deploying public image directly to Cloud Run...');
const deployCmd = [
    'gcloud', 'run', 'deploy', SERVICE_NAME,
    '--image', IMAGE_NAME,
    '--region', REGION,
    '--allow-unauthenticated',
    '--memory', '1Gi',
    '--cpu', '1',
    '--min-instances', '0',
    '--max-instances', '1',
    '--memory', '1024Mi',
    '--cpu', '1',
    '--port', '8080',
    '--cpu-throttling',
    '--env-vars-file', 'n8n-env.yaml'
];

console.log('Running deploy command...');
cp.execFileSync(deployCmd[0], deployCmd.slice(1), {stdio: 'inherit', shell: true});

console.log('Fetching Service URL...');
const SERVICE_URL = cp.execSync(`gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format "value(status.url)"`, {encoding: 'utf8', shell: true}).trim();
console.log('Cloud Run Service URL:', SERVICE_URL);

console.log('Updating deployment with WEBHOOK_URL=' + SERVICE_URL + '...');
const updateCmd = [
    'gcloud', 'run', 'services', 'update', SERVICE_NAME,
    '--region', REGION,
    '--update-env-vars', `WEBHOOK_URL=${SERVICE_URL}`
];
cp.execFileSync(updateCmd[0], updateCmd.slice(1), {stdio: 'inherit', shell: true});

console.log('Cleaning up temporary yaml file...');
fs.unlinkSync('n8n-env.yaml');

console.log('==================================================');
console.log('Deployment successful!');
console.log('Access your n8n instance at:', SERVICE_URL);
console.log('==================================================');
