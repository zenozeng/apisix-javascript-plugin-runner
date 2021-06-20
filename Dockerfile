FROM node:16.3.0-alpine
COPY package.json package-lock.json /usr/local/apisix/javascript-plugin-runner/
WORKDIR /usr/local/apisix/javascript-plugin-runner
RUN npm install
COPY . /usr/local/apisix/javascript-plugin-runner
RUN npm run build
