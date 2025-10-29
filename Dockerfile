FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN if [ ! -f .env ]; then cp .env.example .env; fi

RUN npm run build

CMD [ "npm", "run", "start:dev" ]