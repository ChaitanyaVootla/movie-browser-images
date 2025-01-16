sudo apt update -y
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
source ~/.bashrc

nvm install 20

node -v
npm --version

git clone https://github.com/ChaitanyaVootla/movie-browser-images.git
cd movie-browser-images
npm i

sudo apt-get install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker
sudo docker --version

sudo docker run -d --name redis -p 6379:6379 redis