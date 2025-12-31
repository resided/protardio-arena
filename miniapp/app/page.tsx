'use client'

import { useEffect, useState, useCallback } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'
import { ethers } from 'ethers'

// Contract config
const CONTRACT_ADDRESS = "0xa223B6b79211167008008a2A3b48b28948C5a088"
const TARB_TOKEN = "0xD63231cEBA61780703da36a2F47FfDD08da05B07"
const ARBITRUM_CHAIN_ID = 42161
const IPFS_GATEWAY = "https://ipfs.io/ipfs/"
const PROTARDIO_IMAGE_BASE = "bafybeiefdh5ryzudhw2y2qvhqbigxigmx4kqkrabqqlnsv3twiz6mphida"

// Base chain NFT
const PROTARDIO_NFT = "0x5d38451841Ee7A2E824A88AFE47b00402157b08d"
const BASE_RPC = "https://mainnet.base.org"

const NFT_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
]

const TARB_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)"
]

const ABI = [
  "function createBattle(uint256 tokenId, uint256 stakeAmount)",
  "function joinBattle(uint256 battleId, uint256 tokenId)",
  "function cancelBattle(uint256 battleId)",
  "function getOpenBattles() view returns (uint256[])",
  "function getBattle(uint256) view returns (address player1, address player2, uint256 stake, uint256 p1TokenId, uint256 p2TokenId, bool active)",
  "function getStats(address) view returns (uint256 wins, uint256 losses, uint256 earnings)",
  "function totalBattles() view returns (uint256)",
  "function minStake() view returns (uint256)",
  "event LetItRip(uint256 indexed battleId, address indexed winner, address indexed loser, uint256 prize)"
]

interface FarcasterUser {
  fid: number
  username?: string
  displayName?: string
  pfpUrl?: string
}

interface Battle {
  id: number
  player1: string
  stake: bigint
  p1TokenId: number
  active: boolean
}

interface Stats {
  wins: number
  losses: number
  earnings: bigint
}

function getProtardioImage(tokenId: number): string {
  return `${IPFS_GATEWAY}${PROTARDIO_IMAGE_BASE}/${tokenId}.png`
}

