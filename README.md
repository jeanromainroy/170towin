# 170 to Win

In Canada, 170 seats are needed to win a majority government. This web tool allows users to distribute the 338 seats.

Live demo [here](https://170towin.ca)


## Stack

- Frontend : Svelte, D3.js
- Backend : Node.js, Express.js


## Mise-en-place

**Web Server**

1. Install NGINX
2. Configure as a reverse proxy redirecting to port 8080

        server {

            listen 80 default_server;
            listen [::]:80 default_server;

            location / {
                    proxy_http_version 1.1;
                    proxy_cache_bypass $http_upgrade;

                    proxy_set_header Upgrade $http_upgrade;
                    proxy_set_header Connection 'upgrade';
                    proxy_set_header Host $host;
                    proxy_set_header X-Real-IP $remote_addr;
                    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                    proxy_set_header X-Forwarded-Proto $scheme;

                    proxy_pass http://localhost:8080;
            }
        }


**Runtime Env**

3. Install Node
4. Install NPM

**Domain**

5. Setup your domain to point towards the static IP address of this server
6. Install and run [Certbot](*https://certbot.eff.org/lets-encrypt/ubuntufocal-nginx.html*)

**Installing the Web App**

7. Clone this repo
8. Run `npm i` to install all dependencies
9. Paste your config values in the ./.env file
10. Build the app with svelte

        npm run build

**Running the Web App**

11. Open a new tmux session

        tmux new -s node

12. Launch the app

        npm start


## Dev

### Frontend Environment

Every strings should be available in multiple languages. They can be found here,

    ./src/strings.json

Set your constants here,

    ./src/constants.json


### Linter

To lint the backend,

    eslint api/* --fix

To lint the frontend,

    eslint src/scripts/* --fix


### Data Model

The data model is composed of 1 tables

**Account**

*id*, *username*, *password*, *last_login_at*, *sid*, *created_at*
