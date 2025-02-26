# PLEASE USE DUMMY WALLETS!
I AM NOT RESPONSIBLE TO ANY LOSS OF FUNDS!
# You need to have this tokens first (any amount)
- CHOG / DAK / YAKI you can buy on https://testnet.monad.xyz/
- USDT/USDC you can buy on AMBIENT https://monad.ambient.finance/

## Installation
### Clone the Repository
Open your terminal and run:

```sh
git clone https://github.com/divibs/mon-bot.git
```
```sh
cd mon-bot
```
## Install Dependencies
```sh
npm install
```
If didn;t work try
```sh
sudo apt install npm
```
## Installing ethers
```sh
npm install ethers@6
```
## Set Up Your Private Key
```sh
nano privatekey.txt
```
copy and paste your private key
then type ctrl S + ctrl X to save

#Running the Script
Once everything is set up, run the script using Node.js:
```sh
node 3in1-bot.mjs
```
This will run 3 DAPPS 
- Uniswap Autoswap (Swap and loops randomly)
- Ambient Autoswap (Swap and loops randomly)
- Auto staking MAGMA (fixed amount 0.01) you can edit this amount on magmastaking.mjs
