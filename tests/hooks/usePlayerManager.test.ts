import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { usePlayerManager } from '@/hooks/usePlayerManager'
import { BasketballPosition } from '@/types/basketball'
import type { BasketballSkills } from '@/types/basketball'
import type { Player } from '@/types/player'

vi.mock('@/services/database', () => ({
  databaseService: {
    init: vi.fn().mockResolvedValue(undefined),
    isInitialized: vi.fn().mockReturnValue(true),
  },
}))

vi.mock('@/utils/migration', () => ({
  performMigration: vi.fn().mockResolvedValue({ success: true, playersMigrated: 0 }),
}))

const mockStore: Array<{ id: string; name: string; position: string; skills: Record<string, number>; createdAt: Date; updatedAt: Date }> = []

vi.mock('@/repositories/player.repository', () => {
  class MockPlayerRepository {
    findAll = vi.fn().mockImplementation(async () => [...mockStore])
    create = vi.fn().mockImplementation(async (data: { name: string; position: string; skills: Record<string, number> }) => {
      const player = {
        ...data,
        id: `player-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockStore.push(player)
      return player
    })
    findById = vi.fn()
    update = vi.fn().mockImplementation(async (id: string, updates: Record<string, unknown>) => {
      const idx = mockStore.findIndex((p) => p.id === id)
      if (idx >= 0) {
        mockStore[idx] = { ...mockStore[idx], ...updates }
      }
    })
    delete = vi.fn().mockImplementation(async (id: string) => {
      const idx = mockStore.findIndex((p) => p.id === id)
      if (idx >= 0) {
        mockStore.splice(idx, 1)
      }
    })
  }
  return { PlayerRepository: MockPlayerRepository }
})

describe('usePlayerManager', () => {
  beforeEach(() => {
    localStorage.clear()
    mockStore.length = 0
  })

  describe('initialization', () => {
    it('should initialize with empty players list', async () => {
      const { result } = renderHook(() => usePlayerManager())
      expect(result.current.players).toEqual([])
    })

    it.skip('should initialize with provided players', async () => {
      const initialPlayers = [
        {
          id: 'player-1',
          name: 'Test Player',
          position: BasketballPosition.PG,
          skills: {
            twoPointShot: 80,
            threePointShot: 85,
            freeThrow: 75,
            passing: 90,
            ballControl: 95,
            courtVision: 88,
            perimeterDefense: 70,
            interiorDefense: 50,
            steals: 75,
            blocks: 40,
            offensiveRebound: 45,
            defensiveRebound: 50,
            speed: 85,
            strength: 60,
            stamina: 75,
            vertical: 70,
            basketballIQ: 82,
            teamwork: 80,
            clutch: 78,
            overall: 80
          },
          createdAt: new Date(),
          updatedAt: new Date()
        },
      ]
      const { result } = renderHook(() => usePlayerManager(initialPlayers))
      expect(result.current.players).toEqual(initialPlayers)
    })
  })

  describe('CRUD operations', () => {
    describe('addPlayer', () => {
      it('should add a new player', async () => {
        const { result } = renderHook(() => usePlayerManager())

        const newPlayer = {
          name: 'New Player',
          position: BasketballPosition.SF,
          skills: {
            twoPointShot: 75,
            threePointShot: 75,
            freeThrow: 75,
            passing: 75,
            ballControl: 75,
            courtVision: 75,
            perimeterDefense: 75,
            interiorDefense: 75,
            steals: 75,
            blocks: 75,
            offensiveRebound: 75,
            defensiveRebound: 75,
            speed: 75,
            strength: 75,
            stamina: 75,
            vertical: 75,
            basketballIQ: 75,
            teamwork: 75,
            clutch: 75,
            overall: 75
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }

        let validationResult: any;
        await act(async () => {
          validationResult = await result.current.addPlayer(newPlayer)
        })

        expect(validationResult.isValid).toBe(true)
        await waitFor(() => {
          expect(result.current.players.length).toBe(1)
        })
        expect(result.current.players[0].name).toBe('New Player')
      })

      it('should generate unique ID for new player', async () => {
        const { result } = renderHook(() => usePlayerManager())

        const skills = {
          twoPointShot: 70,
          threePointShot: 70,
          freeThrow: 70,
          passing: 70,
          ballControl: 70,
          courtVision: 70,
          perimeterDefense: 70,
          interiorDefense: 70,
          steals: 70,
          blocks: 70,
          offensiveRebound: 70,
          defensiveRebound: 70,
          speed: 70,
          strength: 70,
          stamina: 70,
          vertical: 70,
          basketballIQ: 70,
          teamwork: 70,
          clutch: 70
        }

        const player1 = {
          name: 'Player 1',
          position: BasketballPosition.PG,
          skills,
          createdAt: new Date(),
          updatedAt: new Date()
        }

        const player2 = {
          name: 'Player 2',
          position: BasketballPosition.SF,
          skills,
          createdAt: new Date(),
          updatedAt: new Date()
        }

        await act(async () => {
          await result.current.addPlayer(player1)
          await result.current.addPlayer(player2)
        })

        await waitFor(() => {
          expect(result.current.players.length).toBe(2)
        })
        expect(result.current.players[0].id).not.toBe(result.current.players[1].id)
      })

      it('should validate player data', async () => {
        const { result } = renderHook(() => usePlayerManager())

        const invalidPlayer = {
          name: '',
          position: BasketballPosition.PG,
          skills: {
            twoPointShot: 70,
            threePointShot: 70,
            freeThrow: 70,
            passing: 70,
            ballControl: 70,
            courtVision: 70,
            perimeterDefense: 70,
            interiorDefense: 70,
            steals: 70,
            blocks: 70,
            offensiveRebound: 70,
            defensiveRebound: 70,
            speed: 70,
            strength: 70,
            stamina: 70,
            vertical: 70,
            basketballIQ: 70,
            teamwork: 70,
            clutch: 70
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }

        let validationResult: any;
        await act(async () => {
          validationResult = await result.current.addPlayer(invalidPlayer)
        })

        expect(validationResult.isValid).toBe(false)
        expect(validationResult.errors.length).toBeGreaterThan(0)
        expect(result.current.players.length).toBe(0)
      })
    })

    describe('updatePlayer', () => {
      it('should update an existing player', async () => {
        const { result } = renderHook(() => usePlayerManager())

        const skills = {
          twoPointShot: 70,
          threePointShot: 70,
          freeThrow: 70,
          passing: 70,
          ballControl: 70,
          courtVision: 70,
          perimeterDefense: 70,
          interiorDefense: 70,
          steals: 70,
          blocks: 70,
          offensiveRebound: 70,
          defensiveRebound: 70,
          speed: 70,
          strength: 70,
          stamina: 70,
          vertical: 70,
          basketballIQ: 70,
          teamwork: 70,
          clutch: 70
        }

        const newPlayer = {
          name: 'Test Player',
          position: BasketballPosition.PG,
          skills,
          createdAt: new Date(),
          updatedAt: new Date()
        }

        await act(async () => {
          await result.current.addPlayer(newPlayer)
        })

        await waitFor(() => {
          expect(result.current.players.length).toBe(1)
        })

        const playerId = result.current.players[0].id
        const updatedData = {
          name: 'Updated Player',
          position: BasketballPosition.SF
        }

        let validationResult: any;
        await act(async () => {
          validationResult = await result.current.updatePlayer(playerId, updatedData)
        })

        expect(validationResult.isValid).toBe(true)
        expect(result.current.players[0].name).toBe('Updated Player')
        expect(result.current.players[0].position).toBe(BasketballPosition.SF)
      })

      it.skip('should not modify other player properties when updating', async () => {
        const { result } = renderHook(() => usePlayerManager())

        const skills: BasketballSkills = {
          twoPointShot: 80,
          threePointShot: 85,
          freeThrow: 75,
          passing: 90,
          ballControl: 95,
          courtVision: 88,
          perimeterDefense: 70,
          interiorDefense: 50,
          steals: 75,
          blocks: 40,
          offensiveRebound: 45,
          defensiveRebound: 50,
          speed: 85,
          strength: 60,
          stamina: 75,
          vertical: 70,
          basketballIQ: 82,
          teamwork: 80,
          clutch: 78,
          overall: 80
        }

        const newPlayer = {
          name: 'Test Player',
          position: BasketballPosition.PG,
          skills,
          createdAt: new Date(),
          updatedAt: new Date()
        }

        await act(async () => {
          await result.current.addPlayer(newPlayer)
        })

        expect(result.current.players.length).toBe(1)

        const playerId = result.current.players[0].id
        const updatedData = {
          name: 'Updated Name Only'
        }

        let validationResult: any;
        await act(async () => {
          validationResult = await result.current.updatePlayer(playerId, updatedData)
          expect(validationResult.isValid).toBe(true)
        })

        const player = result.current.players[0]
        expect(player.name).toBe('Updated Name Only')
        expect(player.position).toBe(BasketballPosition.PG)
        expect(player.skills.twoPointShot).toBe(80)
        expect(player.skills.passing).toBe(90)
      })

      it.skip('should return error for non-existent player', async () => {
        const { result } = renderHook(() => usePlayerManager())

        act(() => {
          const validationResult = result.current.updatePlayer('non-existent-id', { name: 'New Name' })
          expect(validationResult.isValid).toBe(false)
          expect(validationResult.errors.length).toBeGreaterThan(0)
        })

        expect(result.current.players.length).toBe(0)
      })
    })

    describe('deletePlayer', () => {
      it.skip('should delete an existing player', async () => {
        const { result } = renderHook(() => usePlayerManager())

        const skills = {
          twoPointShot: 70,
          threePointShot: 70,
          freeThrow: 70,
          passing: 70,
          ballControl: 70,
          courtVision: 70,
          perimeterDefense: 70,
          interiorDefense: 70,
          steals: 70,
          blocks: 70,
          offensiveRebound: 70,
          defensiveRebound: 70,
          speed: 70,
          strength: 70,
          stamina: 70,
          vertical: 70,
          basketballIQ: 70,
          teamwork: 70,
          clutch: 70
        }

        const player1 = {
          name: 'Player 1',
          position: BasketballPosition.PG,
          skills,
          createdAt: new Date(),
          updatedAt: new Date()
        }

        const player2 = {
          name: 'Player 2',
          position: BasketballPosition.SF,
          skills,
          createdAt: new Date(),
          updatedAt: new Date()
        }

        act(() => {
          result.current.addPlayer(player1)
          result.current.addPlayer(player2)
        })

        expect(result.current.players.length).toBe(2)

        const playerIdToDelete = result.current.players[0].id

        await act(async () => {
          await result.current.deletePlayer(playerIdToDelete)
        })

        expect(result.current.players.length).toBe(1)
        expect(result.current.players[0].name).toBe('Player 2')
      })

      it('should handle deleting non-existent player', async () => {
        const { result } = renderHook(() => usePlayerManager())

        const skills = {
          twoPointShot: 70,
          threePointShot: 70,
          freeThrow: 70,
          passing: 70,
          ballControl: 70,
          courtVision: 70,
          perimeterDefense: 70,
          interiorDefense: 70,
          steals: 70,
          blocks: 70,
          offensiveRebound: 70,
          defensiveRebound: 70,
          speed: 70,
          strength: 70,
          stamina: 70,
          vertical: 70,
          basketballIQ: 70,
          teamwork: 70,
          clutch: 70
        }

        const newPlayer = {
          name: 'Test Player',
          position: BasketballPosition.PG,
          skills,
          createdAt: new Date(),
          updatedAt: new Date()
        }

        await act(async () => {
          await result.current.addPlayer(newPlayer)
        })

        expect(result.current.players.length).toBe(1)

        const initialLength = result.current.players.length

        await act(async () => {
          await result.current.deletePlayer('non-existent-id')
        })

        expect(result.current.players.length).toBe(initialLength)
      })
    })

    describe('validatePlayer', () => {
      it('should validate valid player data', async () => {
        const { result } = renderHook(() => usePlayerManager())

        const validPlayer = {
          name: 'Valid Player',
          position: BasketballPosition.PG,
          skills: {
            twoPointShot: 70,
            threePointShot: 70,
            freeThrow: 70,
            passing: 70,
            ballControl: 70,
            courtVision: 70,
            perimeterDefense: 70,
            interiorDefense: 70,
            steals: 70,
            blocks: 70,
            offensiveRebound: 70,
            defensiveRebound: 70,
            speed: 70,
            strength: 70,
            stamina: 70,
            vertical: 70,
            basketballIQ: 70,
            teamwork: 70,
            clutch: 70
          }
        }

        const validation = result.current.validatePlayer(validPlayer)
        expect(validation.isValid).toBe(true)
        expect(validation.errors).toEqual([])
      })

      it('should detect invalid skill values', async () => {
        const { result } = renderHook(() => usePlayerManager())

        const invalidPlayer = {
          name: 'Invalid Player',
          position: BasketballPosition.PG,
          skills: {
            twoPointShot: 150, // Invalid: > 99
            threePointShot: 70,
            freeThrow: 70,
            passing: 70,
            ballControl: 70,
            courtVision: 70,
            perimeterDefense: 70,
            interiorDefense: 70,
            steals: 70,
            blocks: 70,
            offensiveRebound: 70,
            defensiveRebound: 70,
            speed: 70,
            strength: 70,
            stamina: 70,
            vertical: 70,
            basketballIQ: 70,
            teamwork: 70,
            clutch: 70,
            overall: 70
          }
        }

        const validation = result.current.validatePlayer(invalidPlayer)
        expect(validation.isValid).toBe(false)
        expect(validation.errors.length).toBeGreaterThan(0)
      })
    })
  })

  describe('state management', () => {
    it('should manage editing player state', async () => {
      const { result } = renderHook(() => usePlayerManager())

      const skills: BasketballSkills = {
        twoPointShot: 70,
        threePointShot: 70,
        freeThrow: 70,
        passing: 70,
        ballControl: 70,
        courtVision: 70,
        perimeterDefense: 70,
        interiorDefense: 70,
        steals: 70,
        blocks: 70,
        offensiveRebound: 70,
        defensiveRebound: 70,
        speed: 70,
        strength: 70,
        stamina: 70,
        vertical: 70,
        basketballIQ: 70,
        teamwork: 70,
        clutch: 70,
        overall: 70
      }

      const newPlayer = {
        name: 'Test Player',
        position: BasketballPosition.PG,
        skills,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await act(async () => {
          await result.current.addPlayer(newPlayer)
        })

      expect(result.current.editingPlayer).toBeNull()

      await act(async () => {
          await result.current.setEditingPlayer(result.current.players[0])
        })

      expect(result.current.editingPlayer).not.toBeNull()
      expect(result.current.editingPlayer?.name).toBe('Test Player')

      await act(async () => {
          await result.current.setEditingPlayer(null)
        })

      expect(result.current.editingPlayer).toBeNull()
    })

    it.skip('should manage error state', async () => {
      const { result } = renderHook(() => usePlayerManager())

      const invalidPlayer = {
        name: '',
        position: BasketballPosition.PG,
        skills: {
          twoPointShot: 70,
          threePointShot: 70,
          freeThrow: 70,
          passing: 70,
          ballControl: 70,
          courtVision: 70,
          perimeterDefense: 70,
          interiorDefense: 70,
          steals: 70,
          blocks: 70,
          offensiveRebound: 70,
          defensiveRebound: 70,
          speed: 70,
          strength: 70,
          stamina: 70,
          vertical: 70,
          basketballIQ: 70,
          teamwork: 70,
          clutch: 70,
          overall: 70
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await act(async () => {
          await result.current.addPlayer(invalidPlayer)
        })

      expect(result.current.error).not.toBeNull()

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('filter operations', () => {
    it.skip('should filter players by position', async () => {
      const { result } = renderHook(() => usePlayerManager())

      const skills: BasketballSkills = {
        twoPointShot: 70,
        threePointShot: 70,
        freeThrow: 70,
        passing: 70,
        ballControl: 70,
        courtVision: 70,
        perimeterDefense: 70,
        interiorDefense: 70,
        steals: 70,
        blocks: 70,
        offensiveRebound: 70,
        defensiveRebound: 70,
        speed: 70,
        strength: 70,
        stamina: 70,
        vertical: 70,
        basketballIQ: 70,
        teamwork: 70,
        clutch: 70,
        overall: 70
      }

      const players = [
        {
          name: 'Guard Player',
          position: BasketballPosition.PG,
          skills,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Center Player',
          position: BasketballPosition.C,
          skills,
          createdAt: new Date(),
          updatedAt: new Date()
        },
      ]

      act(() => {
        players.forEach(player => result.current.addPlayer(player))
      })

      expect(result.current.players.length).toBe(2)

      const guards = result.current.players.filter(
        player => player.position === BasketballPosition.PG
      )
      expect(guards.length).toBe(1)
      expect(guards[0].name).toBe('Guard Player')
    })
  })

  describe('sorting', () => {
    it.skip('should sort players by overall skill', async () => {
      const { result } = renderHook(() => usePlayerManager())

      const weakSkills: BasketballSkills = {
        twoPointShot: 50,
        threePointShot: 50,
        freeThrow: 50,
        passing: 50,
        ballControl: 50,
        courtVision: 50,
        perimeterDefense: 50,
        interiorDefense: 50,
        steals: 50,
        blocks: 50,
        offensiveRebound: 50,
        defensiveRebound: 50,
        speed: 50,
        strength: 50,
        stamina: 50,
        vertical: 50,
        basketballIQ: 50,
        teamwork: 50,
        clutch: 50,
        overall: 50
      }

      const strongSkills: BasketballSkills = {
        twoPointShot: 90,
        threePointShot: 90,
        freeThrow: 90,
        passing: 90,
        ballControl: 90,
        courtVision: 90,
        perimeterDefense: 90,
        interiorDefense: 90,
        steals: 90,
        blocks: 90,
        offensiveRebound: 90,
        defensiveRebound: 90,
        speed: 90,
        strength: 90,
        stamina: 90,
        vertical: 90,
        basketballIQ: 90,
        teamwork: 90,
        clutch: 90,
        overall: 90
      }

      const players = [
        {
          name: 'Weak Player',
          position: BasketballPosition.PG,
          skills: weakSkills,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Strong Player',
          position: BasketballPosition.PG,
          skills: strongSkills,
          createdAt: new Date(),
          updatedAt: new Date()
        },
      ]

      act(() => {
        players.forEach(player => result.current.addPlayer(player))
      })

      expect(result.current.players.length).toBe(2)

      const sortedPlayers = [...result.current.players].sort(
        (a, b) => b.skills.overall - a.skills.overall
      )
      expect(sortedPlayers[0].name).toBe('Strong Player')
      expect(sortedPlayers[1].name).toBe('Weak Player')
    })
  })
})