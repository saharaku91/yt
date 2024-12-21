#!/bin/bash

# Update system repositories
sudo apt update

# Install required dependencies
sudo apt install -y \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libx11-xcb1 \
    libxcomposite1 \
    libxrandr2 \
    libxi6 \
    libasound2 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libxdamage1 \
    libxext6 \
    libglib2.0-0 \
    libgdk-pixbuf2.0-dev \
    libpango1.0-0 \
    libatspi2.0-0 \
    libdrm2 \
    libgbm-dev \
    libxshmfence-dev
