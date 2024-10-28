FROM node:16@sha256:818b5adc1ee4a04e8ad5efeb70871571efe414315ad7f16844f24f9962ffdc7e

ARG ELECTRON_CUSTOM_VERSION 23.0.0
ARG ELECTRON_CHROMEDRIVER_VERSION 23.3.13
ENV CHROMEDRIVER_PORT 9515
ENV CHROMEDRIVER_WHITELISTED_IPS ""
ENV SCREEN_WIDTH 1920
ENV SCREEN_HEIGHT 1080
ENV SCREEN_DEPTH 24
ENV DISPLAY :99.0

USER root

RUN apt-get update -qqy

#=====
# VNC
#=====
RUN apt-get -qqy install \
  x11vnc

#=======
# Fonts
#=======
RUN apt-get -qqy --no-install-recommends install \
  fonts-ipafont-gothic \
  xfonts-100dpi \
  xfonts-75dpi \
  xfonts-cyrillic \
  xfonts-scalable

#=========
# fluxbox
# A fast, lightweight and responsive window manager
#=========
RUN apt-get -qqy install \
  xvfb fluxbox

#=====
# Chromedriver dependencies
#=====
RUN apt-get -qqy install \
  libnss3-dev libgconf-2-4 fuse libgtk2.0-0 libgtk-3-0 libasound2 libgbm-dev

RUN rm -rf /var/lib/apt/lists/* /var/cache/apt/*

ENV ELECTRON_CUSTOM_VERSION=$ELECTRON_CUSTOM_VERSION
RUN npm install -g electron-chromedriver@$ELECTRON_CHROMEDRIVER_VERSION

ADD entrypoint.sh /entrypoint.sh
RUN chmod 777 /entrypoint.sh

#==============================
# Generating the VNC password as node
# So the service can be started with node
#==============================

USER node
RUN mkdir -p ~/.vnc \
  && x11vnc -storepasswd secret ~/.vnc/passwd

CMD ["/bin/bash", "/entrypoint.sh"]

EXPOSE 5900
EXPOSE 9515
