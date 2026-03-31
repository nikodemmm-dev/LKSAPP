FROM node:20-alpine

WORKDIR /app

# install deps
COPY package*.json ./
RUN npm install

# copy everything
COPY . .

# build frontend
RUN npm run build

# remove dev deps (optional but clean)
RUN npm prune --production

EXPOSE 3000

CMD ["npm", "start"]
