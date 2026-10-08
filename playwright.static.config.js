import {defineConfig} from '@playwright/test';
// Static-only checks: no Worker, Cloudflare account, or deployment connection.
export default defineConfig({testDir:'./tests',testMatch:['**/builder-home.spec.js','**/database.spec.js','**/rulebook.spec.js'],workers:1,use:{baseURL:'http://127.0.0.1:8791',headless:true,launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']}},webServer:{command:'python3 -m http.server 8791 --bind 127.0.0.1 --directory public',url:'http://127.0.0.1:8791',reuseExistingServer:false}});