function formatTarb(amount: bigint): string {
  const num = parseFloat(ethers.formatEther(amount))
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toFixed(0)
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<FarcasterUser | null>(null)
  const [userAddress, setUserAddress] = useState<string>('')
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [contract, setContract] = useState<ethers.Contract | null>(null)
  const [tarbContract, setTarbContract] = useState<ethers.Contract | null>(null)

  const [userProtardios, setUserProtardios] = useState<number[]>([])
  const [selectedTokenId, setSelectedTokenId] = useState<string>('')
  const [stakeAmount, setStakeAmount] = useState<string>('1000000')
  const [openBattles, setOpenBattles] = useState<Battle[]>([])
  const [stats, setStats] = useState<Stats>({ wins: 0, losses: 0, earnings: BigInt(0) })
  const [tarbBalance, setTarbBalance] = useState<bigint>(BigInt(0))
  const [totalBattles, setTotalBattles] = useState<number>(0)

  const [showModal, setShowModal] = useState(false)
  const [battleResult, setBattleResult] = useState<{ won: boolean; prize: string } | null>(null)
  const [blade1Class, setBlade1Class] = useState('beyblade beyblade-1 spinning')
  const [blade2Class, setBlade2Class] = useState('beyblade beyblade-2 spinning')
  const [blade1Image, setBlade1Image] = useState(getProtardioImage(1))
  const [blade2Image, setBlade2Image] = useState(getProtardioImage(2))

  // Initialize Farcaster SDK
  useEffect(() => {
    const initFarcaster = async () => {
      try {
        // Must call ready() for the app to load properly
        await sdk.actions.ready()

        // Get user context (sdk.context is a Promise in newer versions)
        const context = await sdk.context
        if (context?.user) {
          setUser({
            fid: context.user.fid,
            username: context.user.username,
            displayName: context.user.displayName,
            pfpUrl: context.user.pfpUrl
          })
        }

        setIsLoading(false)
      } catch (error) {
        console.error('Farcaster SDK init error:', error)
        setIsLoading(false)
      }
    }

    initFarcaster()
  }, [])

  // Connect wallet via Farcaster
  const connectWallet = useCallback(async () => {
    try {
      // Get Ethereum provider from Farcaster
      const ethProvider = sdk.wallet.ethProvider
      if (!ethProvider) {
        alert('Wallet not available')
        return
      }

      const browserProvider = new ethers.BrowserProvider(ethProvider)

      // Request accounts
      await ethProvider.request({ method: 'eth_requestAccounts' })

      // Get signer and address
      const signer = await browserProvider.getSigner()
      const address = await signer.getAddress()

      // Switch to Arbitrum
      const network = await browserProvider.getNetwork()
      if (Number(network.chainId) !== ARBITRUM_CHAIN_ID) {
        try {
          await ethProvider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xa4b1' }]
          })
        } catch (e: unknown) {
          if ((e as { code?: number }).code === 4902) {
            await ethProvider.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0xa4b1',
                chainName: 'Arbitrum One',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://arb1.arbitrum.io/rpc'],
                blockExplorerUrls: ['https://arbiscan.io']
              }]
            })
          }
        }
      }

      // Refresh provider after chain switch
      const newSigner = await browserProvider.getSigner()

      const arenaContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, newSigner)
      const tokenContract = new ethers.Contract(TARB_TOKEN, TARB_ABI, newSigner)

      setProvider(browserProvider)
      setUserAddress(address)
      setContract(arenaContract)
      setTarbContract(tokenContract)

      // Load data
      await loadStats(arenaContract, tokenContract, address)
      await loadOpenBattles(arenaContract, address)
      await detectProtardios(address)

    } catch (error) {
      console.error('Wallet connection error:', error)
      alert('Failed to connect wallet')
    }
  }, [])

  // Detect Protardio NFTs on Base
  const detectProtardios = async (address: string) => {
    try {
      const baseProvider = new ethers.JsonRpcProvider(BASE_RPC)
      const nftContract = new ethers.Contract(PROTARDIO_NFT, NFT_ABI, baseProvider)

      const receivedFilter = nftContract.filters.Transfer(null, address)
      const sentFilter = nftContract.filters.Transfer(address, null)

      const fromBlock = 17000000

      const [received, sent] = await Promise.all([
        nftContract.queryFilter(receivedFilter, fromBlock, 'latest'),
        nftContract.queryFilter(sentFilter, fromBlock, 'latest')
      ])

      const owned = new Map<string, boolean>()
      for (const event of received) {
        const tokenId = (event as ethers.EventLog).args?.tokenId
        if (tokenId) owned.set(tokenId.toString(), true)
      }
      for (const event of sent) {
        const tokenId = (event as ethers.EventLog).args?.tokenId
        if (tokenId) owned.delete(tokenId.toString())
      }

      const protardios = Array.from(owned.keys()).map(id => parseInt(id)).sort((a, b) => a - b)
      setUserProtardios(protardios)

      if (protardios.length > 0) {
        setSelectedTokenId(protardios[0].toString())
        setBlade2Image(getProtardioImage(protardios[0]))
      }
    } catch (error) {
      console.error('Error detecting Protardios:', error)
    }
  }

  // Load stats
  const loadStats = async (arenaContract: ethers.Contract, tokenContract: ethers.Contract, address: string) => {
    try {
      const [total, userStats, balance] = await Promise.all([
        arenaContract.totalBattles(),
        arenaContract.getStats(address),
        tokenContract.balanceOf(address)
      ])

      setTotalBattles(Number(total))
      setStats({
        wins: Number(userStats.wins),
        losses: Number(userStats.losses),
        earnings: userStats.earnings
      })
      setTarbBalance(balance)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  // Load open battles
  const loadOpenBattles = async (arenaContract: ethers.Contract, address: string) => {
    try {
      const battleIds = await arenaContract.getOpenBattles()
      const battles: Battle[] = []

      for (const id of battleIds) {
        const battle = await arenaContract.getBattle(id)
        if (battle.active) {
          battles.push({
            id: Number(id),
            player1: battle.player1,
            stake: battle.stake,
            p1TokenId: Number(battle.p1TokenId),
            active: battle.active
          })
        }
      }

      setOpenBattles(battles)
    } catch (error) {
      console.error('Error loading battles:', error)
    }
  }

  // Check and approve TARB
  const checkAndApprove = async (amount: bigint): Promise<boolean> => {
    if (!tarbContract || !userAddress) return false

    const allowance = await tarbContract.allowance(userAddress, CONTRACT_ADDRESS)
    if (allowance < amount) {
      const tx = await tarbContract.approve(CONTRACT_ADDRESS, ethers.MaxUint256)
      await tx.wait()
      return true
    }
    return false
  }

  // Create battle
  const createBattle = async () => {
    if (!contract || !selectedTokenId || !stakeAmount) {
      alert('Select your Protardio and enter stake amount!')
      return
    }

    try {
      const stakeWei = ethers.parseEther(stakeAmount)
      await checkAndApprove(stakeWei)

      setBlade1Image(getProtardioImage(parseInt(selectedTokenId)))

      const tx = await contract.createBattle(selectedTokenId, stakeWei)
      await tx.wait()

      if (tarbContract) {
        await loadStats(contract, tarbContract, userAddress)
      }
      await loadOpenBattles(contract, userAddress)

      alert('Battle created! Waiting for challenger...')
    } catch (error) {
      console.error('Create battle error:', error)
      alert('Error creating battle')
    }
  }

  // Join battle
  const joinBattle = async (battleId: number, stake: bigint, opponentTokenId: number) => {
    if (!contract || !selectedTokenId) {
      alert('Select your Protardio first!')
      return
    }

    try {
      await checkAndApprove(stake)

      // Setup arena visuals
      setBlade1Image(getProtardioImage(opponentTokenId))
      setBlade2Image(getProtardioImage(parseInt(selectedTokenId)))
      setBlade1Class('beyblade beyblade-1 spinning')
      setBlade2Class('beyblade beyblade-2 spinning')

      // Intense spinning
      const blade1El = document.querySelector('.beyblade-1') as HTMLElement
      const blade2El = document.querySelector('.beyblade-2') as HTMLElement
      if (blade1El) blade1El.style.animationDuration = '0.05s'
      if (blade2El) blade2El.style.animationDuration = '0.05s'

      createSparks()

      const tx = await contract.joinBattle(battleId, selectedTokenId)
      const receipt = await tx.wait()

      // Find the LetItRip event
      const ripEvent = receipt.logs.find((log: ethers.Log) => {
        try {
          const parsed = contract.interface.parseLog({ topics: log.topics as string[], data: log.data })
          return parsed?.name === 'LetItRip'
        } catch { return false }
      })

      if (ripEvent) {
        const parsed = contract.interface.parseLog({ topics: ripEvent.topics as string[], data: ripEvent.data })
        if (parsed) {
          const winner = parsed.args.winner
          const prize = ethers.formatEther(parsed.args.prize)
          const youWon = winner.toLowerCase() === userAddress.toLowerCase()

          // Battle animation
          setTimeout(() => {
            if (blade1El) blade1El.style.animationDuration = '0.1s'
            if (blade2El) blade2El.style.animationDuration = '0.1s'
          }, 1000)

          setTimeout(() => {
            if (youWon) {
              setBlade2Class('beyblade beyblade-2 winner')
              setBlade1Class('beyblade beyblade-1 loser')
            } else {
              setBlade1Class('beyblade beyblade-1 winner')
              setBlade2Class('beyblade beyblade-2 loser')
            }

            setBattleResult({ won: youWon, prize })
            setShowModal(true)
          }, 2000)
        }
      }

      if (tarbContract) {
        await loadStats(contract, tarbContract, userAddress)
      }
      await loadOpenBattles(contract, userAddress)

    } catch (error) {
      console.error('Join battle error:', error)
      alert('Error joining battle')
      resetArena()
    }
  }

  // Create sparks effect
  const createSparks = () => {
    const arena = document.querySelector('.arena')
    if (!arena) return

    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        const spark = document.createElement('div')
        spark.className = 'spark'
        spark.style.left = '50%'
        spark.style.top = '50%'
        spark.style.setProperty('--tx', (Math.random() - 0.5) * 200 + 'px')
        spark.style.setProperty('--ty', (Math.random() - 0.5) * 200 + 'px')
        spark.style.background = ['#ff0', '#f00', '#0ff', '#f0f'][Math.floor(Math.random() * 4)]
        arena.appendChild(spark)
        setTimeout(() => spark.remove(), 500)
      }, i * 100)
    }
  }

  // Reset arena
  const resetArena = () => {
    setBlade1Class('beyblade beyblade-1 spinning')
    setBlade2Class('beyblade beyblade-2 spinning')
    const blade1El = document.querySelector('.beyblade-1') as HTMLElement
    const blade2El = document.querySelector('.beyblade-2') as HTMLElement
    if (blade1El) blade1El.style.animationDuration = '0.1s'
    if (blade2El) blade2El.style.animationDuration = '0.1s'
  }

  // Close modal
  const closeModal = () => {
    setShowModal(false)
    setBattleResult(null)
    resetArena()
  }

  // Refresh battles periodically
  useEffect(() => {
    if (!contract || !userAddress) return

    const interval = setInterval(() => {
      loadOpenBattles(contract, userAddress)
    }, 10000)

    return () => clearInterval(interval)
  }, [contract, userAddress])

  if (isLoading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="logo">PROTARDIO ARENA</div>
          <p style={{ marginTop: '20px' }}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <header>
        <div className="logo">PROTARDIO ARENA</div>
        <div className="tagline">LET IT RIP!</div>

        {!userAddress ? (
          <button className="connect-btn" onClick={connectWallet}>
            ENTER THE ARENA
          </button>
        ) : (
          <div className="user-card">
            {user?.pfpUrl && (
              <img src={user.pfpUrl} alt="" className="user-avatar" />
            )}
            <span className="user-name">
              {user?.displayName || user?.username || userAddress.slice(0, 6) + '...' + userAddress.slice(-4)}
            </span>
          </div>
        )}
      </header>

      {userAddress && (
        <>
          {/* THE ARENA */}
          <div className="arena">
            <div className="arena-inner">
              <div className={blade1Class}>
                <img src={blade1Image} alt="Player 1" />
              </div>
              <div className="vs-text">VS</div>
              <div className={blade2Class}>
                <img src={blade2Image} alt="Player 2" />
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="stats-bar">
            <div className="stat">
              <div className="stat-value">{formatTarb(tarbBalance)}</div>
              <div className="stat-label">$TARB Balance</div>
            </div>
            <div className="stat">
              <div className="stat-value">{totalBattles}</div>
              <div className="stat-label">Total Battles</div>
            </div>
            <div className="stat">
              <div className="stat-value">{stats.wins}</div>
              <div className="stat-label">Your Wins</div>
            </div>
            <div className="stat">
              <div className="stat-value">{stats.losses}</div>
              <div className="stat-label">Your Losses</div>
            </div>
            <div className="stat">
              <div className="stat-value">{formatTarb(stats.earnings)}</div>
              <div className="stat-label">$TARB Won</div>
            </div>
          </div>

          {/* Controls */}
          <div className="controls">
            <div className="control-panel">
              <h2>CREATE BATTLE</h2>
              <label style={{ color: '#888', fontSize: '0.9rem' }}>Your Protardio</label>
              <select
                value={selectedTokenId}
                onChange={(e) => {
                  setSelectedTokenId(e.target.value)
                  if (e.target.value) {
                    setBlade2Image(getProtardioImage(parseInt(e.target.value)))
                  }
                }}
              >
                {userProtardios.length === 0 ? (
                  <option value="">No Protardios found</option>
                ) : (
                  userProtardios.map(id => (
                    <option key={id} value={id}>Protardio #{id}</option>
                  ))
                )}
              </select>

              {selectedTokenId && (
                <div style={{ textAlign: 'center', margin: '10px 0' }}>
                  <img
                    src={getProtardioImage(parseInt(selectedTokenId))}
                    alt=""
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      border: '3px solid #0ff',
                      boxShadow: '0 0 20px #0ff'
                    }}
                  />
                </div>
              )}

              <label style={{ color: '#888', fontSize: '0.9rem' }}>Stake Amount ($TARB)</label>
              <input
                type="number"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                placeholder="1000000"
                min="1"
              />
              <button className="rip-btn" onClick={createBattle} disabled={!selectedTokenId}>
                LET IT RIP!
              </button>
            </div>

            <div className="control-panel">
              <h2>OPEN BATTLES</h2>
              <div className="battles-list">
                {openBattles.length === 0 ? (
                  <p style={{ color: '#888', textAlign: 'center' }}>No battles waiting... Create one!</p>
                ) : (
                  openBattles.map(battle => {
                    const isYours = battle.player1.toLowerCase() === userAddress.toLowerCase()
                    return (
                      <div key={battle.id} className="battle-item">
                        <div>
                          <div style={{ color: '#0ff' }}>Protardio #{battle.p1TokenId}</div>
                          <div style={{ fontSize: '0.8rem', color: '#888' }}>
                            {battle.player1.slice(0, 6)}...{battle.player1.slice(-4)}
                          </div>
                        </div>
                        <div className="battle-stake">{formatTarb(battle.stake)} $TARB</div>
                        {isYours ? (
                          <span style={{ color: '#888' }}>Your Battle</span>
                        ) : (
                          <button
                            className="join-btn"
                            onClick={() => joinBattle(battle.id, battle.stake, battle.p1TokenId)}
                          >
                            FIGHT!
                          </button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Result Modal */}
      <div className={`modal ${showModal ? 'show' : ''}`}>
        <div className="modal-content">
          <div className={`result-text ${battleResult?.won ? 'win' : 'lose'}`}>
            {battleResult?.won ? 'VICTORY!' : 'DEFEAT!'}
          </div>
          <div className="prize-text">
            {battleResult?.won
              ? `You won ${formatTarb(ethers.parseEther(battleResult.prize))} $TARB!`
              : 'Better luck next time...'}
          </div>
          <button className="close-modal" onClick={closeModal}>CONTINUE</button>
        </div>
      </div>
    </div>
  )
}
