FROM node:18.20.4@sha256:e9ad817b0d42b4d177a4bef8a0aff97c352468a008c3fdb2b4a82533425480df
RUN git clone https://github.com/TryQuiet/quiet-storage-service.git
WORKDIR /quiet-storage-service
RUN mkdir storage
RUN npm install
CMD JWT_SECRET=101010 npm run start