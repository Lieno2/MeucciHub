cd backend
screen -dmS backend pnpm start

cd ..
cd frontend
screen -dmS frontend pnpm run dev
screen -x frontend
