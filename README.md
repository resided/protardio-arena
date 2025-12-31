# PROTARDIO ARENA

```
██████╗ ██████╗  ██████╗ ████████╗ █████╗ ██████╗ ██████╗ ██╗ ██████╗
██╔══██╗██╔══██╗██╔═══██╗╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗██║██╔═══██╗
██████╔╝██████╔╝██║   ██║   ██║   ███████║██████╔╝██║  ██║██║██║   ██║
██╔═══╝ ██╔══██╗██║   ██║   ██║   ██╔══██║██╔══██╗██║  ██║██║██║   ██║
██║     ██║  ██║╚██████╔╝   ██║   ██║  ██║██║  ██║██████╔╝██║╚██████╔╝
╚═╝     ╚═╝  ╚═╝ ╚═════╝    ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝ ╚═════╝
                         LET IT RIP!
```

**90s Beyblade-style battle arena on Arbitrum for Protardio Citizens NFT holders**

Your Protardio PFP = Your Beyblade. Spin it. Battle it. Win ETH.

## How It Works

1. **Create Battle** - Stake ETH + your Protardio token ID
2. **Wait for Challenger** - Someone matches your stake
3. **LET IT RIP!** - Pure 50/50 random battle
4. **Winner takes 97.5%** of the pot

No stats. No power levels. Just pure chaos and vibes.

## Quick Start

```bash
# Build
forge build

# Test
forge test

# Deploy to Arbitrum
source .env
forge script script/Deploy.s.sol:DeployScript --rpc-url https://arb1.arbitrum.io/rpc --broadcast
```

## The Arena

The frontend features:
- 🌀 Spinning Protardio PFPs as Beyblades
- ⚡ Spark effects when blades clash
- 🏆 Victory/defeat animations
- 📊 Win/loss tracking
- 🎨 Full 90s aesthetic with scanlines

## Contract

Super simple:

```solidity
// Create a battle
createBattle(tokenId) payable

// Join and fight
joinBattle(battleId, tokenId) payable

// Cancel if no one joins (after 1 hour)
cancelBattle(battleId)
```

## Config

| Setting | Value |
|---------|-------|
| Protocol Fee | 2.5% |
| Min Stake | 0.001 ETH |
| Battle Expiry | 1 hour |
| Outcome | 50/50 random |

## Deploy

1. `cp .env.example .env`
2. Add your `PRIVATE_KEY`
3. `forge script script/Deploy.s.sol:DeployScript --rpc-url https://arb1.arbitrum.io/rpc --broadcast`
4. Update `CONTRACT_ADDRESS` in `frontend/index.html`
5. Open `frontend/index.html` in browser

## License

MIT

---

*Built for Protardio Citizens (Base: 0x5d38451841Ee7A2E824A88AFE47b00402157b08d)*
